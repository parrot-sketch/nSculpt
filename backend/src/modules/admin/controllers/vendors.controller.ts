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
import { VendorsService } from '../services/vendors.service';
import { CreateVendorDto } from '../dto/vendors/create-vendor.dto';
import { UpdateVendorDto } from '../dto/vendors/update-vendor.dto';
import { VendorQueryDto } from '../dto/vendors/vendor-query.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../auth/services/identityContext.service';

/**
 * Vendors Controller
 * 
 * Admin-only endpoints for vendor management.
 * SC-004: Manage Vendors
 * 
 * Security:
 * - Requires ADMIN role
 * - Requires admin:* permissions
 * - All actions logged for audit
 */
@Controller('admin/vendors')
@UseGuards(RolesGuard, PermissionsGuard)
@UseInterceptors(DataAccessLogInterceptor)
@Roles('ADMIN')
@Permissions('admin:*:read', 'admin:*:write')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  /**
   * Create a new vendor
   * POST /api/v1/admin/vendors
   * SC-004: Create New Vendor
   */
  @Post()
  @Permissions('admin:system:write')
  async create(@Body() createVendorDto: CreateVendorDto, @CurrentUser() admin: UserIdentity) {
    return this.vendorsService.createVendor(createVendorDto, admin.id);
  }

  /**
   * List vendors with filters and pagination
   * GET /api/v1/admin/vendors
   */
  @Get()
  @Permissions('admin:system:read')
  async findAll(@Query() query: VendorQueryDto, @CurrentUser() admin: UserIdentity) {
    return this.vendorsService.listVendors(query, admin.id);
  }

  /**
   * Get vendor by ID
   * GET /api/v1/admin/vendors/:id
   */
  @Get(':id')
  @Permissions('admin:system:read')
  async findOne(@Param('id') id: string, @CurrentUser() admin: UserIdentity) {
    return this.vendorsService.getVendorById(id, admin.id);
  }

  /**
   * Update vendor
   * PATCH /api/v1/admin/vendors/:id
   * SC-004: Update Vendor Information
   */
  @Patch(':id')
  @Permissions('admin:system:write')
  async update(
    @Param('id') id: string,
    @Body() updateVendorDto: UpdateVendorDto,
    @CurrentUser() admin: UserIdentity,
  ) {
    return this.vendorsService.updateVendor(id, updateVendorDto, admin.id);
  }

  /**
   * Deactivate vendor
   * DELETE /api/v1/admin/vendors/:id
   * SC-004: Deactivate Vendor
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('admin:system:write')
  async remove(@Param('id') id: string, @CurrentUser() admin: UserIdentity) {
    await this.vendorsService.deactivateVendor(id, admin.id);
  }
}









