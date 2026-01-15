import { Injectable } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { CreateCategoryDto } from '../dto/categories/create-category.dto';
import { UpdateCategoryDto } from '../dto/categories/update-category.dto';

/**
 * Categories Repository
 * 
 * Data access layer for inventory category management.
 * Uses Prisma types for type safety.
 */
@Injectable()
export class CategoriesRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Create a new inventory category
   */
  async create(data: CreateCategoryDto, createdBy: string) {
    return await this.prisma.inventoryCategory.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        parentId: data.parentId,
      },
      include: {
        parent: true,
        _count: {
          select: {
            children: true,
            items: true,
          },
        },
      },
    });
  }

  /**
   * Find category by ID
   */
  async findById(id: string) {
    return await this.prisma.inventoryCategory.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        _count: {
          select: {
            children: true,
            items: true,
          },
        },
      },
    });
  }

  /**
   * Find category by code
   */
  async findByCode(code: string) {
    return await this.prisma.inventoryCategory.findUnique({
      where: { code },
    });
  }

  /**
   * Check for circular reference in parent hierarchy
   */
  async checkCircularReference(categoryId: string, parentId: string): Promise<boolean> {
    let currentParentId: string | null = parentId;
    const visited = new Set<string>();

    while (currentParentId) {
      if (currentParentId === categoryId) {
        return true; // Circular reference detected
      }
      if (visited.has(currentParentId)) {
        break; // Prevent infinite loop
      }
      visited.add(currentParentId);

      const parent = await this.prisma.inventoryCategory.findUnique({
        where: { id: currentParentId },
        select: { parentId: true },
      });
      currentParentId = parent?.parentId || null;
    }

    return false;
  }

  /**
   * Update category
   */
  async update(id: string, data: UpdateCategoryDto, updatedBy: string) {
    return await this.prisma.inventoryCategory.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
      },
      include: {
        parent: true,
        _count: {
          select: {
            children: true,
            items: true,
          },
        },
      },
    });
  }

  /**
   * Deactivate category (set active to false)
   */
  async deactivate(id: string, updatedBy: string) {
    return await this.prisma.inventoryCategory.update({
      where: { id },
      data: {
        active: false,
      },
    });
  }

  /**
   * Find many categories with filters and pagination
   */
  async findMany(params: {
    search?: string;
    active?: boolean;
    parentId?: string;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.InventoryCategoryWhereInput = {};

    if (params.active !== undefined) {
      where.active = params.active;
    }

    if (params.parentId !== undefined) {
      where.parentId = params.parentId || null; // null for root categories
    }

    if (params.search) {
      where.OR = [
        { code: { contains: params.search, mode: 'insensitive' } },
        { name: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.inventoryCategory.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { code: 'asc' },
        include: {
          parent: true,
          _count: {
            select: {
              children: true,
              items: true,
            },
          },
        },
      }),
      this.prisma.inventoryCategory.count({ where }),
    ]);

    return {
      data,
      total,
      skip: params.skip || 0,
      take: params.take || 20,
    };
  }
}









