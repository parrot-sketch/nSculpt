import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth.service';
import { IdentityContextService } from '../services/identityContext.service';
import { AuthRepository } from '../repositories/auth.repository';

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly identityContextService: IdentityContextService,
    private readonly authRepository: AuthRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'change-me-in-production',
      passReqToCallback: true,
    });
  }

  /**
   * Validate JWT token and set identity context
   */
  async validate(req: any, payload: JwtPayload): Promise<any> {
    // 1. Verify token type
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    // 2. Verify session is still active
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (!token) {
      throw new UnauthorizedException('Token not found');
    }

    try {
      await this.authService.validateToken(token);
    } catch (error) {
      throw new UnauthorizedException('Session expired or revoked');
    }

    // 3. Load user details
    const user = await this.authRepository.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // 4. Load roles and permissions from database (more secure than trusting token)
    // This ensures roles/permissions are always up-to-date even if token is stale
    const { roles, permissions } = await this.authRepository.getUserRolesAndPermissions(user.id);

    // 5. Build full user identity with database roles/permissions
    const userIdentity = {
      id: user.id,
      email: payload.email || user.email,
      firstName: payload.firstName || user.firstName,
      lastName: payload.lastName || user.lastName,
      roles: roles.map(r => r.code), // Use database roles, not token roles (more secure)
      permissions: permissions.map(p => p.code), // Use database permissions, not token permissions
      sessionId: payload.sessionId,
      departmentId: user.departmentId || undefined,
      employeeId: user.employeeId || undefined,
    };

    // 5. Set identity context for request
    this.identityContextService.setIdentity(userIdentity);

    // 6. Return full user payload (also available on request.user via Passport)
    // This ensures @CurrentUser() decorator has access to all fields
    return userIdentity;
  }
}




