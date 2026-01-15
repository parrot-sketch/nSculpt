import { Injectable } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { CreateBillingCodeDto } from '../dto/billing-codes/create-billing-code.dto';
import { UpdateBillingCodeDto } from '../dto/billing-codes/update-billing-code.dto';

/**
 * Billing Codes Repository
 * 
 * Data access layer for billing code management.
 * Uses Prisma types for type safety.
 */
@Injectable()
export class BillingCodesRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Create a new billing code
   */
  async create(data: CreateBillingCodeDto, createdBy: string) {
    return await this.prisma.billingCode.create({
      data: {
        code: data.code,
        codeType: data.codeType,
        description: data.description,
        category: data.category,
        defaultCharge: data.defaultCharge,
      },
    });
  }

  /**
   * Find billing code by ID
   */
  async findById(id: string) {
    return await this.prisma.billingCode.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            billLineItems: true,
            feeScheduleItems: true,
          },
        },
      },
    });
  }

  /**
   * Find billing code by code
   */
  async findByCode(code: string) {
    return await this.prisma.billingCode.findUnique({
      where: { code },
    });
  }

  /**
   * Update billing code
   */
  async update(id: string, data: UpdateBillingCodeDto, updatedBy: string) {
    return await this.prisma.billingCode.update({
      where: { id },
      data: {
        description: data.description,
        category: data.category,
        defaultCharge: data.defaultCharge,
      },
    });
  }

  /**
   * Deactivate billing code (set active to false)
   */
  async deactivate(id: string, updatedBy: string) {
    return await this.prisma.billingCode.update({
      where: { id },
      data: {
        active: false,
      },
    });
  }

  /**
   * Find many billing codes with filters and pagination
   */
  async findMany(params: {
    search?: string;
    active?: boolean;
    codeType?: string;
    category?: string;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.BillingCodeWhereInput = {};

    if (params.active !== undefined) {
      where.active = params.active;
    }

    if (params.codeType) {
      where.codeType = params.codeType;
    }

    if (params.category) {
      where.category = params.category;
    }

    if (params.search) {
      where.OR = [
        { code: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.billingCode.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { code: 'asc' },
        include: {
          _count: {
            select: {
              billLineItems: true,
              feeScheduleItems: true,
            },
          },
        },
      }),
      this.prisma.billingCode.count({ where }),
    ]);

    return {
      data,
      total,
      skip: params.skip || 0,
      take: params.take || 20,
    };
  }
}









