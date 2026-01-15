import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { CreateCaseDto } from '../dto/create-case.dto';
import { UpdateCaseDto } from '../dto/update-case.dto';

@Injectable()
export class TheaterRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  async createCase(data: CreateCaseDto) {
    // Get procedure plan to denormalize data
    const procedurePlan = await this.prisma.procedurePlan.findUnique({
      where: { id: data.procedurePlanId },
    });

    if (!procedurePlan) {
      throw new Error(`Procedure plan ${data.procedurePlanId} not found`);
    }

    return await this.prisma.surgicalCase.create({
      data: {
        caseNumber: data.caseNumber,
        patientId: data.patientId,
        procedurePlanId: data.procedurePlanId, // REQUIRED: Link to procedure plan
        procedureName: data.procedureName || procedurePlan.procedureName, // Use provided or from plan
        procedureCode: data.procedureCode || procedurePlan.procedureCode,
        description: data.description || procedurePlan.procedureDescription,
        estimatedDurationMinutes: data.estimatedDurationMinutes || procedurePlan.estimatedDurationMinutes,
        priority: data.priority || 5,
        status: 'SCHEDULED',
        scheduledStartAt: new Date(data.scheduledStartAt),
        scheduledEndAt: new Date(data.scheduledEndAt),
        primarySurgeonId: data.primarySurgeonId || procedurePlan.surgeonId,
        notes: data.notes,
      },
    });
  }

  async findCaseById(id: string) {
    return await this.prisma.surgicalCase.findUnique({
      where: { id },
      include: {
        reservations: true,
        resourceAllocations: true,
        statusHistory: {
          orderBy: { changedAt: 'desc' },
        },
      },
    });
  }

  async findCaseByNumber(caseNumber: string) {
    return await this.prisma.surgicalCase.findUnique({
      where: { caseNumber },
    });
  }

  async updateCase(id: string, data: UpdateCaseDto) {
    const updateData: any = { ...data };
    if ((data as any).scheduledStartAt) {
      updateData.scheduledStartAt = new Date((data as any).scheduledStartAt);
    }
    if ((data as any).scheduledEndAt) {
      updateData.scheduledEndAt = new Date((data as any).scheduledEndAt);
    }
    return await this.prisma.surgicalCase.update({
      where: { id },
      data: updateData,
    });
  }

  async createStatusHistory(data: {
    caseId: string;
    fromStatus: string | null;
    toStatus: string;
    triggeringEventId: string;
    reason?: string;
    changedBy?: string;
  }) {
    return await this.prisma.caseStatusHistory.create({
      data,
    });
  }

  async createReservation(data: {
    theaterId: string;
    caseId?: string;
    reservedFrom: Date;
    reservedUntil: Date;
    reservationType: string;
    status?: string;
    notes?: string;
  }) {
    return await this.prisma.theaterReservation.create({
      data,
    });
  }

  async findAllCases(skip?: number, take?: number) {
    return await this.prisma.surgicalCase.findMany({
      skip,
      take,
      orderBy: { scheduledStartAt: 'asc' },
    });
  }

  async findAllFiltered(skip?: number, take?: number, userId?: string) {
    if (!userId) {
      return [];
    }

    // Get user's department
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { departmentId: true },
    });

    // Build where clause
    const where: any = {
      OR: [
        { primarySurgeonId: userId },
        {
          resourceAllocations: {
            some: {
              resourceType: 'STAFF',
              resourceId: userId,
              status: 'ALLOCATED',
            },
          },
        },
      ],
    };

    // Add department filter if user has department
    if (user?.departmentId) {
      where.OR.push({
        reservations: {
          some: {
            theater: {
              departmentId: user.departmentId,
            },
          },
        },
      });
    }

    return await this.prisma.surgicalCase.findMany({
      where,
      skip,
      take,
      orderBy: { scheduledStartAt: 'asc' },
      include: {
        reservations: true,
        resourceAllocations: true,
        statusHistory: {
          orderBy: { changedAt: 'desc' },
          take: 1,
        },
      },
    });
  }
}

