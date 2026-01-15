import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { getPrismaClient } from '../../../prisma/client';

export interface LogDataAccessParams {
  userId: string;
  resourceType: string;
  resourceId: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  reason?: string;
  justification?: string;
  accessedPHI: boolean;
  success: boolean;
  errorMessage?: string;
}

@Injectable()
export class DataAccessLogService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Convert a string to a deterministic UUID format
   * Used for non-UUID resourceIds (like routes, system resources)
   * Uses SHA-256 hash to generate a consistent UUID-like string
   */
  private stringToUuid(input: string): string {
    // UUID regex pattern
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    // If already a valid UUID, return as-is
    if (uuidRegex.test(input)) {
      return input;
    }

    // Generate deterministic UUID from string using SHA-256
    const hash = createHash('sha256').update(input).digest('hex');
    
    // Format as UUID: 8-4-4-4-12
    return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
  }

  /**
   * Log data access for HIPAA compliance
   * 
   * CRITICAL: This table is immutable - no updates or deletes allowed
   */
  async log(params: LogDataAccessParams) {
    // Convert resourceId to UUID format if it's not already a UUID
    // This handles cases where routes or system resources are passed as strings
    const resourceIdUuid = this.stringToUuid(params.resourceId);

    return await this.prisma.dataAccessLog.create({
      data: {
        userId: params.userId,
        resourceType: params.resourceType,
        resourceId: resourceIdUuid,
        action: params.action,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        sessionId: params.sessionId,
        reason: params.reason,
        justification: params.justification,
        accessedPHI: params.accessedPHI,
        success: params.success,
        errorMessage: params.errorMessage,
        accessedAt: new Date(),
      },
    });
  }

  /**
   * Query access logs for audit purposes
   */
  async queryLogs(filters: {
    userId?: string;
    resourceType?: string;
    resourceId?: string;
    action?: string;
    sessionId?: string;
    accessedPHI?: boolean;
    startDate?: Date;
    endDate?: Date;
    skip?: number;
    take?: number;
  }) {
    const [logs, total] = await Promise.all([
      this.prisma.dataAccessLog.findMany({
        where: {
          userId: filters.userId,
          resourceType: filters.resourceType,
          resourceId: filters.resourceId,
          action: filters.action,
          sessionId: filters.sessionId,
          accessedPHI: filters.accessedPHI,
          accessedAt: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
        },
        skip: filters.skip,
        take: filters.take,
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
      this.prisma.dataAccessLog.count({
        where: {
          userId: filters.userId,
          resourceType: filters.resourceType,
          resourceId: filters.resourceId,
          action: filters.action,
          sessionId: filters.sessionId,
          accessedPHI: filters.accessedPHI,
          accessedAt: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
        },
      }),
    ]);

    return {
      data: logs,
      total,
      skip: filters.skip || 0,
      take: filters.take || 50,
    };
  }
}




