import { Injectable } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { CreateTheaterDto } from '../dto/theaters/create-theater.dto';
import { UpdateTheaterDto } from '../dto/theaters/update-theater.dto';

/**
 * Theaters Repository
 * 
 * Data access layer for operating theater management.
 * Uses Prisma types for type safety.
 */
@Injectable()
export class TheatersRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Create a new operating theater
   */
  async create(data: CreateTheaterDto, createdBy: string) {
    return await this.prisma.operatingTheater.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        departmentId: data.departmentId,
        capacity: data.capacity,
        createdBy,
        updatedBy: createdBy,
      },
      include: {
        department: true,
      },
    });
  }

  /**
   * Find theater by ID
   */
  async findById(id: string) {
    return await this.prisma.operatingTheater.findUnique({
      where: { id },
      include: {
        department: true,
        _count: {
          select: {
            reservations: true,
            resourceAllocations: true,
          },
        },
      },
    });
  }

  /**
   * Find theater by code
   */
  async findByCode(code: string) {
    return await this.prisma.operatingTheater.findUnique({
      where: { code },
    });
  }

  /**
   * Update theater
   */
  async update(id: string, data: UpdateTheaterDto, updatedBy: string) {
    return await this.prisma.operatingTheater.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        capacity: data.capacity,
        updatedBy,
        version: { increment: 1 },
      },
      include: {
        department: true,
      },
    });
  }

  /**
   * Deactivate theater (set active to false)
   */
  async deactivate(id: string, updatedBy: string) {
    return await this.prisma.operatingTheater.update({
      where: { id },
      data: {
        active: false,
        updatedBy,
        version: { increment: 1 },
      },
    });
  }

  /**
   * Find many theaters with filters and pagination
   */
  async findMany(params: {
    search?: string;
    active?: boolean;
    departmentId?: string;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.OperatingTheaterWhereInput = {};

    if (params.active !== undefined) {
      where.active = params.active;
    }

    if (params.departmentId) {
      where.departmentId = params.departmentId;
    }

    if (params.search) {
      where.OR = [
        { code: { contains: params.search, mode: 'insensitive' } },
        { name: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.operatingTheater.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { code: 'asc' },
        include: {
          department: true,
          _count: {
            select: {
              reservations: true,
              resourceAllocations: true,
            },
          },
        },
      }),
      this.prisma.operatingTheater.count({ where }),
    ]);

    return {
      data,
      total,
      skip: params.skip || 0,
      take: params.take || 20,
    };
  }
}









