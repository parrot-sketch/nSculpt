import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RolesService } from '../services/roles.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { AssignPermissionDto } from '../dto/assign-permission.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../auth/services/identityContext.service';

/**
 * Roles Controller
 * 
 * Admin-only endpoints for role management.
 * 
 * Security:
 * - Requires ADMIN role
 * - Requires admin:* permissions
 * - All actions logged for audit
 */
@Controller('admin/roles')
@UseGuards(RolesGuard, PermissionsGuard)
@UseInterceptors(DataAccessLogInterceptor)
@Roles('ADMIN')
@Permissions('admin:*:read', 'admin:*:write')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /**
   * Create a new role
   * POST /api/v1/admin/roles
   */
  @Post()
  @Permissions('admin:roles:write')
  async create(@Body() createRoleDto: CreateRoleDto, @CurrentUser() admin: UserIdentity) {
    return this.rolesService.createRole(createRoleDto, admin.id);
  }

  /**
   * List all roles
   * GET /api/v1/admin/roles
   */
  @Get()
  @Permissions('admin:roles:read')
  async findAll(
    @Query('includeInactive') includeInactive?: string,
    @CurrentUser() admin?: UserIdentity,
  ) {
    const includeInactiveBool = includeInactive === 'true';
    return this.rolesService.listRoles(includeInactiveBool, admin?.id || '');
  }

  /**
   * Get role by ID
   * GET /api/v1/admin/roles/:id
   */
  @Get(':id')
  @Permissions('admin:roles:read')
  async findOne(@Param('id') id: string, @CurrentUser() admin: UserIdentity) {
    return this.rolesService.getRoleById(id, admin.id);
  }

  /**
   * Update role
   * PATCH /api/v1/admin/roles/:id
   */
  @Patch(':id')
  @Permissions('admin:roles:write')
  async update(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @CurrentUser() admin: UserIdentity,
  ) {
    return this.rolesService.updateRole(id, updateRoleDto, admin.id);
  }

  /**
   * Deactivate role
   * DELETE /api/v1/admin/roles/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('admin:roles:delete')
  async remove(@Param('id') id: string, @CurrentUser() admin: UserIdentity) {
    await this.rolesService.deactivateRole(id, admin.id);
  }

  /**
   * Assign permission to role
   * POST /api/v1/admin/roles/:id/permissions
   */
  @Post(':id/permissions')
  @Permissions('admin:roles:write')
  async assignPermission(
    @Param('id') roleId: string,
    @Body() assignPermissionDto: AssignPermissionDto,
    @CurrentUser() admin: UserIdentity,
  ) {
    return this.rolesService.assignPermission(roleId, assignPermissionDto, admin.id);
  }

  /**
   * Remove permission from role
   * DELETE /api/v1/admin/roles/:id/permissions/:permissionId
   */
  @Delete(':id/permissions/:permissionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('admin:roles:write')
  async removePermission(
    @Param('id') roleId: string,
    @Param('permissionId') permissionId: string,
    @CurrentUser() admin: UserIdentity,
  ) {
    await this.rolesService.removePermission(roleId, permissionId, admin.id);
  }

  /**
   * Get users with this role
   * GET /api/v1/admin/roles/:id/users
   */
  @Get(':id/users')
  @Permissions('admin:roles:read')
  async getUsersWithRole(@Param('id') id: string, @CurrentUser() admin: UserIdentity) {
    return this.rolesService.getUsersWithRole(id, admin.id);
  }
}










