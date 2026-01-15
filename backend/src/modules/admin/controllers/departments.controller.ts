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
import { DepartmentsService } from '../services/departments.service';
import { CreateDepartmentDto } from '../dto/departments/create-department.dto';
import { UpdateDepartmentDto } from '../dto/departments/update-department.dto';
import { DepartmentQueryDto } from '../dto/departments/department-query.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../auth/services/identityContext.service';

/**
 * Departments Controller
 * 
 * Admin-only endpoints for department management.
 * SC-001: Manage Departments
 * 
 * Security:
 * - Requires ADMIN role
 * - Requires admin:* permissions
 * - All actions logged for audit
 */
@Controller('admin/departments')
@UseGuards(RolesGuard, PermissionsGuard)
@UseInterceptors(DataAccessLogInterceptor)
@Roles('ADMIN')
@Permissions('admin:*:read', 'admin:*:write')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  /**
   * Create a new department
   * POST /api/v1/admin/departments
   * SC-001: Create New Department
   */
  @Post()
  @Permissions('admin:system:write')
  async create(@Body() createDepartmentDto: CreateDepartmentDto, @CurrentUser() admin: UserIdentity) {
    return this.departmentsService.createDepartment(createDepartmentDto, admin.id);
  }

  /**
   * List departments with filters and pagination
   * GET /api/v1/admin/departments
   */
  @Get()
  @Permissions('admin:system:read')
  async findAll(@Query() query: DepartmentQueryDto, @CurrentUser() admin: UserIdentity) {
    return this.departmentsService.listDepartments(query, admin.id);
  }

  /**
   * Get department by ID
   * GET /api/v1/admin/departments/:id
   */
  @Get(':id')
  @Permissions('admin:system:read')
  async findOne(@Param('id') id: string, @CurrentUser() admin: UserIdentity) {
    return this.departmentsService.getDepartmentById(id, admin.id);
  }

  /**
   * Update department
   * PATCH /api/v1/admin/departments/:id
   * SC-001: Update Department Information
   */
  @Patch(':id')
  @Permissions('admin:system:write')
  async update(
    @Param('id') id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
    @CurrentUser() admin: UserIdentity,
  ) {
    return this.departmentsService.updateDepartment(id, updateDepartmentDto, admin.id);
  }

  /**
   * Deactivate department
   * DELETE /api/v1/admin/departments/:id
   * SC-001: Deactivate Department
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('admin:system:write')
  async remove(@Param('id') id: string, @CurrentUser() admin: UserIdentity) {
    await this.departmentsService.deactivateDepartment(id, admin.id);
  }
}









