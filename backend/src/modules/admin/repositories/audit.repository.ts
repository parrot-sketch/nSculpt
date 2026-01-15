import { Injectable } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';

/**
 * Audit Repository
 * 
 * Data access layer for audit-related queries.
 * Read-only access to audit tables (immutable records).
 */
@Injectable()
export class AuditRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Query data access logs with filters
   */
  async findAccessLogs(params: {
    userId?: string;
    resourceType?: string;
    resourceId?: string;
    action?: string;
    accessedPHI?: boolean;
    success?: boolean;
    startDate?: Date;
    endDate?: Date;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.DataAccessLogWhereInput = {};

    if (params.userId) {
      where.userId = params.userId;
    }

    if (params.resourceType) {
      where.resourceType = params.resourceType;
    }

    if (params.resourceId) {
      where.resourceId = params.resourceId;
    }

    if (params.action) {
      where.action = params.action;
    }

    if (params.accessedPHI !== undefined) {
      where.accessedPHI = params.accessedPHI;
    }

    if (params.success !== undefined) {
      where.success = params.success;
    }

    if (params.startDate || params.endDate) {
      where.accessedAt = {};
      if (params.startDate) {
        where.accessedAt.gte = params.startDate;
      }
      if (params.endDate) {
        where.accessedAt.lte = params.endDate;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.dataAccessLog.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { accessedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.dataAccessLog.count({ where }),
    ]);

    return {
      data,
      total,
      skip: params.skip || 0,
      take: params.take || 50,
    };
  }

  /**
   * Query domain events with filters
   */
  async findDomainEvents(params: {
    eventType?: string;
    domain?: string;
    aggregateId?: string;
    aggregateType?: string;
    createdBy?: string;
    correlationId?: string;
    startDate?: Date;
    endDate?: Date;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.DomainEventWhereInput = {};

    if (params.eventType) {
      where.eventType = { contains: params.eventType, mode: 'insensitive' };
    }

    if (params.domain) {
      where.domain = params.domain as any;
    }

    if (params.aggregateId) {
      where.aggregateId = params.aggregateId;
    }

    if (params.aggregateType) {
      where.aggregateType = params.aggregateType;
    }

    if (params.createdBy) {
      where.createdBy = params.createdBy;
    }

    if (params.correlationId) {
      where.correlationId = params.correlationId;
    }

    if (params.startDate || params.endDate) {
      where.occurredAt = {};
      if (params.startDate) {
        where.occurredAt.gte = params.startDate;
      }
      if (params.endDate) {
        where.occurredAt.lte = params.endDate;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.domainEvent.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { occurredAt: 'desc' },
        include: {
          creator: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.domainEvent.count({ where }),
    ]);

    return {
      data,
      total,
      skip: params.skip || 0,
      take: params.take || 50,
    };
  }

  /**
   * Query sessions with filters
   */
  async findSessions(params: {
    userId?: string;
    active?: boolean;
    revoked?: boolean;
    startDate?: Date;
    endDate?: Date;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.SessionWhereInput = {};

    if (params.userId) {
      where.userId = params.userId;
    }

    if (params.revoked !== undefined) {
      if (params.revoked) {
        where.revokedAt = { not: null };
      } else {
        where.revokedAt = null;
      }
    }

    if (params.active !== undefined) {
      if (params.active) {
        where.revokedAt = null;
        where.expiresAt = { gte: new Date() };
      }
    }

    if (params.startDate || params.endDate) {
      where.startedAt = {};
      if (params.startDate) {
        where.startedAt.gte = params.startDate;
      }
      if (params.endDate) {
        where.startedAt.lte = params.endDate;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.session.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { startedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          revokedByUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.session.count({ where }),
    ]);

    return {
      data,
      total,
      skip: params.skip || 0,
      take: params.take || 50,
    };
  }

  /**
   * Get HIPAA access report (PHI access events)
   */
  async getHipaaAccessReport(params: {
    startDate: Date;
    endDate: Date;
    userId?: string;
    resourceType?: string;
  }) {
    const where: Prisma.DataAccessLogWhereInput = {
      accessedPHI: true,
      accessedAt: {
        gte: params.startDate,
        lte: params.endDate,
      },
    };

    if (params.userId) {
      where.userId = params.userId;
    }

    if (params.resourceType) {
      where.resourceType = params.resourceType;
    }

    const logs = await this.prisma.dataAccessLog.findMany({
      where,
      orderBy: { accessedAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Calculate summary statistics
    const totalAccesses = logs.length;
    const uniqueUsers = new Set(logs.map(log => log.userId)).size;
    const byResourceType: Record<string, number> = {};
    const byAction: Record<string, number> = {};

    logs.forEach(log => {
      byResourceType[log.resourceType] = (byResourceType[log.resourceType] || 0) + 1;
      byAction[log.action] = (byAction[log.action] || 0) + 1;
    });

    return {
      logs,
      summary: {
        totalAccesses,
        uniqueUsers,
        byResourceType,
        byAction,
        dateRange: {
          start: params.startDate,
          end: params.endDate,
        },
      },
    };
  }
}









