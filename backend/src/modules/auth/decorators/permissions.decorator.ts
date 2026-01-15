import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Permissions Decorator
 * Specifies which permissions are required to access a route
 * 
 * Usage:
 * @Permissions('medical_records:read', 'medical_records:write')
 * @Get('records')
 * getRecords() { ... }
 */
export const Permissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);












