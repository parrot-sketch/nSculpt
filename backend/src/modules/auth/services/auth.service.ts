import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthRepository } from '../repositories/auth.repository';
import { SessionService } from './session.service';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { DataAccessLogService } from '../../audit/services/dataAccessLog.service';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { PasswordValidationService } from './password-validation.service';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refreshToken.dto';
import { Domain } from '@prisma/client';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
    permissions: string[];
    department?: {
      code: string;
      name: string;
    };
  };
  sessionId: string;
  expiresIn: number;
  mfaSetupRequired?: boolean; // Flag to indicate user should set up MFA
}

export interface MfaChallengeResult {
  mfaRequired: true;
  tempToken: string;
  message: string;
}

export interface MfaSetupRequiredResult {
  mfaSetupRequired: true;
  tempToken: string;
  message: string;
}

export type LoginResult = AuthResult | MfaChallengeResult | MfaSetupRequiredResult;

@Injectable()
export class AuthService {
  // private readonly MFA_REQUIRED_ROLES = ['ADMIN', 'DOCTOR', 'NURSE', 'SURGEON'];
  private readonly MFA_REQUIRED_ROLES: string[] = []; // Temporarily disabled for development

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly sessionService: SessionService,
    private readonly passwordValidationService: PasswordValidationService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly domainEventService: DomainEventService,
    private readonly correlationService: CorrelationService,
    private readonly dataAccessLogService: DataAccessLogService,
  ) { }

  /**
   * Authenticate user and create session (with MFA enforcement)
   */
  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string): Promise<LoginResult> {
    const { password } = loginDto;
    const email = loginDto.email.toLowerCase();

    // 1. Find user by email
    const user = await this.authRepository.findByEmail(email);
    if (!user || !user.isActive) {
      // Log failed login attempt (HIPAA requirement)
      await this.logFailedLoginAttempt(email, ipAddress, userAgent, 'User not found or inactive');
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Check if account is locked (Phase 1 Security Hardening)
    const isLocked = await this.authRepository.isAccountLocked(user.id);
    if (isLocked) {
      await this.logFailedLoginAttempt(user.id, ipAddress, userAgent, 'Account locked');
      throw new UnauthorizedException(
        'Account locked due to multiple failed login attempts. Please try again in 15 minutes.'
      );
    }

    // 3. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      // Increment failed attempts and potentially lock account
      await this.authRepository.incrementFailedAttempts(user.id);
      // Log failed login attempt
      await this.logFailedLoginAttempt(user.id, ipAddress, userAgent, 'Invalid password');
      throw new UnauthorizedException('Invalid credentials');
    }

    // 4. Reset failed attempts on successful password validation
    await this.authRepository.resetFailedAttempts(user.id);

    // 5. Load user roles and permissions
    const { roles, permissions } = await this.authRepository.getUserRolesAndPermissions(user.id);
    const roleCodes = roles.map(r => r.code);

    // 6. Check MFA enforcement for sensitive roles
    const hasSensitiveRole = roleCodes.some(role => this.MFA_REQUIRED_ROLES.includes(role));

    // If user has a sensitive role and MFA is not yet enabled, require MFA setup
    // This applies to both first-time and subsequent logins until MFA is enabled
    if (hasSensitiveRole && !user.mfaEnabled) {
      const isFirstLogin = !user.lastLoginAt;

      // Log the MFA requirement
      await this.dataAccessLogService.log({
        userId: user.id,
        resourceType: 'Authentication',
        resourceId: user.id,
        action: 'MFA_SETUP_REQUIRED_INITIATED',
        ipAddress,
        userAgent,
        reason: `User with sensitive role ${roleCodes.join(', ')} ${isFirstLogin ? '(first-time login)' : ''} needs to set up MFA before accessing the system`,
        accessedPHI: false,
        success: true,
      });

      // Generate temporary token for MFA setup (valid for 15 minutes)
      // This token allows the user to call the MFA setup endpoints
      const setupToken = await this.generateMfaSetupToken(user.id, email, ipAddress, userAgent);

      return {
        mfaSetupRequired: true,
        tempToken: setupToken,
        message: 'MFA setup is required for your role. Please scan the QR code with your authenticator app to complete setup.',
      };
    }

    // 7. If MFA is enabled, issue MFA challenge instead of full session
    if (user.mfaEnabled) {
      const tempToken = await this.generateTempToken(user.id, email, ipAddress, userAgent);

      // Log MFA challenge issued
      await this.dataAccessLogService.log({
        userId: user.id,
        resourceType: 'Authentication',
        resourceId: user.id,
        action: 'MFA_CHALLENGE_ISSUED',
        ipAddress,
        userAgent,
        reason: 'Password validated, awaiting MFA verification',
        accessedPHI: false,
        success: true,
      });

      return {
        mfaRequired: true,
        tempToken,
        message: 'Please provide your MFA code to complete login.',
      } as LoginResult;
    }

    // 8. No MFA required or first-time login - proceed with normal login flow
    const mfaSetupRequired = hasSensitiveRole && !user.mfaEnabled && !user.lastLoginAt;
    return this.completeLogin(
      user.id,
      email,
      user.firstName,
      user.lastName,
      roles,
      permissions,
      (user as any).department || null,
      ipAddress,
      userAgent,
      false, // mfaVerified
      mfaSetupRequired
    );
  }

  /**
   * Complete login after MFA verification or for users without MFA
   */
  private async completeLogin(
    userId: string,
    email: string,
    firstName: string,
    lastName: string,
    roles: Array<{ code: string }>,
    permissions: Array<{ code: string }>,
    department: { code: string; name: string } | null,
    ipAddress?: string,
    userAgent?: string,
    mfaVerified: boolean = false,
    mfaSetupRequired: boolean = false,
  ): Promise<AuthResult> {
    // Generate tokens
    const sessionId = this.correlationService.generateCorrelationId();
    const accessToken = await this.generateAccessToken(
      userId,
      email,
      firstName,
      lastName,
      roles,
      permissions,
      sessionId,
      mfaVerified,
    );
    const refreshToken = await this.generateRefreshToken(userId, sessionId);

    // Create session record
    const session = await this.sessionService.createSession({
      userId,
      accessTokenHash: this.hashToken(accessToken),
      refreshTokenHash: this.hashToken(refreshToken),
      deviceInfo: userAgent,
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + this.getRefreshTokenExpiry() * 1000),
      mfaVerified,
    });

    // Update user last login
    await this.authRepository.updateLastLogin(userId);

    // Emit domain event for audit
    await this.domainEventService.createEvent({
      eventType: mfaVerified ? 'User.LoggedInWithMfa' : 'User.LoggedIn',
      domain: Domain.RBAC,
      aggregateId: userId,
      aggregateType: 'User',
      payload: {
        email,
        sessionId: session.id,
        ipAddress,
        userAgent,
        mfaVerified,
      },
      createdBy: userId,
      sessionId: session.id,
      correlationId: this.correlationService.getContext().correlationId || undefined,
    });

    // Log successful login
    await this.dataAccessLogService.log({
      userId,
      resourceType: 'Authentication',
      resourceId: userId,
      action: mfaVerified ? 'LOGIN_MFA_SUCCESS' : 'LOGIN',
      ipAddress,
      userAgent,
      sessionId: session.id,
      reason: mfaVerified ? 'Login completed with MFA verification' : 'Login completed',
      accessedPHI: false,
      success: true,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: userId,
        email,
        firstName,
        lastName,
        roles: roles.map(r => r.code),
        permissions: permissions.map(p => p.code),
        department: department ? {
          code: department.code,
          name: department.name,
        } : undefined,
      },
      sessionId: session.id,
      expiresIn: this.getAccessTokenExpiry(),
      ...(mfaSetupRequired && { mfaSetupRequired: true }),
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshTokenDto: RefreshTokenDto, ipAddress?: string, userAgent?: string): Promise<AuthResult> {
    const { refreshToken } = refreshTokenDto;

    // 1. Verify refresh token
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || this.configService.get<string>('JWT_SECRET'),
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // 2. Find session by refresh token hash
    const refreshTokenHash = this.hashToken(refreshToken);
    const session = await this.sessionService.findByRefreshTokenHash(refreshTokenHash);
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired or revoked');
    }

    // 3. Verify session belongs to user
    if (session.userId !== payload.sub) {
      throw new UnauthorizedException('Invalid session');
    }

    // 4. Load user
    const user = await this.authRepository.findById(session.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // 5. Load roles and permissions
    const { roles, permissions } = await this.authRepository.getUserRolesAndPermissions(user.id);

    // 6. Generate new access token
    const accessToken = await this.generateAccessToken(user.id, user.email, user.firstName, user.lastName, roles, permissions, session.id);

    // 7. Update session last activity
    await this.sessionService.updateLastActivity(session.id);

    // 8. Log token refresh
    await this.dataAccessLogService.log({
      userId: user.id,
      resourceType: 'Authentication',
      resourceId: user.id,
      action: 'TOKEN_REFRESH',
      ipAddress,
      userAgent,
      sessionId: session.id,
      accessedPHI: false,
      success: true,
    });

    return {
      accessToken,
      refreshToken, // Return same refresh token
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: roles.map(r => r.code),
        permissions: permissions.map(p => p.code),
        department: (user as any).department ? {
          code: (user as any).department.code,
          name: (user as any).department.name
        } : undefined
      },
      sessionId: session.id,
      expiresIn: this.getAccessTokenExpiry(),
    };
  }

  /**
   * Logout user and revoke session
   */
  async logout(sessionId: string, userId: string, reason?: string): Promise<void> {
    // 1. Revoke session
    await this.sessionService.revokeSession(sessionId, userId, reason);

    // 2. Emit domain event
    await this.domainEventService.createEvent({
      eventType: 'User.LoggedOut',
      domain: Domain.RBAC,
      aggregateId: userId,
      aggregateType: 'User',
      payload: {
        sessionId,
        reason,
      },
      createdBy: userId,
      sessionId,
      correlationId: this.correlationService.getContext().correlationId || undefined,
    });

    // 3. Log logout
    await this.dataAccessLogService.log({
      userId,
      resourceType: 'Authentication',
      resourceId: userId,
      action: 'LOGOUT',
      sessionId,
      accessedPHI: false,
      success: true,
    });
  }

  /**
   * Change user password with complexity validation
   */
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto, ipAddress?: string, userAgent?: string): Promise<void> {
    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current (old) password
    const userWithHash = await this.authRepository.findByEmail(user.email);
    if (!userWithHash) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(changePasswordDto.currentPassword, userWithHash.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid current password');
    }

    // Prevent reusing same password
    const isSamePassword = await bcrypt.compare(changePasswordDto.newPassword, userWithHash.passwordHash);
    if (isSamePassword) {
      throw new BadRequestException('New password cannot be the same as the current password');
    }

    // Validate new password strength using zxcvbn
    const userInputs = [user.email, user.firstName, user.lastName, user.employeeId].filter(Boolean) as string[];
    this.passwordValidationService.validatePasswordStrength(changePasswordDto.newPassword, userInputs);

    // Hash new password
    const passwordHash = await bcrypt.hash(changePasswordDto.newPassword, 10);

    // Update password
    await this.authRepository.updatePasswordHash(userId, passwordHash);

    // Revoke all sessions (force re-login)
    await this.sessionService.revokeAllUserSessions(userId);

    // Log action
    await this.dataAccessLogService.log({
      userId: user.id,
      resourceType: 'User',
      resourceId: user.id,
      action: 'PASSWORD_CHANGE',
      ipAddress,
      userAgent,
      reason: 'User changed password',
      accessedPHI: false,
      success: true,
    });
  }


  /**
   * Validate JWT token and return user
   */
  async validateToken(token: string): Promise<any> {
    try {
      const payload = await this.jwtService.verifyAsync(token);

      // Verify session is still active
      const session = await this.sessionService.findById(payload.sessionId);
      if (!session || session.revokedAt || session.expiresAt < new Date()) {
        throw new UnauthorizedException('Session expired or revoked');
      }

      return payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Verify MFA login
   * 
   * Validates temp token and TOTP code, then issues full session.
   */
  async verifyMfaLogin(
    tempToken: string,
    code: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResult> {
    // 1. Verify temp token
    let tempPayload: any;
    try {
      tempPayload = await this.jwtService.verifyAsync(tempToken);

      if (tempPayload.type !== 'mfa_challenge') {
        throw new UnauthorizedException('Invalid token type');
      }
    } catch (error) {
      await this.dataAccessLogService.log({
        userId: 'unknown',
        resourceType: 'Authentication',
        resourceId: 'mfa_login',
        action: 'MFA_LOGIN_INVALID_TEMP_TOKEN',
        ipAddress,
        userAgent,
        reason: 'Invalid or expired temp token',
        accessedPHI: false,
        success: false,
        errorMessage: error.message,
      });

      throw new UnauthorizedException('Invalid or expired temp token');
    }

    // 2. Get user
    const user = await this.authRepository.findById(tempPayload.sub);
    if (!user || !user.isActive || !user.mfaEnabled) {
      throw new UnauthorizedException('Invalid user or MFA not enabled');
    }

    // 3. Verify TOTP code or backup code
    const mfaService = require('./mfa.service');
    let verified = false;

    try {
      // Use speakeasy directly for verification
      const speakeasy = require('speakeasy');

      // Try TOTP
      verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: code,
        window: 2,
      });

      // Try backup code if TOTP failed
      if (!verified && user.backupCodes?.includes(code)) {
        verified = true;

        // Remove used backup code
        const updatedBackupCodes = user.backupCodes.filter((bc) => bc !== code);
        await this.authRepository.updateBackupCodes(user.id, updatedBackupCodes);

        await this.dataAccessLogService.log({
          userId: user.id,
          resourceType: 'Authentication',
          resourceId: user.id,
          action: 'MFA_BACKUP_CODE_USED',
          ipAddress,
          userAgent,
          reason: `Backup code used during login. ${updatedBackupCodes.length} codes remaining.`,
          accessedPHI: false,
          success: true,
        });
      }
    } catch (error) {
      // Verification failed
      verified = false;
    }

    if (!verified) {
      // Log failed MFA attempt
      await this.dataAccessLogService.log({
        userId: user.id,
        resourceType: 'Authentication',
        resourceId: user.id,
        action: 'MFA_LOGIN_FAILED',
        ipAddress,
        userAgent,
        reason: 'Invalid MFA code provided',
        accessedPHI: false,
        success: false,
        errorMessage: 'Invalid TOTP or backup code',
      });

      throw new UnauthorizedException('Invalid MFA code');
    }

    // 4. Load user roles and permissions
    const { roles, permissions } = await this.authRepository.getUserRolesAndPermissions(user.id);

    // 5. Complete login with MFA verified flag
    return this.completeLogin(
      user.id,
      user.email,
      user.firstName,
      user.lastName,
      roles,
      permissions,
      (user as any).department || null,
      ipAddress,
      userAgent,
      true, // mfaVerified = true
    );
  }

  /**
   * Generate temporary token for MFA challenge
   * 
   * Short-lived token (10 minutes) used only for MFA verification.
   */
  private async generateTempToken(
    userId: string,
    email: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string> {
    const payload = {
      sub: userId,
      email,
      type: 'mfa_challenge',
      ipAddress,
      userAgent,
      issuedAt: Date.now(),
    };

    return this.jwtService.signAsync(payload, {
      expiresIn: '10m', // 10 minutes expiry
    });
  }

  /**
   * Generate temporary token for MFA setup (when MFA is not yet enabled)
   * 
   * Short-lived token (15 minutes) used only for MFA setup endpoints.
   * Type is 'mfa_setup' which is recognized by JwtAuthGuard with @AllowMfaSetupToken decorator.
   */
  private async generateMfaSetupToken(
    userId: string,
    email: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string> {
    const payload = {
      sub: userId,
      email,
      type: 'mfa_setup',
      ipAddress,
      userAgent,
      issuedAt: Date.now(),
    };

    return this.jwtService.signAsync(payload, {
      expiresIn: '15m', // 15 minutes expiry for setup
    });
  }

  /**
   * Generate access token
   */
  private async generateAccessToken(
    userId: string,
    email: string,
    firstName: string,
    lastName: string,
    roles: Array<{ code: string }>,
    permissions: Array<{ code: string }>,
    sessionId: string,
    mfaVerified: boolean = false,
  ): Promise<string> {
    const payload = {
      sub: userId,
      email,
      firstName,
      lastName,
      roles: roles.map(r => r.code),
      permissions: permissions.map(p => p.code),
      sessionId,
      type: 'access',
      mfaVerified, // Include MFA verification status in token
    };

    return this.jwtService.signAsync(payload);
  }

  /**
   * Generate refresh token
   */
  private async generateRefreshToken(userId: string, sessionId: string): Promise<string> {
    const payload = {
      sub: userId,
      sessionId,
      type: 'refresh',
    };

    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET') ||
      this.configService.get<string>('JWT_SECRET');

    return this.jwtService.signAsync(payload, {
      secret: refreshSecret,
      expiresIn: this.getRefreshTokenExpiry(),
    });
  }

  /**
   * Hash token for storage (SHA-256)
   */
  private hashToken(token: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Get access token expiry in seconds
   */
  private getAccessTokenExpiry(): number {
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '15m';
    // Parse "15m" to seconds
    const match = expiresIn.match(/(\d+)([smhd])/);
    if (!match) return 900; // Default 15 minutes

    const value = parseInt(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * (multipliers[unit] || 60);
  }

  /**
   * Get refresh token expiry in seconds
   */
  private getRefreshTokenExpiry(): number {
    const expiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
    const match = expiresIn.match(/(\d+)([smhd])/);
    if (!match) return 604800; // Default 7 days

    const value = parseInt(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * (multipliers[unit] || 86400);
  }

  /**
   * Log failed login attempt (HIPAA audit requirement)
   */
  private async logFailedLoginAttempt(
    identifier: string,
    ipAddress?: string,
    userAgent?: string,
    reason?: string,
  ): Promise<void> {
    // Try to find user by identifier (email or id)
    let userId: string | undefined;
    try {
      const user = await this.authRepository.findByEmailOrId(identifier);
      userId = user?.id;
    } catch {
      // User not found - that's fine for failed login logging
    }

    if (userId) {
      await this.dataAccessLogService.log({
        userId,
        resourceType: 'Authentication',
        resourceId: identifier,
        action: 'LOGIN_FAILED',
        ipAddress,
        userAgent,
        accessedPHI: false,
        success: false,
        errorMessage: reason,
      });
    }
  }
}

