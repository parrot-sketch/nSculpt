import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';

@Injectable()
export class DataAccessLogRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Note: DataAccessLog is immutable
   * All operations go through DataAccessLogService
   * This repository is for read-only queries if needed
   */
  async findById(id: string) {
    return await this.prisma.dataAccessLog.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });
  }

  async findByUserId(userId: string, skip?: number, take?: number) {
    return await this.prisma.dataAccessLog.findMany({
      where: { userId },
      skip,
      take,
      orderBy: { accessedAt: 'desc' },
    });
  }

  async findByResource(resourceType: string, resourceId: string, skip?: number, take?: number) {
    return await this.prisma.dataAccessLog.findMany({
      where: {
        resourceType,
        resourceId,
      },
      skip,
      take,
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
    });
  }
}












