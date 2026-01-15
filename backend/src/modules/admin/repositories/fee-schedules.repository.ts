import { Injectable } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { CreateFeeScheduleDto } from '../dto/fee-schedules/create-fee-schedule.dto';
import { UpdateFeeScheduleDto } from '../dto/fee-schedules/update-fee-schedule.dto';
import { CreateFeeScheduleItemDto } from '../dto/fee-schedules/create-fee-schedule-item.dto';
import { UpdateFeeScheduleItemDto } from '../dto/fee-schedules/update-fee-schedule-item.dto';

/**
 * Fee Schedules Repository
 * 
 * Data access layer for fee schedule management.
 * Uses Prisma types for type safety.
 */
@Injectable()
export class FeeSchedulesRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Create a new fee schedule
   */
  async create(data: CreateFeeScheduleDto, createdBy: string) {
    return await this.prisma.feeSchedule.create({
      data: {
        name: data.name,
        description: data.description,
        scheduleType: data.scheduleType,
        insuranceProviderId: data.insuranceProviderId,
        effectiveDate: new Date(data.effectiveDate),
        expirationDate: data.expirationDate ? new Date(data.expirationDate) : null,
        createdBy,
      },
      include: {
        provider: true,
        items: true,
      },
    });
  }

  /**
   * Find fee schedule by ID
   */
  async findById(id: string) {
    return await this.prisma.feeSchedule.findUnique({
      where: { id },
      include: {
        provider: true,
        items: {
          include: {
            billingCode: true,
          },
          orderBy: { effectiveDate: 'desc' },
        },
      },
    });
  }

  /**
   * Update fee schedule
   */
  async update(id: string, data: UpdateFeeScheduleDto, updatedBy: string) {
    return await this.prisma.feeSchedule.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        expirationDate: data.expirationDate ? new Date(data.expirationDate) : undefined,
      },
      include: {
        provider: true,
        items: {
          include: {
            billingCode: true,
          },
        },
      },
    });
  }

  /**
   * Deactivate fee schedule (set active to false)
   */
  async deactivate(id: string, updatedBy: string) {
    return await this.prisma.feeSchedule.update({
      where: { id },
      data: {
        active: false,
      },
    });
  }

  /**
   * Find many fee schedules with filters and pagination
   */
  async findMany(params: {
    search?: string;
    active?: boolean;
    scheduleType?: string;
    insuranceProviderId?: string;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.FeeScheduleWhereInput = {};

    if (params.active !== undefined) {
      where.active = params.active;
    }

    if (params.scheduleType) {
      where.scheduleType = params.scheduleType;
    }

    if (params.insuranceProviderId) {
      where.insuranceProviderId = params.insuranceProviderId;
    }

    if (params.search) {
      where.name = { contains: params.search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.feeSchedule.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
        include: {
          provider: true,
          _count: {
            select: {
              items: true,
            },
          },
        },
      }),
      this.prisma.feeSchedule.count({ where }),
    ]);

    return {
      data,
      total,
      skip: params.skip || 0,
      take: params.take || 20,
    };
  }

  /**
   * Add item to fee schedule
   */
  async addItem(scheduleId: string, data: CreateFeeScheduleItemDto) {
    return await this.prisma.feeScheduleItem.create({
      data: {
        scheduleId,
        billingCodeId: data.billingCodeId,
        amount: data.amount,
        unit: data.unit,
        effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : new Date(),
        expirationDate: data.expirationDate ? new Date(data.expirationDate) : null,
      },
      include: {
        billingCode: true,
      },
    });
  }

  /**
   * Find fee schedule item by ID
   */
  async findItemById(itemId: string) {
    return await this.prisma.feeScheduleItem.findUnique({
      where: { id: itemId },
      include: {
        billingCode: true,
        schedule: true,
      },
    });
  }

  /**
   * Update fee schedule item
   */
  async updateItem(itemId: string, data: UpdateFeeScheduleItemDto) {
    return await this.prisma.feeScheduleItem.update({
      where: { id: itemId },
      data: {
        amount: data.amount,
        unit: data.unit,
        expirationDate: data.expirationDate ? new Date(data.expirationDate) : undefined,
      },
      include: {
        billingCode: true,
      },
    });
  }

  /**
   * Remove fee schedule item
   */
  async removeItem(itemId: string) {
    await this.prisma.feeScheduleItem.delete({
      where: { id: itemId },
    });
  }
}









