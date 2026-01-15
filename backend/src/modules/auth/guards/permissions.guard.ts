import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { IdentityContextService } from '../services/identityContext.service';
import { DataAccessLogService } from '../../audit/services/dataAccessLog.service';

/**
 * PermissionsGuard
 * 
 * Validates that the authenticated user has ALL required permissions.
 * Uses IdentityContextService to check permissions from JWT token.
 * 
 * This guard works in conjunction with RolesGuard:
 * - RolesGuard checks if user has required role (coarse-grained)
 * - PermissionsGuard checks if user has required permissions (fine-grained)
 * - Both must pass for access to be granted
 * 
 * Logs all permission checks for audit compliance.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private reflector: Reflector,
    private identityContext: IdentityContextService,
    private dataAccessLogService: DataAccessLogService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No permissions required - allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // Check authentication
    if (!this.identityContext.isAuthenticated()) {
      this.logger.warn('Permission check failed: User not authenticated');
      throw new ForbiddenException('User not authenticated');
    }

    const user = this.identityContext.getIdentity();
    
    // Check if user has ALL required permissions (not just ANY)
    // This ensures fine-grained control - user must have all specified permissions
    const hasAllPermissions = this.identityContext.hasAllPermissions(requiredPermissions);

    // Log permission check attempt (non-blocking)
    this.logPermissionCheck(user.id, requiredPermissions, hasAllPermissions, context).catch(
      (error) => {
        this.logger.error('Failed to log permission check', error);
      },
    );

    if (!hasAllPermissions) {
      const missingPermissions = requiredPermissions.filter(
        (perm) => !this.identityContext.hasPermission(perm),
      );

      this.logger.warn(
        `Permission check failed for user ${user.id}: Required permissions [${requiredPermissions.join(', ')}], Missing [${missingPermissions.join(', ')}], User permissions [${user.permissions.join(', ')}]`,
      );

      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermissions.join(', ')}. Missing: ${missingPermissions.join(', ')}. Your permissions: ${user.permissions.join(', ')}`,
      );
    }

    return true;
  }

  /**
   * Log permission check for audit compliance
   */
  private async logPermissionCheck(
    userId: string,
    requiredPermissions: string[],
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
        action: 'PERMISSION_CHECK',
        ipAddress: request.ip || request.socket?.remoteAddress,
        userAgent: request.headers['user-agent'],
        sessionId: this.identityContext.getSessionId(),
        reason: `Permission check: Required [${requiredPermissions.join(', ')}]`,
        accessedPHI: false,
        success,
        errorMessage: success
          ? undefined
          : `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
      });
    } catch (error) {
      // Don't fail the request if logging fails
      this.logger.error('Failed to log permission check', error);
    }
  }
}

