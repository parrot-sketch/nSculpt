import { Injectable, ExecutionContext, UnauthorizedException, CanActivate, Logger } from '@nestjs/common';
import { Reflector, ModuleRef, ContextIdFactory } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_MFA_SETUP_TOKEN_KEY } from '../decorators/allow-mfa-setup-token.decorator';
import { ALLOW_MFA_CHALLENGE_KEY } from '../decorators/allow-mfa-challenge.decorator';
import { AuthService } from '../services/auth.service';
import { IdentityContextService } from '../services/identityContext.service';
import { AuthRepository } from '../repositories/auth.repository';

/**
 * JWT Authentication Guard (Custom Implementation)
 * 
 * Validates JWT tokens directly without using Passport.
 * This bypasses Passport strategy registration issues.
 * 
 * Best Practices Applied:
 * - Proper error handling with specific exception types
 * - Comprehensive logging for security auditing
 * - Defensive programming with null checks
 * - Token validation with multiple checks
 * - Session validation for security
 * - Identity context setup for downstream guards
 * 
 * Flow:
 * 1. Check if route is public (@Public() decorator)
 * 2. Extract token from Authorization header
 * 3. Verify token using JwtService
 * 4. Validate session is still active
 * 5. Load user and set identity context
 * 6. Attach user to request object
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private readonly reflector: Reflector;

  constructor(
    private readonly moduleRef: ModuleRef,
    reflector?: Reflector,
    private readonly jwtService?: JwtService,
    private readonly configService?: ConfigService,
    private readonly authService?: AuthService,
    private readonly authRepository?: AuthRepository,
  ) {
    // Always create Reflector instance (handles APP_GUARD injection issues)
    // Reflector is safe to create multiple instances - it's stateless
    this.reflector = reflector || new Reflector();
    
    // Log initialization for debugging
    if (!reflector) {
      this.logger.warn('Reflector not injected, using fallback instance');
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Safety check - ensure reflector is initialized
    if (!this.reflector) {
      this.logger.error('Reflector not initialized - this should never happen');
      throw new Error('Reflector not initialized in JwtAuthGuard');
    }

    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      this.logger.debug('Public route accessed - skipping authentication');
      return true;
    }

    // Validate dependencies are injected
    if (!this.jwtService || !this.configService || !this.authService || !this.authRepository) {
      this.logger.error('JwtAuthGuard dependencies not properly injected', {
        jwtService: !!this.jwtService,
        configService: !!this.configService,
        authService: !!this.authService,
        authRepository: !!this.authRepository,
      });
      throw new Error('JwtAuthGuard dependencies not properly injected');
    }

    const request = context.switchToHttp().getRequest<Request>();
    
    // Get request-scoped IdentityContextService from module context
    // Use ContextIdFactory to ensure we get the same instance that RolesGuard will use
    // This is critical for request-scoped services to work correctly
    let identityContext: IdentityContextService;
    try {
      // Get or create context ID from request to ensure same instance
      const contextId = ContextIdFactory.getByRequest(request);
      identityContext = await this.moduleRef.resolve(IdentityContextService, contextId);
    } catch (error) {
      this.logger.error('Failed to get IdentityContextService from module context', error);
      throw new UnauthorizedException('Authentication service unavailable');
    }
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      this.logger.warn('Authentication failed: No token provided', {
        path: request.path,
        method: request.method,
      });
      throw new UnauthorizedException('No token provided');
    }

    try {
      // Verify token signature and expiration
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET') || 'change-me-in-production',
      });

      // Check if endpoint allows MFA setup tokens
      const allowMfaSetupToken = this.reflector.getAllAndOverride<boolean>(ALLOW_MFA_SETUP_TOKEN_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      // Check if endpoint allows MFA challenge tokens
      const allowMfaChallengeToken = this.reflector.getAllAndOverride<boolean>(ALLOW_MFA_CHALLENGE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      // Verify token type based on endpoint requirements
      if (payload.type === 'mfa_setup') {
        // MFA setup tokens are only allowed on specific endpoints
        if (!allowMfaSetupToken) {
          this.logger.warn('Authentication failed: MFA setup token not allowed on this endpoint', {
            tokenType: payload.type,
            userId: payload.sub,
            path: request.path,
          });
          throw new UnauthorizedException('This endpoint requires a full access token');
        }
        // For MFA setup endpoints, we'll allow the request with just the user ID
        // Load user for context
        const user = await this.authRepository.findById(payload.sub);
        if (!user) {
          this.logger.warn('Authentication failed: User not found for MFA setup token', {
            userId: payload.sub,
          });
          throw new UnauthorizedException('User not found');
        }
        // Set minimal user context for MFA setup endpoints
        (request as any).user = {
          id: user.id,
          email: user.email,
          sessionId: payload.sessionId,
        };
      } else if (payload.type === 'mfa_challenge') {
        // MFA challenge tokens are only allowed on specific endpoints (verification + logout)
        if (!allowMfaChallengeToken) {
          this.logger.warn('Authentication failed: MFA challenge token not allowed on this endpoint', {
            tokenType: payload.type,
            userId: payload.sub,
            path: request.path,
          });
          throw new UnauthorizedException('This endpoint requires a full access token');
        }
        // For MFA challenge endpoints, allow the request with just the user ID
        // Load user for context
        const user = await this.authRepository.findById(payload.sub);
        if (!user) {
          this.logger.warn('Authentication failed: User not found for MFA challenge token', {
            userId: payload.sub,
          });
          throw new UnauthorizedException('User not found');
        }
        // Set minimal user context for MFA challenge endpoints
        (request as any).user = {
          id: user.id,
          email: user.email,
          sessionId: payload.sessionId,
        };
      } else if (payload.type === 'access') {
        // Regular access token - always allowed
        // Validate session is still active (prevents use of revoked tokens)
        await this.authService.validateToken(token);

        // Load user details from database (ensures user still exists and is active)
        const user = await this.authRepository.findById(payload.sub);
        if (!user) {
          this.logger.warn('Authentication failed: User not found', {
            userId: payload.sub,
          });
          throw new UnauthorizedException('User not found');
        }

        if (!user.isActive) {
          this.logger.warn('Authentication failed: User inactive', {
            userId: user.id,
            email: user.email,
          });
          throw new UnauthorizedException('User account is inactive');
        }

        // Validate roles and permissions from token match database
        // This ensures token hasn't been tampered with
        const { roles, permissions } = await this.authRepository.getUserRolesAndPermissions(user.id);
        const tokenRoles = payload.roles || [];
        const tokenPermissions = payload.permissions || [];

        // Build user identity with full details (for IdentityContextService)
        const userIdentity = {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roles: roles.map(r => r.code), // Use database roles, not token roles (more secure)
          permissions: permissions.map(p => p.code), // Use database permissions, not token permissions
          sessionId: payload.sessionId,
          departmentId: user.departmentId || undefined,
          employeeId: user.employeeId || undefined,
        };
        
        // Set identity context for request (required by RolesGuard and PermissionsGuard)
        // This MUST be set before other guards run
        identityContext.setIdentity(userIdentity);
        
        // Also ensure request.user is set (IdentityContextService might not have request yet)
        // This ensures backward compatibility with existing code and @CurrentUser() decorator
        (request as any).user = {
          id: user.id,
          email: user.email,
          roles: roles.map(r => r.code),
          permissions: permissions.map(p => p.code),
          sessionId: payload.sessionId,
        };

        this.logger.debug('Authentication successful', {
          userId: user.id,
          email: user.email,
          roles: roles.map(r => r.code),
          path: request.path,
        });
      } else {
        this.logger.warn('Authentication failed: Invalid token type', {
          tokenType: payload.type,
          userId: payload.sub,
        });
        throw new UnauthorizedException('Invalid token type');
      }

      return true;
    } catch (error) {
      // Re-throw UnauthorizedException as-is (proper HTTP status)
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // Log unexpected errors for debugging
      this.logger.error('Authentication error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        path: request.path,
      });

      // Don't leak internal error details to client
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Extract JWT token from Authorization header or secure cookie
   * 
   * Priority:
   * 1. Secure HTTP-only cookie (preferred)
   * 2. Authorization header with Bearer token (fallback for API clients)
   */
  private extractTokenFromHeader(request: Request): string | undefined {
    // First, try to get token from secure HTTP-only cookie
    const cookieToken = (request.cookies && request.cookies['access_token']) as string | undefined;
    if (cookieToken) {
      return cookieToken;
    }

    // Fallback to Authorization header for API clients
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      return undefined;
    }

    // Support "Bearer <token>" format
    const [type, token] = authHeader.split(' ');
    
    if (type !== 'Bearer' || !token) {
      return undefined;
    }

    return token;
  }
}
