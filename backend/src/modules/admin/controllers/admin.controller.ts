import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { AdminService } from '../services/admin.service';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../auth/services/identityContext.service';

/**
 * Admin Controller
 * 
 * Admin dashboard and system overview endpoints.
 */
@Controller('admin')
@UseGuards(RolesGuard, PermissionsGuard)
@UseInterceptors(DataAccessLogInterceptor)
@Roles('ADMIN')
@Permissions('admin:*:read')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Get admin dashboard statistics
   * GET /api/v1/admin/dashboard
   */
  @Get('dashboard')
  @Permissions('admin:*:read')
  async getDashboard(@CurrentUser() admin: UserIdentity) {
    return this.adminService.getDashboardStats(admin.id);
  }
}










