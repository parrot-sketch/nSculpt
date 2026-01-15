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
import { FeeSchedulesService } from '../services/fee-schedules.service';
import { CreateFeeScheduleDto } from '../dto/fee-schedules/create-fee-schedule.dto';
import { UpdateFeeScheduleDto } from '../dto/fee-schedules/update-fee-schedule.dto';
import { FeeScheduleQueryDto } from '../dto/fee-schedules/fee-schedule-query.dto';
import { CreateFeeScheduleItemDto } from '../dto/fee-schedules/create-fee-schedule-item.dto';
import { UpdateFeeScheduleItemDto } from '../dto/fee-schedules/update-fee-schedule-item.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../auth/services/identityContext.service';

/**
 * Fee Schedules Controller
 * 
 * Admin-only endpoints for fee schedule management.
 * SC-007: Manage Fee Schedules
 * 
 * Security:
 * - Requires ADMIN role
 * - Requires admin:* permissions
 * - All actions logged for audit
 */
@Controller('admin/fee-schedules')
@UseGuards(RolesGuard, PermissionsGuard)
@UseInterceptors(DataAccessLogInterceptor)
@Roles('ADMIN')
@Permissions('admin:*:read', 'admin:*:write')
export class FeeSchedulesController {
  constructor(private readonly feeSchedulesService: FeeSchedulesService) {}

  /**
   * Create a new fee schedule
   * POST /api/v1/admin/fee-schedules
   * SC-007: Create New Fee Schedule
   */
  @Post()
  @Permissions('admin:system:write')
  async create(@Body() createFeeScheduleDto: CreateFeeScheduleDto, @CurrentUser() admin: UserIdentity) {
    return this.feeSchedulesService.createFeeSchedule(createFeeScheduleDto, admin.id);
  }

  /**
   * List fee schedules with filters and pagination
   * GET /api/v1/admin/fee-schedules
   */
  @Get()
  @Permissions('admin:system:read')
  async findAll(@Query() query: FeeScheduleQueryDto, @CurrentUser() admin: UserIdentity) {
    return this.feeSchedulesService.listFeeSchedules(query, admin.id);
  }

  /**
   * Get fee schedule by ID
   * GET /api/v1/admin/fee-schedules/:id
   */
  @Get(':id')
  @Permissions('admin:system:read')
  async findOne(@Param('id') id: string, @CurrentUser() admin: UserIdentity) {
    return this.feeSchedulesService.getFeeScheduleById(id, admin.id);
  }

  /**
   * Update fee schedule
   * PATCH /api/v1/admin/fee-schedules/:id
   * SC-007: Update Fee Schedule Information
   */
  @Patch(':id')
  @Permissions('admin:system:write')
  async update(
    @Param('id') id: string,
    @Body() updateFeeScheduleDto: UpdateFeeScheduleDto,
    @CurrentUser() admin: UserIdentity,
  ) {
    return this.feeSchedulesService.updateFeeSchedule(id, updateFeeScheduleDto, admin.id);
  }

  /**
   * Deactivate fee schedule
   * DELETE /api/v1/admin/fee-schedules/:id
   * SC-007: Deactivate Fee Schedule
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('admin:system:write')
  async remove(@Param('id') id: string, @CurrentUser() admin: UserIdentity) {
    await this.feeSchedulesService.deactivateFeeSchedule(id, admin.id);
  }

  /**
   * Add item to fee schedule
   * POST /api/v1/admin/fee-schedules/:id/items
   * SC-007: Add Fee Schedule Item
   */
  @Post(':id/items')
  @Permissions('admin:system:write')
  async addItem(
    @Param('id') scheduleId: string,
    @Body() createItemDto: CreateFeeScheduleItemDto,
    @CurrentUser() admin: UserIdentity,
  ) {
    return this.feeSchedulesService.addFeeScheduleItem(scheduleId, createItemDto, admin.id);
  }

  /**
   * Update fee schedule item
   * PATCH /api/v1/admin/fee-schedules/:scheduleId/items/:itemId
   * SC-007: Update Fee Schedule Item
   */
  @Patch(':scheduleId/items/:itemId')
  @Permissions('admin:system:write')
  async updateItem(
    @Param('itemId') itemId: string,
    @Body() updateItemDto: UpdateFeeScheduleItemDto,
    @CurrentUser() admin: UserIdentity,
  ) {
    return this.feeSchedulesService.updateFeeScheduleItem(itemId, updateItemDto, admin.id);
  }

  /**
   * Remove fee schedule item
   * DELETE /api/v1/admin/fee-schedules/:scheduleId/items/:itemId
   * SC-007: Remove Fee Schedule Item
   */
  @Delete(':scheduleId/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('admin:system:write')
  async removeItem(@Param('itemId') itemId: string, @CurrentUser() admin: UserIdentity) {
    await this.feeSchedulesService.removeFeeScheduleItem(itemId, admin.id);
  }
}









