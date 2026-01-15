import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { DataAccessLogService } from '../../audit/services/dataAccessLog.service';
import { CorrelationService } from '../../../services/correlation.service';

/**
 * System Health Service
 * 
 * Business logic for system health monitoring.
 * CD-003: View System Health
 */
@Injectable()
export class SystemHealthService {
  private prisma: PrismaClient;
  private readonly startTime: Date;

  constructor(
    private readonly dataAccessLogService: DataAccessLogService,
    private readonly correlationService: CorrelationService,
  ) {
    this.prisma = getPrismaClient();
    this.startTime = new Date();
  }

  /**
   * Get system health metrics
   * CD-003: View System Health
   */
  async getSystemHealth(adminId: string) {
    const startTime = Date.now();

    // Test database connection
    let databaseStatus = 'unknown';
    let databaseResponseTime: number | null = null;
    try {
      const dbStart = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      databaseResponseTime = Date.now() - dbStart;
      databaseStatus = 'connected';
    } catch (error) {
      databaseStatus = 'disconnected';
    }

    // Get active user count
    const activeUserCount = await this.prisma.user.count({
      where: { isActive: true },
    });

    // Get active session count
    const activeSessionCount = await this.prisma.session.count({
      where: {
        revokedAt: null,
        expiresAt: { gte: new Date() },
      },
    });

    // Get recent error count (last hour) - from domain events or access logs
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentErrorCount = await this.prisma.dataAccessLog.count({
      where: {
        success: false,
        accessedAt: { gte: oneHourAgo },
      },
    });

    // Get recent critical events (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCriticalEvents = await this.prisma.domainEvent.findMany({
      where: {
        domain: 'AUDIT',
        eventType: {
          contains: 'Error',
        },
        occurredAt: { gte: oneDayAgo },
      },
      take: 10,
      orderBy: { occurredAt: 'desc' },
      select: {
        id: true,
        eventType: true,
        occurredAt: true,
        payload: true,
      },
    });

    // Calculate system uptime
    const uptimeMs = Date.now() - this.startTime.getTime();
    const uptimeSeconds = Math.floor(uptimeMs / 1000);
    const uptimeMinutes = Math.floor(uptimeSeconds / 60);
    const uptimeHours = Math.floor(uptimeMinutes / 60);
    const uptimeDays = Math.floor(uptimeHours / 24);

    const uptime = {
      days: uptimeDays,
      hours: uptimeHours % 24,
      minutes: uptimeMinutes % 60,
      seconds: uptimeSeconds % 60,
      totalSeconds: uptimeSeconds,
    };

    // Calculate API response time (this request)
    const apiResponseTime = Date.now() - startTime;

    const health = {
      status: databaseStatus === 'connected' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      database: {
        status: databaseStatus,
        responseTimeMs: databaseResponseTime,
      },
      metrics: {
        activeUsers: activeUserCount,
        activeSessions: activeSessionCount,
        recentErrors: recentErrorCount,
        apiResponseTimeMs: apiResponseTime,
      },
      uptime,
      recentCriticalEvents: recentCriticalEvents.map(event => ({
        id: event.id,
        type: event.eventType,
        occurredAt: event.occurredAt,
        payload: event.payload,
      })),
    };

    // Log access
    const context = this.correlationService.getContext();
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'SystemHealth',
      resourceId: 'metrics',
      action: 'READ',
      sessionId: context.sessionId,
      reason: 'Admin viewed system health metrics',
      accessedPHI: false,
      success: true,
    });

    return health;
  }
}









