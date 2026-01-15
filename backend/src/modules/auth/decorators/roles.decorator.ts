import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Roles Decorator
 * Specifies which roles are required to access a route
 * 
 * Usage:
 * @Roles('ADMIN', 'SURGEON')
 * @Get('admin-only')
 * adminOnly() { ... }
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);












