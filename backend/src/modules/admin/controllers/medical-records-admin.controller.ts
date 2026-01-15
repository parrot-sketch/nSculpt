import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MedicalRecordsAdminService } from '../services/medical-records-admin.service';
import { MergeRecordsDto } from '../dto/medical-records/merge-records.dto';
import { ReverseMergeDto } from '../dto/medical-records/reverse-merge.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../auth/services/identityContext.service';

/**
 * Medical Records Admin Controller
 * 
 * Admin-only endpoints for medical record management operations.
 * CD-001: Merge Medical Records
 * CD-002: Reverse Medical Record Merge
 * 
 * Security:
 * - Requires ADMIN role
 * - Requires admin:* permissions
 * - All actions logged for audit
 */
@Controller('admin/medical-records')
@UseGuards(RolesGuard, PermissionsGuard)
@UseInterceptors(DataAccessLogInterceptor)
@Roles('ADMIN')
@Permissions('admin:*:read', 'admin:*:write')
export class MedicalRecordsAdminController {
  constructor(private readonly medicalRecordsAdminService: MedicalRecordsAdminService) {}

  /**
   * Merge medical records
   * POST /api/v1/admin/medical-records/:sourceRecordId/merge
   * CD-001: Merge Medical Records
   */
  @Post(':sourceRecordId/merge')
  @Permissions('admin:medical_records:write')
  async mergeRecords(
    @Param('sourceRecordId') sourceRecordId: string,
    @Body() mergeRecordsDto: MergeRecordsDto,
    @CurrentUser() admin: UserIdentity,
  ) {
    return this.medicalRecordsAdminService.mergeRecords(sourceRecordId, mergeRecordsDto, admin.id);
  }

  /**
   * Get merge history for a record
   * GET /api/v1/admin/medical-records/:recordId/merge-history
   */
  @Get(':recordId/merge-history')
  @Permissions('admin:medical_records:read')
  async getMergeHistory(@Param('recordId') recordId: string, @CurrentUser() admin: UserIdentity) {
    return this.medicalRecordsAdminService.getMergeHistory(recordId, admin.id);
  }

  /**
   * Reverse a medical record merge
   * POST /api/v1/admin/medical-records/merge-history/:mergeId/reverse
   * CD-002: Reverse Medical Record Merge
   */
  @Post('merge-history/:mergeId/reverse')
  @HttpCode(HttpStatus.OK)
  @Permissions('admin:medical_records:write')
  async reverseMerge(
    @Param('mergeId') mergeId: string,
    @Body() reverseMergeDto: ReverseMergeDto,
    @CurrentUser() admin: UserIdentity,
  ) {
    return this.medicalRecordsAdminService.reverseMerge(mergeId, reverseMergeDto, admin.id);
  }
}









