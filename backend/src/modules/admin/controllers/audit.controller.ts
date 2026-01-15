import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuditService } from '../services/audit.service';
import { AccessLogQueryDto } from '../dto/audit/access-log-query.dto';
import { DomainEventQueryDto } from '../dto/audit/domain-event-query.dto';
import { SessionQueryDto } from '../dto/audit/session-query.dto';
import { RevokeSessionDto } from '../dto/audit/revoke-session.dto';
import { HipaaReportQueryDto } from '../dto/audit/hipaa-report-query.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../auth/services/identityContext.service';

/**
 * Audit Controller
 * 
 * Admin-only endpoints for audit and compliance workflows.
 * 
 * Security:
 * - Requires ADMIN role
 * - Requires admin:audit permissions
 * - All actions logged for audit
 */
@Controller('admin/audit')
@UseGuards(RolesGuard, PermissionsGuard)
@UseInterceptors(DataAccessLogInterceptor)
@Roles('ADMIN')
@Permissions('admin:*:read', 'admin:*:write')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * View data access logs
   * GET /api/v1/admin/audit/access-logs
   * AC-001: View Data Access Logs
   */
  @Get('access-logs')
  @Permissions('admin:audit:read')
  async viewAccessLogs(@Query() query: AccessLogQueryDto, @CurrentUser() admin: UserIdentity) {
    return this.auditService.viewAccessLogs(query, admin.id);
  }

  /**
   * View domain events
   * GET /api/v1/admin/audit/domain-events
   * AC-002: View Domain Events
   */
  @Get('domain-events')
  @Permissions('admin:audit:read')
  async viewDomainEvents(@Query() query: DomainEventQueryDto, @CurrentUser() admin: UserIdentity) {
    return this.auditService.viewDomainEvents(query, admin.id);
  }

  /**
   * Get event chain (follow causation links)
   * GET /api/v1/admin/audit/domain-events/:id/chain
   */
  @Get('domain-events/:id/chain')
  @Permissions('admin:audit:read')
  async getEventChain(@Param('id') eventId: string, @CurrentUser() admin: UserIdentity) {
    return this.auditService.getEventChain(eventId, admin.id);
  }

  /**
   * Get correlated events (same workflow)
   * GET /api/v1/admin/audit/domain-events/correlated/:correlationId
   */
  @Get('domain-events/correlated/:correlationId')
  @Permissions('admin:audit:read')
  async getCorrelatedEvents(@Param('correlationId') correlationId: string, @CurrentUser() admin: UserIdentity) {
    return this.auditService.getCorrelatedEvents(correlationId, admin.id);
  }

  /**
   * View user sessions
   * GET /api/v1/admin/audit/sessions
   * AC-003: View User Sessions
   */
  @Get('sessions')
  @Permissions('admin:audit:read')
  async viewSessions(@Query() query: SessionQueryDto, @CurrentUser() admin: UserIdentity) {
    return this.auditService.viewSessions(query, admin.id);
  }

  /**
   * Revoke user session
   * POST /api/v1/admin/audit/sessions/:id/revoke
   * AC-004: Revoke User Session
   */
  @Post('sessions/:id/revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('admin:audit:write')
  async revokeSession(
    @Param('id') sessionId: string,
    @Body() revokeSessionDto: RevokeSessionDto,
    @CurrentUser() admin: UserIdentity,
  ) {
    await this.auditService.revokeSession(sessionId, revokeSessionDto.reason, admin.id);
  }

  /**
   * Generate HIPAA access report
   * GET /api/v1/admin/audit/hipaa-report
   * AC-005: Generate HIPAA Access Report
   */
  @Get('hipaa-report')
  @Permissions('admin:audit:read')
  async generateHipaaReport(@Query() query: HipaaReportQueryDto, @CurrentUser() admin: UserIdentity) {
    return this.auditService.generateHipaaReport(query, admin.id);
  }
}









