import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { SystemHealthService } from '../services/system-health.service';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../auth/services/identityContext.service';

/**
 * System Health Controller
 * 
 * Admin-only endpoints for system health monitoring.
 * CD-003: View System Health
 * 
 * Security:
 * - Requires ADMIN role
 * - Requires admin:* permissions
 * - All actions logged for audit
 */
@Controller('admin/system-health')
@UseGuards(RolesGuard, PermissionsGuard)
@UseInterceptors(DataAccessLogInterceptor)
@Roles('ADMIN')
@Permissions('admin:*:read')
export class SystemHealthController {
  constructor(private readonly systemHealthService: SystemHealthService) {}

  /**
   * Get system health metrics
   * GET /api/v1/admin/system-health
   * CD-003: View System Health
   */
  @Get()
  @Permissions('admin:system:read')
  async getSystemHealth(@CurrentUser() admin: UserIdentity) {
    return this.systemHealthService.getSystemHealth(admin.id);
  }
}









