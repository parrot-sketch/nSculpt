import { Injectable } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { CreateVendorDto } from '../dto/vendors/create-vendor.dto';
import { UpdateVendorDto } from '../dto/vendors/update-vendor.dto';

/**
 * Vendors Repository
 * 
 * Data access layer for vendor management.
 * Uses Prisma types for type safety.
 */
@Injectable()
export class VendorsRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Create a new vendor
   */
  async create(data: CreateVendorDto, createdBy: string) {
    return await this.prisma.vendor.create({
      data: {
        code: data.code,
        name: data.name,
        taxId: data.taxId,
        accountNumber: data.accountNumber,
        primaryContact: data.primaryContact,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        country: data.country,
        paymentTerms: data.paymentTerms,
        createdBy,
      },
    });
  }

  /**
   * Find vendor by ID
   */
  async findById(id: string) {
    return await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            items: true,
          },
        },
      },
    });
  }

  /**
   * Find vendor by code
   */
  async findByCode(code: string) {
    return await this.prisma.vendor.findUnique({
      where: { code },
    });
  }

  /**
   * Update vendor
   */
  async update(id: string, data: UpdateVendorDto, updatedBy: string) {
    return await this.prisma.vendor.update({
      where: { id },
      data: {
        name: data.name,
        taxId: data.taxId,
        accountNumber: data.accountNumber,
        primaryContact: data.primaryContact,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        country: data.country,
        paymentTerms: data.paymentTerms,
      },
    });
  }

  /**
   * Deactivate vendor (set active to false)
   */
  async deactivate(id: string, updatedBy: string) {
    return await this.prisma.vendor.update({
      where: { id },
      data: {
        active: false,
      },
    });
  }

  /**
   * Find many vendors with filters and pagination
   */
  async findMany(params: {
    search?: string;
    active?: boolean;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.VendorWhereInput = {};

    if (params.active !== undefined) {
      where.active = params.active;
    }

    if (params.search) {
      where.OR = [
        { code: { contains: params.search, mode: 'insensitive' } },
        { name: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.vendor.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { code: 'asc' },
        include: {
          _count: {
            select: {
              items: true,
            },
          },
        },
      }),
      this.prisma.vendor.count({ where }),
    ]);

    return {
      data,
      total,
      skip: params.skip || 0,
      take: params.take || 20,
    };
  }
}









