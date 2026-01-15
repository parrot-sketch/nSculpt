import { Injectable, NotFoundException } from '@nestjs/common';
import { PermissionsRepository } from '../repositories/permissions.repository';
import { PermissionQueryDto } from '../dto/permission-query.dto';
import { DataAccessLogService } from '../../audit/services/dataAccessLog.service';
import { Domain } from '@prisma/client';

/**
 * Permissions Service
 * 
 * Business logic for permission management.
 * Permissions are typically read-only (seeded in database).
 */
@Injectable()
export class PermissionsService {
  constructor(
    private readonly permissionsRepository: PermissionsRepository,
    private readonly dataAccessLogService: DataAccessLogService,
  ) {}

  /**
   * Get permission by ID
   */
  async getPermissionById(id: string, adminId: string) {
    const permission = await this.permissionsRepository.findById(id);
    if (!permission) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }

    // Log access
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'Permission',
      resourceId: id,
      action: 'READ',
      reason: 'Admin viewed permission details',
      accessedPHI: false,
      success: true,
    });

    return permission;
  }

  /**
   * List permissions with filters
   */
  async listPermissions(query: PermissionQueryDto, adminId: string) {
    const result = await this.permissionsRepository.findAll(query);

    // Log access
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'Permission',
      resourceId: 'all',
      action: 'LIST',
      reason: `Admin listed permissions: ${JSON.stringify(query)}`,
      accessedPHI: false,
      success: true,
    });

    return result;
  }

  /**
   * Get permissions by domain
   */
  async getPermissionsByDomain(domain: Domain, adminId: string) {
    const permissions = await this.permissionsRepository.findByDomain(domain);

    // Log access
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'Permission',
      resourceId: domain,
      action: 'LIST_BY_DOMAIN',
      reason: `Admin listed permissions for domain: ${domain}`,
      accessedPHI: false,
      success: true,
    });

    return permissions;
  }

  /**
   * Get roles that have this permission
   */
  async getRolesWithPermission(permissionId: string, adminId: string) {
    const permission = await this.permissionsRepository.findById(permissionId);
    if (!permission) {
      throw new NotFoundException(`Permission with ID ${permissionId} not found`);
    }

    const roles = await this.permissionsRepository.getRolesWithPermission(permissionId);

    // Log access
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'Permission',
      resourceId: permissionId,
      action: 'LIST_ROLES',
      reason: `Admin viewed roles with permission ${permission.code}`,
      accessedPHI: false,
      success: true,
    });

    return roles;
  }

  /**
   * Get permission statistics
   */
  async getPermissionStats(adminId: string) {
    const stats = await this.permissionsRepository.findAll({});

    // Group by domain
    const byDomain: Record<string, number> = {};
    const byAction: Record<string, number> = {};

    stats.permissions.forEach(perm => {
      byDomain[perm.domain] = (byDomain[perm.domain] || 0) + 1;
      byAction[perm.action] = (byAction[perm.action] || 0) + 1;
    });

    // Log access
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'Permission',
      resourceId: 'stats',
      action: 'READ_STATS',
      reason: 'Admin viewed permission statistics',
      accessedPHI: false,
      success: true,
    });

    return {
      total: stats.total,
      byDomain,
      byAction,
    };
  }
}










