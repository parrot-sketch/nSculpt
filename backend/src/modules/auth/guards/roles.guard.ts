import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IdentityContextService } from '../services/identityContext.service';

/**
 * Roles Guard
 * Checks if user has required roles
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private identityContext: IdentityContextService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No roles required
    }

    if (!this.identityContext.isAuthenticated()) {
      throw new ForbiddenException('User not authenticated');
    }

    const hasRole = this.identityContext.hasAnyRole(requiredRoles);

    if (!hasRole) {
      throw new ForbiddenException(
        `Insufficient roles. Required: ${requiredRoles.join(', ')}`
      );
    }

    return true;
  }
}












