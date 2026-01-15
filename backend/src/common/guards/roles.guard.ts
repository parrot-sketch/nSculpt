import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IdentityContextService } from '../../modules/auth/services/identityContext.service';
import { DataAccessLogService } from '../../modules/audit/services/dataAccessLog.service';

/**
 * RolesGuard
 * 
 * Validates that the authenticated user has at least one of the required roles.
 * Uses IdentityContextService to check roles from JWT token.
 * 
 * Logs all role checks for audit compliance.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(
    private reflector: Reflector,
    private identityContext: IdentityContextService,
    private dataAccessLogService: DataAccessLogService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No roles required - allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Check authentication
    // Note: JwtAuthGuard (APP_GUARD) should run first and set identity
    // If identity is not set, it means authentication failed or guard order is wrong
    if (!this.identityContext.isAuthenticated()) {
      this.logger.warn('Role check failed: User not authenticated', {
        path: context.switchToHttp().getRequest().path,
        method: context.switchToHttp().getRequest().method,
      });
      // Return 401 Unauthorized instead of 403 Forbidden if not authenticated
      // This helps distinguish between "not logged in" vs "insufficient permissions"
      throw new ForbiddenException('User not authenticated. Please ensure JwtAuthGuard runs before RolesGuard.');
    }

    const user = this.identityContext.getIdentity();
    const hasRole = this.identityContext.hasAnyRole(requiredRoles);

    // Log role check attempt (non-blocking)
    this.logRoleCheck(user.id, requiredRoles, hasRole, context).catch((error) => {
      this.logger.error('Failed to log role check', error);
    });

    if (!hasRole) {
      this.logger.warn(
        `Role check failed for user ${user.id}: Required roles [${requiredRoles.join(', ')}], User roles [${user.roles.join(', ')}]`,
      );
      throw new ForbiddenException(
        `Insufficient roles. Required: ${requiredRoles.join(', ')}. Your roles: ${user.roles.join(', ')}`,
      );
    }

    return true;
  }

  /**
   * Log role check for audit compliance
   */
  private async logRoleCheck(
    userId: string,
    requiredRoles: string[],
    success: boolean,
    context: ExecutionContext,
  ): Promise<void> {
    const request = context.switchToHttp().getRequest();
    const route = `${request.method} ${request.path}`;

    try {
      await this.dataAccessLogService.log({
        userId,
        resourceType: 'Route',
        resourceId: route,
        action: 'ROLE_CHECK',
        ipAddress: request.ip || request.socket?.remoteAddress,
        userAgent: request.headers['user-agent'],
        sessionId: this.identityContext.getSessionId(),
        reason: `Role check: Required [${requiredRoles.join(', ')}]`,
        accessedPHI: false,
        success,
        errorMessage: success
          ? undefined
          : `Insufficient roles. Required: ${requiredRoles.join(', ')}`,
      });
    } catch (error) {
      // Don't fail the request if logging fails
      this.logger.error('Failed to log role check', error);
    }
  }
}

