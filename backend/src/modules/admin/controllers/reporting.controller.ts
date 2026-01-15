import { Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ReportingService } from '../services/reporting.service';
import { UserActivityQueryDto } from '../dto/reports/user-activity-query.dto';
import { PermissionUsageQueryDto } from '../dto/reports/permission-usage-query.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../auth/services/identityContext.service';

/**
 * Reporting Controller
 * 
 * Admin-only endpoints for reporting workflows.
 * DR-002: View User Activity Report
 * DR-003: View Permission Usage Report
 * 
 * Security:
 * - Requires ADMIN role
 * - Requires admin:* permissions
 * - All actions logged for audit
 */
@Controller('admin/reports')
@UseGuards(RolesGuard, PermissionsGuard)
@UseInterceptors(DataAccessLogInterceptor)
@Roles('ADMIN')
@Permissions('admin:*:read')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  /**
   * Generate user activity report
   * GET /api/v1/admin/reports/user-activity
   * DR-002: View User Activity Report
   */
  @Get('user-activity')
  @Permissions('admin:reports:read')
  async generateUserActivityReport(
    @Query() query: UserActivityQueryDto,
    @CurrentUser() admin: UserIdentity,
  ) {
    return this.reportingService.generateUserActivityReport(query, admin.id);
  }

  /**
   * Generate permission usage report
   * GET /api/v1/admin/reports/permission-usage
   * DR-003: View Permission Usage Report
   */
  @Get('permission-usage')
  @Permissions('admin:reports:read')
  async generatePermissionUsageReport(
    @Query() query: PermissionUsageQueryDto,
    @CurrentUser() admin: UserIdentity,
  ) {
    return this.reportingService.generatePermissionUsageReport(query, admin.id);
  }
}









