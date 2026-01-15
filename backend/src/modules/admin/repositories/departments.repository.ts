import { Injectable } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { CreateDepartmentDto } from '../dto/departments/create-department.dto';
import { UpdateDepartmentDto } from '../dto/departments/update-department.dto';

/**
 * Departments Repository
 * 
 * Data access layer for department management.
 * Uses Prisma types for type safety.
 */
@Injectable()
export class DepartmentsRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Create a new department
   */
  async create(data: CreateDepartmentDto, createdBy: string) {
    return await this.prisma.department.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        createdBy,
        updatedBy: createdBy,
      },
    });
  }

  /**
   * Find department by ID
   */
  async findById(id: string) {
    return await this.prisma.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            theaters: true,
          },
        },
      },
    });
  }

  /**
   * Find department by code
   */
  async findByCode(code: string) {
    return await this.prisma.department.findUnique({
      where: { code },
    });
  }

  /**
   * Update department
   */
  async update(id: string, data: UpdateDepartmentDto, updatedBy: string) {
    return await this.prisma.department.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        updatedBy,
        version: { increment: 1 },
      },
    });
  }

  /**
   * Deactivate department (set active to false)
   */
  async deactivate(id: string, updatedBy: string) {
    return await this.prisma.department.update({
      where: { id },
      data: {
        active: false,
        updatedBy,
        version: { increment: 1 },
      },
    });
  }

  /**
   * Find many departments with filters and pagination
   */
  async findMany(params: {
    search?: string;
    active?: boolean;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.DepartmentWhereInput = {};

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
      this.prisma.department.findMany({
        where,
        skip: params.skip ? Number(params.skip) : undefined,
        take: params.take ? Number(params.take) : undefined,
        orderBy: { code: 'asc' },
        include: {
          _count: {
            select: {
              users: true,
              theaters: true,
            },
          },
        },
      }),
      this.prisma.department.count({ where }),
    ]);

    return {
      data,
      total,
      skip: params.skip || 0,
      take: params.take || 20,
    };
  }
}

