import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { PermissionsService } from '../services/permissions.service';
import { PermissionQueryDto } from '../dto/permission-query.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../auth/services/identityContext.service';
import { Domain } from '@prisma/client';

/**
 * Permissions Controller
 * 
 * Admin-only endpoints for permission management.
 * Permissions are typically read-only (seeded in database).
 * 
 * Security:
 * - Requires ADMIN role
 * - Requires admin:*:read permissions
 * - All actions logged for audit
 */
@Controller('admin/permissions')
@UseGuards(RolesGuard, PermissionsGuard)
@UseInterceptors(DataAccessLogInterceptor)
@Roles('ADMIN')
@Permissions('admin:*:read')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  /**
   * List permissions with filters
   * GET /api/v1/admin/permissions
   */
  @Get()
  @Permissions('admin:permissions:read')
  async findAll(@Query() query: PermissionQueryDto, @CurrentUser() admin: UserIdentity) {
    return this.permissionsService.listPermissions(query, admin.id);
  }

  /**
   * Get permission by ID
   * GET /api/v1/admin/permissions/:id
   */
  @Get(':id')
  @Permissions('admin:permissions:read')
  async findOne(@Param('id') id: string, @CurrentUser() admin: UserIdentity) {
    return this.permissionsService.getPermissionById(id, admin.id);
  }

  /**
   * Get permissions by domain
   * GET /api/v1/admin/permissions/by-domain/:domain
   */
  @Get('by-domain/:domain')
  @Permissions('admin:permissions:read')
  async findByDomain(
    @Param('domain') domain: Domain,
    @CurrentUser() admin: UserIdentity,
  ) {
    return this.permissionsService.getPermissionsByDomain(domain, admin.id);
  }

  /**
   * Get roles that have this permission
   * GET /api/v1/admin/permissions/:id/roles
   */
  @Get(':id/roles')
  @Permissions('admin:permissions:read')
  async getRolesWithPermission(@Param('id') id: string, @CurrentUser() admin: UserIdentity) {
    return this.permissionsService.getRolesWithPermission(id, admin.id);
  }

  /**
   * Get permission statistics
   * GET /api/v1/admin/permissions/stats
   */
  @Get('stats')
  @Permissions('admin:permissions:read')
  async getStats(@CurrentUser() admin: UserIdentity) {
    return this.permissionsService.getPermissionStats(admin.id);
  }
}










