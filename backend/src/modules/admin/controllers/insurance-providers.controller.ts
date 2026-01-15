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
import { InsuranceProvidersService } from '../services/insurance-providers.service';
import { CreateInsuranceProviderDto } from '../dto/insurance-providers/create-insurance-provider.dto';
import { UpdateInsuranceProviderDto } from '../dto/insurance-providers/update-insurance-provider.dto';
import { InsuranceProviderQueryDto } from '../dto/insurance-providers/insurance-provider-query.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../auth/services/identityContext.service';

/**
 * Insurance Providers Controller
 * 
 * Admin-only endpoints for insurance provider management.
 * SC-006: Manage Insurance Providers
 * 
 * Security:
 * - Requires ADMIN role
 * - Requires admin:* permissions
 * - All actions logged for audit
 */
@Controller('admin/insurance-providers')
@UseGuards(RolesGuard, PermissionsGuard)
@UseInterceptors(DataAccessLogInterceptor)
@Roles('ADMIN')
@Permissions('admin:*:read', 'admin:*:write')
export class InsuranceProvidersController {
  constructor(private readonly insuranceProvidersService: InsuranceProvidersService) {}

  /**
   * Create a new insurance provider
   * POST /api/v1/admin/insurance-providers
   * SC-006: Create New Insurance Provider
   */
  @Post()
  @Permissions('admin:system:write')
  async create(@Body() createInsuranceProviderDto: CreateInsuranceProviderDto, @CurrentUser() admin: UserIdentity) {
    return this.insuranceProvidersService.createInsuranceProvider(createInsuranceProviderDto, admin.id);
  }

  /**
   * List insurance providers with filters and pagination
   * GET /api/v1/admin/insurance-providers
   */
  @Get()
  @Permissions('admin:system:read')
  async findAll(@Query() query: InsuranceProviderQueryDto, @CurrentUser() admin: UserIdentity) {
    return this.insuranceProvidersService.listInsuranceProviders(query, admin.id);
  }

  /**
   * Get insurance provider by ID
   * GET /api/v1/admin/insurance-providers/:id
   */
  @Get(':id')
  @Permissions('admin:system:read')
  async findOne(@Param('id') id: string, @CurrentUser() admin: UserIdentity) {
    return this.insuranceProvidersService.getInsuranceProviderById(id, admin.id);
  }

  /**
   * Update insurance provider
   * PATCH /api/v1/admin/insurance-providers/:id
   * SC-006: Update Insurance Provider Information
   */
  @Patch(':id')
  @Permissions('admin:system:write')
  async update(
    @Param('id') id: string,
    @Body() updateInsuranceProviderDto: UpdateInsuranceProviderDto,
    @CurrentUser() admin: UserIdentity,
  ) {
    return this.insuranceProvidersService.updateInsuranceProvider(id, updateInsuranceProviderDto, admin.id);
  }

  /**
   * Deactivate insurance provider
   * DELETE /api/v1/admin/insurance-providers/:id
   * SC-006: Deactivate Insurance Provider
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('admin:system:write')
  async remove(@Param('id') id: string, @CurrentUser() admin: UserIdentity) {
    await this.insuranceProvidersService.deactivateInsuranceProvider(id, admin.id);
  }
}









