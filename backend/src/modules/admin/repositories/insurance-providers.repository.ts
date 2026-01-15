import { Injectable } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { CreateInsuranceProviderDto } from '../dto/insurance-providers/create-insurance-provider.dto';
import { UpdateInsuranceProviderDto } from '../dto/insurance-providers/update-insurance-provider.dto';

/**
 * Insurance Providers Repository
 * 
 * Data access layer for insurance provider management.
 * Uses Prisma types for type safety.
 */
@Injectable()
export class InsuranceProvidersRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Create a new insurance provider
   */
  async create(data: CreateInsuranceProviderDto, createdBy: string) {
    return await this.prisma.insuranceProvider.create({
      data: {
        code: data.code,
        name: data.name,
        payerId: data.payerId,
        taxId: data.taxId,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        phone: data.phone,
        email: data.email,
        createdBy,
      },
    });
  }

  /**
   * Find insurance provider by ID
   */
  async findById(id: string) {
    return await this.prisma.insuranceProvider.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            policies: true,
            feeSchedules: true,
          },
        },
      },
    });
  }

  /**
   * Find insurance provider by code
   */
  async findByCode(code: string) {
    return await this.prisma.insuranceProvider.findUnique({
      where: { code },
    });
  }

  /**
   * Find insurance provider by payerId
   */
  async findByPayerId(payerId: string) {
    return await this.prisma.insuranceProvider.findUnique({
      where: { payerId },
    });
  }

  /**
   * Update insurance provider
   */
  async update(id: string, data: UpdateInsuranceProviderDto, updatedBy: string) {
    return await this.prisma.insuranceProvider.update({
      where: { id },
      data: {
        name: data.name,
        taxId: data.taxId,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        phone: data.phone,
        email: data.email,
      },
    });
  }

  /**
   * Deactivate insurance provider (set active to false)
   */
  async deactivate(id: string, updatedBy: string) {
    return await this.prisma.insuranceProvider.update({
      where: { id },
      data: {
        active: false,
      },
    });
  }

  /**
   * Find many insurance providers with filters and pagination
   */
  async findMany(params: {
    search?: string;
    active?: boolean;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.InsuranceProviderWhereInput = {};

    if (params.active !== undefined) {
      where.active = params.active;
    }

    if (params.search) {
      where.OR = [
        { code: { contains: params.search, mode: 'insensitive' } },
        { name: { contains: params.search, mode: 'insensitive' } },
        { payerId: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.insuranceProvider.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { code: 'asc' },
        include: {
          _count: {
            select: {
              policies: true,
              feeSchedules: true,
            },
          },
        },
      }),
      this.prisma.insuranceProvider.count({ where }),
    ]);

    return {
      data,
      total,
      skip: params.skip || 0,
      take: params.take || 20,
    };
  }
}









