import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { DataAccessLogService } from '../../audit/services/dataAccessLog.service';

/**
 * Admin Service
 * 
 * Business logic for admin dashboard and system overview.
 */
@Injectable()
export class AdminService {
  private prisma: PrismaClient;

  constructor(
    private readonly dataAccessLogService: DataAccessLogService,
  ) {
    this.prisma = getPrismaClient();
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(adminId: string) {
    // Get user statistics
    const [totalUsers, activeUsers] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
    ]);

    // Get role statistics
    const [totalRoles, activeRoles] = await Promise.all([
      this.prisma.role.count(),
      this.prisma.role.count({ where: { isActive: true } }),
    ]);

    // Get permission statistics
    const totalPermissions = await this.prisma.permission.count();

    // Get recent activity (last 10 domain events)
    const recentEvents = await this.prisma.domainEvent.findMany({
      take: 10,
      orderBy: { occurredAt: 'desc' },
      select: {
        id: true,
        eventType: true,
        aggregateType: true,
        occurredAt: true,
        createdBy: true,
      },
    });

    // Format recent activity
    const recentActivity = recentEvents.map((event) => ({
      id: event.id,
      type: event.eventType,
      description: `${event.eventType} - ${event.aggregateType}`,
      timestamp: event.occurredAt.toISOString(),
    }));

    // Log access
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'Dashboard',
      resourceId: 'admin',
      action: 'READ',
      reason: 'Admin viewed dashboard statistics',
      accessedPHI: false,
      success: true,
    });

    return {
      totalUsers,
      activeUsers,
      totalRoles,
      activeRoles,
      totalPermissions,
      recentActivity,
    };
  }
}










