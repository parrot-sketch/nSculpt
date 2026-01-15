import { Injectable } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserQueryDto } from '../dto/user-query.dto';

/**
 * Users Repository
 * 
 * Data access layer for user management.
 * Uses Prisma types for type safety.
 */
@Injectable()
export class UsersRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Create a new user
   * Note: Password must be set separately via password reset
   */
  async create(data: CreateUserDto, passwordHash: string, createdBy: string) {
    return await this.prisma.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        title: data.title,
        employeeId: data.employeeId,
        departmentId: data.departmentId,
        isActive: data.isActive ?? true,
        passwordHash,
        createdBy,
        updatedBy: createdBy,
      },
      include: {
        department: true,
        roleAssignments: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  /**
   * Find user by ID with relations
   */
  async findById(id: string) {
    return await this.prisma.user.findUnique({
      where: { id },
      include: {
        department: true,
        roleAssignments: {
          where: { isActive: true },
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string) {
    return await this.prisma.user.findUnique({
      where: { email },
      include: {
        department: true,
        roleAssignments: {
          where: { isActive: true },
          include: {
            role: true,
          },
        },
      },
    });
  }

  /**
   * List users with filters and pagination
   */
  async findAll(query: UserQueryDto) {
    const where: Prisma.UserWhereInput = {};

    // Search filter
    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { employeeId: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Active filter
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    // Department filter
    if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    // Role filter
    if (query.roleCode) {
      where.roleAssignments = {
        some: {
          role: {
            code: query.roleCode,
            isActive: true,
          },
          isActive: true,
        },
      };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
        include: {
          department: true,
          roleAssignments: {
            where: { isActive: true },
            include: {
              role: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      skip: query.skip ?? 0,
      take: query.take ?? 20,
    };
  }

  /**
   * Update user
   */
  async update(id: string, data: UpdateUserDto, updatedBy: string) {
    const {
      active,
      department,
      roleAssignments,
      createdAt,
      updatedAt,
      createdBy,
      ...updateData
    } = data as any;

    return await this.prisma.user.update({
      where: { id },
      data: {
        ...updateData,
        ...(active !== undefined && { isActive: active }),
        updatedBy,
      },
      include: {
        department: true,
        roleAssignments: {
          where: { isActive: true },
          include: {
            role: true,
          },
        },
      },
    });
  }

  /**
   * Deactivate user (soft delete)
   */
  async deactivate(id: string, updatedBy: string) {
    return await this.prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        updatedBy,
      },
    });
  }

  /**
   * Activate user (reactivate deactivated user)
   */
  async activate(id: string, updatedBy: string) {
    return await this.prisma.user.update({
      where: { id },
      data: {
        isActive: true,
        updatedBy,
      },
    });
  }

  /**
   * Update user password hash
   */
  async updatePasswordHash(id: string, passwordHash: string) {
    return await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
      },
    });
  }
}





