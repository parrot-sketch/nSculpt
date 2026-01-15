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
import { CategoriesService } from '../services/categories.service';
import { CreateCategoryDto } from '../dto/categories/create-category.dto';
import { UpdateCategoryDto } from '../dto/categories/update-category.dto';
import { CategoryQueryDto } from '../dto/categories/category-query.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../auth/services/identityContext.service';

/**
 * Categories Controller
 * 
 * Admin-only endpoints for inventory category management.
 * SC-003: Manage Inventory Categories
 * 
 * Security:
 * - Requires ADMIN role
 * - Requires admin:* permissions
 * - All actions logged for audit
 */
@Controller('admin/categories')
@UseGuards(RolesGuard, PermissionsGuard)
@UseInterceptors(DataAccessLogInterceptor)
@Roles('ADMIN')
@Permissions('admin:*:read', 'admin:*:write')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * Create a new inventory category
   * POST /api/v1/admin/categories
   * SC-003: Create New Inventory Category
   */
  @Post()
  @Permissions('admin:system:write')
  async create(@Body() createCategoryDto: CreateCategoryDto, @CurrentUser() admin: UserIdentity) {
    return this.categoriesService.createCategory(createCategoryDto, admin.id);
  }

  /**
   * List categories with filters and pagination
   * GET /api/v1/admin/categories
   */
  @Get()
  @Permissions('admin:system:read')
  async findAll(@Query() query: CategoryQueryDto, @CurrentUser() admin: UserIdentity) {
    return this.categoriesService.listCategories(query, admin.id);
  }

  /**
   * Get category by ID
   * GET /api/v1/admin/categories/:id
   */
  @Get(':id')
  @Permissions('admin:system:read')
  async findOne(@Param('id') id: string, @CurrentUser() admin: UserIdentity) {
    return this.categoriesService.getCategoryById(id, admin.id);
  }

  /**
   * Update category
   * PATCH /api/v1/admin/categories/:id
   * SC-003: Update Inventory Category Information
   */
  @Patch(':id')
  @Permissions('admin:system:write')
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @CurrentUser() admin: UserIdentity,
  ) {
    return this.categoriesService.updateCategory(id, updateCategoryDto, admin.id);
  }

  /**
   * Deactivate category
   * DELETE /api/v1/admin/categories/:id
   * SC-003: Deactivate Inventory Category
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('admin:system:write')
  async remove(@Param('id') id: string, @CurrentUser() admin: UserIdentity) {
    await this.categoriesService.deactivateCategory(id, admin.id);
  }
}









