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
import { BillingCodesService } from '../services/billing-codes.service';
import { CreateBillingCodeDto } from '../dto/billing-codes/create-billing-code.dto';
import { UpdateBillingCodeDto } from '../dto/billing-codes/update-billing-code.dto';
import { BillingCodeQueryDto } from '../dto/billing-codes/billing-code-query.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../auth/services/identityContext.service';

/**
 * Billing Codes Controller
 * 
 * Admin-only endpoints for billing code management.
 * SC-005: Manage Billing Codes
 * 
 * Security:
 * - Requires ADMIN role
 * - Requires admin:* permissions
 * - All actions logged for audit
 */
@Controller('admin/billing-codes')
@UseGuards(RolesGuard, PermissionsGuard)
@UseInterceptors(DataAccessLogInterceptor)
@Roles('ADMIN')
@Permissions('admin:*:read', 'admin:*:write')
export class BillingCodesController {
  constructor(private readonly billingCodesService: BillingCodesService) {}

  /**
   * Create a new billing code
   * POST /api/v1/admin/billing-codes
   * SC-005: Create New Billing Code
   */
  @Post()
  @Permissions('admin:system:write')
  async create(@Body() createBillingCodeDto: CreateBillingCodeDto, @CurrentUser() admin: UserIdentity) {
    return this.billingCodesService.createBillingCode(createBillingCodeDto, admin.id);
  }

  /**
   * List billing codes with filters and pagination
   * GET /api/v1/admin/billing-codes
   */
  @Get()
  @Permissions('admin:system:read')
  async findAll(@Query() query: BillingCodeQueryDto, @CurrentUser() admin: UserIdentity) {
    return this.billingCodesService.listBillingCodes(query, admin.id);
  }

  /**
   * Get billing code by ID
   * GET /api/v1/admin/billing-codes/:id
   */
  @Get(':id')
  @Permissions('admin:system:read')
  async findOne(@Param('id') id: string, @CurrentUser() admin: UserIdentity) {
    return this.billingCodesService.getBillingCodeById(id, admin.id);
  }

  /**
   * Update billing code
   * PATCH /api/v1/admin/billing-codes/:id
   * SC-005: Update Billing Code Information
   */
  @Patch(':id')
  @Permissions('admin:system:write')
  async update(
    @Param('id') id: string,
    @Body() updateBillingCodeDto: UpdateBillingCodeDto,
    @CurrentUser() admin: UserIdentity,
  ) {
    return this.billingCodesService.updateBillingCode(id, updateBillingCodeDto, admin.id);
  }

  /**
   * Deactivate billing code
   * DELETE /api/v1/admin/billing-codes/:id
   * SC-005: Deactivate Billing Code
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('admin:system:write')
  async remove(@Param('id') id: string, @CurrentUser() admin: UserIdentity) {
    await this.billingCodesService.deactivateBillingCode(id, admin.id);
  }
}









