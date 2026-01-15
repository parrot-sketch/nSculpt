import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DataAccessLogService } from '../services/dataAccessLog.service';
import { AuditLogQueryDto } from '../dto/audit-log-query.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../auth/services/identityContext.service';

/**
 * Audit Controller
 * 
 * Admin-only endpoints for querying audit logs.
 * 
 * Security:
 * - Requires ADMIN role
 * - Requires admin:audit:read permission
 * - All queries are logged for audit
 */
@Controller('admin/audit-logs')
@UseGuards(RolesGuard, PermissionsGuard)
@Roles('ADMIN')
@Permissions('admin:audit:read')
export class AuditController {
  constructor(private readonly dataAccessLogService: DataAccessLogService) { }

  /**
   * Query audit logs
   * GET /api/v1/admin/audit-logs
   * 
   * Filters:
   * - userId: Filter by user ID
   * - resourceType: Filter by resource type (e.g., 'User', 'Patient')
   * - action: Filter by action (e.g., 'READ', 'WRITE', 'DELETE')
   * - sessionId: Filter by session ID
   * - startDate: Filter by date range start
   * - endDate: Filter by date range end
   * - skip: Pagination offset (default: 0)
   * - take: Pagination limit (default: 50, max: 100)
   */
  @Get()
  async queryAuditLogs(@Query() query: AuditLogQueryDto, @CurrentUser() admin: UserIdentity) {
    return this.dataAccessLogService.queryLogs({
      userId: query.userId,
      resourceType: query.resourceType,
      resourceId: query.resourceId,
      action: query.action,
      sessionId: query.sessionId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      skip: query.skip || 0,
      take: Math.min(query.take || 50, 100), // Cap at 100
    });
  }
}
