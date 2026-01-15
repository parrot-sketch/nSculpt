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
import { UsersService } from '../services/users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { AssignRoleDto } from '../dto/assign-role.dto';
import { UserQueryDto } from '../dto/user-query.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../auth/services/identityContext.service';

/**
 * Users Controller
 * 
 * Admin-only endpoints for user management.
 * 
 * Security:
 * - Requires ADMIN role
 * - Requires admin:* permissions
 * - All actions logged for audit
 */
@Controller('admin/users')
@UseGuards(RolesGuard, PermissionsGuard)
@UseInterceptors(DataAccessLogInterceptor)
@Roles('ADMIN')
@Permissions('admin:*:read', 'admin:*:write')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Create a new user
   * POST /api/v1/admin/users
   */
  @Post()
  @Permissions('admin:users:write')
  async create(@Body() createUserDto: CreateUserDto, @CurrentUser() admin: UserIdentity) {
    return this.usersService.createUser(createUserDto, admin.id);
  }

  /**
   * List users with filters and pagination
   * GET /api/v1/admin/users
   */
  @Get()
  @Permissions('admin:users:read')
  async findAll(@Query() query: UserQueryDto, @CurrentUser() admin: UserIdentity) {
    return this.usersService.listUsers(query, admin.id);
  }

  /**
   * Get user by ID
   * GET /api/v1/admin/users/:id
   */
  @Get(':id')
  @Permissions('admin:users:read')
  async findOne(@Param('id') id: string, @CurrentUser() admin: UserIdentity) {
    return this.usersService.getUserById(id, admin.id);
  }

  /**
   * Update user
   * PATCH /api/v1/admin/users/:id
   */
  @Patch(':id')
  @Permissions('admin:users:write')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() admin: UserIdentity,
  ) {
    return this.usersService.updateUser(id, updateUserDto, admin.id);
  }

  /**
   * Deactivate user (soft delete)
   * DELETE /api/v1/admin/users/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('admin:users:delete')
  async remove(@Param('id') id: string, @CurrentUser() admin: UserIdentity) {
    await this.usersService.deactivateUser(id, admin.id);
  }

  /**
   * Activate user (reactivate deactivated user)
   * PATCH /api/v1/admin/users/:id/activate
   */
  @Patch(':id/activate')
  @Permissions('admin:users:write')
  async activate(@Param('id') id: string, @CurrentUser() admin: UserIdentity) {
    return this.usersService.activateUser(id, admin.id);
  }

  /**
   * Permanently delete user account (hard delete)
   * DELETE /api/v1/admin/users/:id/permanent
   * WARNING: This is irreversible
   */
  @Delete(':id/permanent')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('admin:users:delete')
  async deletePermanent(@Param('id') id: string, @CurrentUser() admin: UserIdentity) {
    await this.usersService.deleteUser(id, admin.id);
  }

  /**
   * Assign role to user
   * POST /api/v1/admin/users/:id/roles
   */
  @Post(':id/roles')
  @Permissions('admin:users:write')
  async assignRole(
    @Param('id') userId: string,
    @Body() assignRoleDto: AssignRoleDto,
    @CurrentUser() admin: UserIdentity,
  ) {
    return this.usersService.assignRole(userId, assignRoleDto, admin.id);
  }

  /**
   * Revoke role from user
   * DELETE /api/v1/admin/users/:id/roles/:roleId
   */
  @Delete(':id/roles/:roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('admin:users:write')
  async revokeRole(
    @Param('id') userId: string,
    @Param('roleId') roleId: string,
    @CurrentUser() admin: UserIdentity,
  ) {
    await this.usersService.revokeRole(userId, roleId, admin.id);
  }

  /**
   * Reset user password
   * POST /api/v1/admin/users/:id/reset-password
   */
  @Post(':id/reset-password')
  @Permissions('admin:users:write')
  async resetPassword(@Param('id') id: string, @CurrentUser() admin: UserIdentity) {
    return this.usersService.resetPassword(id, admin.id);
  }

  /**
   * Get user sessions
   * GET /api/v1/admin/users/:id/sessions
   */
  @Get(':id/sessions')
  @Permissions('admin:users:read')
  async getUserSessions(@Param('id') id: string, @CurrentUser() admin: UserIdentity) {
    return this.usersService.getUserSessions(id, admin.id);
  }
}










