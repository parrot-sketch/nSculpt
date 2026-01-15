import { Injectable, BadRequestException, UnauthorizedException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthRepository } from '../repositories/auth.repository';
import { SessionService } from './session.service';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { DataAccessLogService } from '../../audit/services/dataAccessLog.service';
import { Domain } from '@prisma/client';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import * as crypto from 'crypto';
import type { AuthResult } from './auth.service';

/**
 * MFA Service
 * 
 * Handles Multi-Factor Authentication (MFA) operations:
 * - MFA enable/disable
 * - TOTP secret generation
 * - QR code generation
 * - TOTP verification
 * - Backup code generation
 */
@Injectable()
export class MfaService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly sessionService: SessionService,
    private readonly domainEventService: DomainEventService,
    private readonly correlationService: CorrelationService,
    private readonly dataAccessLogService: DataAccessLogService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Enable MFA for user
   * 
   * Generates TOTP secret and QR code for setup.
   * Returns secret and QR code data URL for frontend to display.
   * 
   * Note: MFA is not fully enabled until user verifies TOTP code.
   */
  async enableMfa(userId: string, ipAddress?: string, userAgent?: string): Promise<{
    secret: string;
    qrCodeDataUrl: string;
    backupCodes: string[];
  }> {
    // Get user
    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if MFA is already enabled
    if (user.mfaEnabled) {
      throw new BadRequestException('MFA is already enabled for this user');
    }

    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `Healthcare EHR (${user.email})`,
      issuer: 'Healthcare EHR',
      length: 32,
    });

    // Generate QR code
    const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url);

    // Generate backup codes (10 codes, 8 characters each)
    const backupCodes = this.generateBackupCodes(10);

    // Save secret and backup codes (NOT yet enabled)
    await this.authRepository.updateMfaSecret(userId, secret.base32, backupCodes);

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'User.MfaInitiated',
      domain: Domain.RBAC,
      aggregateId: userId,
      aggregateType: 'User',
      payload: {
        userId,
        email: user.email,
      },
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      correlationId: context.correlationId || undefined,
    });

    // Log action
    await this.dataAccessLogService.log({
      userId,
      resourceType: 'User',
      resourceId: userId,
      action: 'MFA_INITIATED',
      sessionId: context.sessionId,
      ipAddress,
      userAgent,
      reason: 'User initiated MFA setup',
      accessedPHI: false,
      success: true,
    });

    return {
      secret: secret.base32,
      qrCodeDataUrl,
      backupCodes,
    };
  }

  /**
   * Verify MFA setup
   * 
   * Verifies TOTP code and fully enables MFA.
   * Must be called after enableMfa() to complete setup.
   */
  async verifyMfaSetup(userId: string, code: string, ipAddress?: string, userAgent?: string): Promise<boolean> {
    // Get user
    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if MFA is already enabled
    if (user.mfaEnabled) {
      throw new BadRequestException('MFA is already enabled');
    }

    // Check if MFA secret exists
    if (!user.mfaSecret) {
      throw new BadRequestException('MFA setup not initiated. Please call /auth/mfa/enable first.');
    }

    // Verify TOTP code
    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: code,
      window: 2, // Allow 2 time steps (60 seconds) of drift
    });

    if (!verified) {
      // Log failed verification
      await this.dataAccessLogService.log({
        userId,
        resourceType: 'User',
        resourceId: userId,
        action: 'MFA_VERIFICATION_FAILED',
        sessionId: this.correlationService.getContext().sessionId,
        ipAddress,
        userAgent,
        reason: 'Invalid MFA code provided during setup',
        accessedPHI: false,
        success: false,
        errorMessage: 'Invalid TOTP code',
      });

      throw new UnauthorizedException('Invalid MFA code');
    }

    // Enable MFA
    await this.authRepository.enableMfa(userId);

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'User.MfaEnabled',
      domain: Domain.RBAC,
      aggregateId: userId,
      aggregateType: 'User',
      payload: {
        userId,
        email: user.email,
      },
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      correlationId: context.correlationId || undefined,
    });

    // Log action
    await this.dataAccessLogService.log({
      userId,
      resourceType: 'User',
      resourceId: userId,
      action: 'MFA_ENABLED',
      sessionId: context.sessionId,
      ipAddress,
      userAgent,
      reason: 'User successfully verified and enabled MFA',
      accessedPHI: false,
      success: true,
    });

    return true;
  }

  /**
   * Verify MFA setup and complete login with full auth tokens
   * 
   * This method is called after user verifies the TOTP code during MFA setup.
   * It enables MFA and returns full auth tokens, allowing the user to be fully logged in.
   * 
   * This is used in the MFA setup flow when a user with a sensitive role logs in without MFA.
   */
  async verifyMfaSetupAndCompleteLogin(
    userId: string,
    code: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResult> {
    // Get user
    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if MFA is already enabled
    if (user.mfaEnabled) {
      throw new BadRequestException('MFA is already enabled');
    }

    // Check if MFA secret exists
    if (!user.mfaSecret) {
      throw new BadRequestException('MFA setup not initiated. Please call /auth/mfa/enable first.');
    }

    // Verify TOTP code
    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: code,
      window: 2, // Allow 2 time steps (60 seconds) of drift
    });

    if (!verified) {
      // Log failed verification
      await this.dataAccessLogService.log({
        userId,
        resourceType: 'User',
        resourceId: userId,
        action: 'MFA_VERIFICATION_FAILED',
        sessionId: this.correlationService.getContext().sessionId,
        ipAddress,
        userAgent,
        reason: 'Invalid MFA code provided during setup',
        accessedPHI: false,
        success: false,
        errorMessage: 'Invalid TOTP code',
      });

      throw new UnauthorizedException('Invalid MFA code');
    }

    // Enable MFA
    await this.authRepository.enableMfa(userId);

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'User.MfaEnabled',
      domain: Domain.RBAC,
      aggregateId: userId,
      aggregateType: 'User',
      payload: {
        userId,
        email: user.email,
      },
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      correlationId: context.correlationId || undefined,
    });

    // Log action
    await this.dataAccessLogService.log({
      userId,
      resourceType: 'User',
      resourceId: userId,
      action: 'MFA_SETUP_COMPLETED',
      sessionId: context.sessionId,
      ipAddress,
      userAgent,
      reason: 'User successfully verified and enabled MFA during setup',
      accessedPHI: false,
      success: true,
    });

    // Generate full auth tokens for login completion
    const { roles, permissions } = await this.authRepository.getUserRolesAndPermissions(userId);
    const sessionId = this.correlationService.generateCorrelationId();
    
    // Generate tokens
    const accessToken = await this.generateAccessToken(
      user.id,
      user.email,
      user.firstName,
      user.lastName,
      roles,
      permissions,
      sessionId,
      true, // mfaVerified
    );

    const refreshToken = await this.generateRefreshToken(user.id, sessionId);

    // Create session record
    const hashToken = (token: string): string => {
      return crypto.createHash('sha256').update(token).digest('hex');
    };

    await this.sessionService.createSession({
      userId: user.id,
      accessTokenHash: hashToken(accessToken),
      refreshTokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      ipAddress,
      userAgent,
      mfaVerified: true,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: roles.map(r => r.code),
        permissions: permissions.map(p => p.code),
      },
      sessionId,
      expiresIn: 24 * 60 * 60, // 24 hours
    };
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
      mfaVerified,
    };

    return this.jwtService.signAsync(payload);
  }

  /**
   * Generate refresh token
   */
  private async generateRefreshToken(
    userId: string,
    sessionId: string,
  ): Promise<string> {
    const payload = {
      sub: userId,
      sessionId,
      type: 'refresh',
    };

    return this.jwtService.signAsync(payload, {
      expiresIn: '7d', // 7 days
    });
  }

  /**
   * Disable MFA for user
   * 
   * Requires TOTP code or backup code for verification.
   * Removes TOTP secret and backup codes.
   */
  async disableMfa(userId: string, code: string, ipAddress?: string, userAgent?: string): Promise<boolean> {
    // Get user
    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if MFA is enabled
    if (!user.mfaEnabled) {
      throw new BadRequestException('MFA is not enabled for this user');
    }

    // Verify TOTP code or backup code
    const verified = this.verifyMfaCode(user.mfaSecret, code, user.backupCodes);

    if (!verified) {
      // Log failed verification
      await this.dataAccessLogService.log({
        userId,
        resourceType: 'User',
        resourceId: userId,
        action: 'MFA_DISABLE_FAILED',
        sessionId: this.correlationService.getContext().sessionId,
        ipAddress,
        userAgent,
        reason: 'Invalid MFA code provided during disable',
        accessedPHI: false,
        success: false,
        errorMessage: 'Invalid TOTP or backup code',
      });

      throw new UnauthorizedException('Invalid MFA code or backup code');
    }

    // Disable MFA
    await this.authRepository.disableMfa(userId);

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'User.MfaDisabled',
      domain: Domain.RBAC,
      aggregateId: userId,
      aggregateType: 'User',
      payload: {
        userId,
        email: user.email,
      },
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      correlationId: context.correlationId || undefined,
    });

    // Log action
    await this.dataAccessLogService.log({
      userId,
      resourceType: 'User',
      resourceId: userId,
      action: 'MFA_DISABLED',
      sessionId: context.sessionId,
      ipAddress,
      userAgent,
      reason: 'User successfully disabled MFA',
      accessedPHI: false,
      success: true,
    });

    return true;
  }

  /**
   * Verify MFA code during login
   * 
   * Verifies TOTP code or backup code.
   * If backup code is used, it should be marked as used.
   */
  async verifyMfaLogin(userId: string, code: string, ipAddress?: string, userAgent?: string): Promise<boolean> {
    // Get user
    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if MFA is enabled
    if (!user.mfaEnabled) {
      throw new BadRequestException('MFA is not enabled for this user');
    }

    // Verify TOTP code
    const totpVerified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (totpVerified) {
      // Log successful verification
      await this.dataAccessLogService.log({
        userId,
        resourceType: 'User',
        resourceId: userId,
        action: 'MFA_LOGIN_VERIFIED',
        sessionId: this.correlationService.getContext().sessionId,
        ipAddress,
        userAgent,
        reason: 'User successfully verified MFA during login',
        accessedPHI: false,
        success: true,
      });

      return true;
    }

    // Try backup codes
    const backupCodeVerified = user.backupCodes?.includes(code);
    if (backupCodeVerified) {
      // Remove used backup code
      const updatedBackupCodes = user.backupCodes.filter((bc) => bc !== code);
      await this.authRepository.updateBackupCodes(userId, updatedBackupCodes);

      // Log backup code usage
      await this.dataAccessLogService.log({
        userId,
        resourceType: 'User',
        resourceId: userId,
        action: 'MFA_BACKUP_CODE_USED',
        sessionId: this.correlationService.getContext().sessionId,
        ipAddress,
        userAgent,
        reason: `Backup code used during login. ${updatedBackupCodes.length} backup codes remaining.`,
        accessedPHI: false,
        success: true,
      });

      return true;
    }

    // Both failed
    await this.dataAccessLogService.log({
      userId,
      resourceType: 'User',
      resourceId: userId,
      action: 'MFA_LOGIN_FAILED',
      sessionId: this.correlationService.getContext().sessionId,
      ipAddress,
      userAgent,
      reason: 'Invalid MFA code provided during login',
      accessedPHI: false,
      success: false,
      errorMessage: 'Invalid TOTP or backup code',
    });

    return false;
  }

  /**
   * Verify MFA code (TOTP or backup code)
   * 
   * Helper method to verify either TOTP code or backup code.
   */
  private verifyMfaCode(secret: string, code: string, backupCodes: string[]): boolean {
    // Try TOTP
    const totpVerified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (totpVerified) {
      return true;
    }

    // Try backup code
    return backupCodes?.includes(code) || false;
  }

  /**
   * Generate backup codes
   * 
   * Generates cryptographically secure backup codes.
   * Each code is 8 characters (alphanumeric, uppercase).
   */
  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }
}
