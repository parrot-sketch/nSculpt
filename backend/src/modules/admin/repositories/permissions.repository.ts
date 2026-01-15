import { Injectable } from '@nestjs/common';
import { PrismaClient, Prisma, Domain } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { PermissionQueryDto } from '../dto/permission-query.dto';

/**
 * Permissions Repository
 * 
 * Data access layer for permission management.
 * Permissions are typically read-only (seeded in database).
 */
@Injectable()
export class PermissionsRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Find permission by ID with relations
   */
  async findById(id: string) {
    return await this.prisma.permission.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            role: {
              select: {
                id: true,
                code: true,
                name: true,
                isActive: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Find permission by code
   */
  async findByCode(code: string) {
    return await this.prisma.permission.findUnique({
      where: { code },
      include: {
        rolePermissions: {
          include: {
            role: {
              select: {
                id: true,
                code: true,
                name: true,
                isActive: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * List permissions with filters
   */
  async findAll(query: PermissionQueryDto) {
    const where: Prisma.PermissionWhereInput = {};

    // Domain filter
    if (query.domain) {
      where.domain = query.domain;
    }

    // Resource filter
    if (query.resource) {
      where.resource = { contains: query.resource, mode: 'insensitive' };
    }

    // Action filter
    if (query.action) {
      where.action = { contains: query.action, mode: 'insensitive' };
    }

    // Search filter (code, name, description)
    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [permissions, total] = await Promise.all([
      this.prisma.permission.findMany({
        where,
        orderBy: [
          { domain: 'asc' },
          { resource: 'asc' },
          { action: 'asc' },
        ],
        include: {
          rolePermissions: {
            include: {
              role: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  isActive: true,
                },
              },
            },
          },
          _count: {
            select: {
              rolePermissions: true,
            },
          },
        },
      }),
      this.prisma.permission.count({ where }),
    ]);

    return {
      permissions,
      total,
    };
  }

  /**
   * Get permissions by domain
   */
  async findByDomain(domain: Domain) {
    return await this.prisma.permission.findMany({
      where: { domain },
      orderBy: [
        { resource: 'asc' },
        { action: 'asc' },
      ],
      include: {
        rolePermissions: {
          include: {
            role: {
              select: {
                id: true,
                code: true,
                name: true,
                isActive: true,
              },
            },
          },
        },
        _count: {
          select: {
            rolePermissions: true,
          },
        },
      },
    });
  }

  /**
   * Get roles that have this permission
   */
  async getRolesWithPermission(permissionId: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id: permissionId },
      include: {
        rolePermissions: {
          include: {
            role: {
              select: {
                id: true,
                code: true,
                name: true,
                isActive: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!permission) {
      return [];
    }

    return permission.rolePermissions.map(rp => rp.role);
  }
}

