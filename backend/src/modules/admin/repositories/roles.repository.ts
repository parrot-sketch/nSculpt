import { Injectable } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';

/**
 * Roles Repository
 * 
 * Data access layer for role management.
 * Uses Prisma types for type safety.
 */
@Injectable()
export class RolesRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Create a new role
   */
  async create(data: CreateRoleDto, createdBy: string): Promise<Prisma.RoleGetPayload<{
    include: {
      permissions: {
        include: {
          permission: true;
        };
      };
      userAssignments: {
        where: { isActive: true };
        include: {
          user: {
            select: {
              id: true;
              email: true;
              firstName: true;
              lastName: true;
            };
          };
        };
      };
    };
  }>> {
    return await this.prisma.role.create({
      data: {
        code: data.code.toUpperCase(), // Ensure uppercase
        name: data.name,
        description: data.description,
        isActive: (data as any).isActive ?? (data as any).active ?? true,
        createdBy,
        updatedBy: createdBy,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        userAssignments: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Find role by ID with relations
   */
  async findById(id: string): Promise<Prisma.RoleGetPayload<{
    include: {
      permissions: {
        include: {
          permission: true;
        };
      };
      userAssignments: {
        where: { isActive: true };
        include: {
          user: {
            select: {
              id: true;
              email: true;
              firstName: true;
              lastName: true;
            };
          };
        };
      };
    };
  }> | null> {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        userAssignments: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
    return role;
  }

  /**
   * Find role by code
   */
  async findByCode(code: string) {
    return await this.prisma.role.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        userAssignments: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * List all roles
   */
  async findAll(includeInactive: boolean = false) {
    const where: Prisma.RoleWhereInput = {};
    if (!includeInactive) {
      where.isActive = true;
    }

    return await this.prisma.role.findMany({
      where,
      orderBy: { code: 'asc' },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            userAssignments: {
              where: { isActive: true },
            },
          },
        },
      },
    });
  }

  /**
   * Update role
   * Note: Code cannot be changed after creation
   */
  async update(id: string, data: UpdateRoleDto, updatedBy: string) {
    // Remove code from update data (cannot be changed)
    const { code, ...updateData } = data;

    return await this.prisma.role.update({
      where: { id },
      data: {
        ...updateData,
        updatedBy,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        userAssignments: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Deactivate role (soft delete)
   */
  async deactivate(id: string, updatedBy: string) {
    // Check if role has active user assignments
    const activeAssignments = await this.prisma.userRoleAssignment.count({
      where: {
        roleId: id,
        isActive: true,
      },
    });

    if (activeAssignments > 0) {
      throw new Error(`Cannot deactivate role with ${activeAssignments} active user assignments`);
    }

    return await this.prisma.role.update({
      where: { id },
      data: {
        isActive: false,
        updatedBy,
      },
    });
  }

  /**
   * Assign permission to role
   */
  async assignPermission(roleId: string, permissionId: string, createdBy: string) {
    // Check if assignment already exists
    const existing = await this.prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
    });

    if (existing) {
      throw new Error('Permission already assigned to role');
    }

    return await this.prisma.rolePermission.create({
      data: {
        roleId,
        permissionId,
        createdBy,
      },
      include: {
        permission: true,
        role: true,
      },
    });
  }

  /**
   * Remove permission from role
   */
  async removePermission(roleId: string, permissionId: string) {
    return await this.prisma.rolePermission.delete({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
      include: {
        permission: true,
        role: true,
      },
    });
  }

  /**
   * Get users with this role
   */
  async getUsersWithRole(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        userAssignments: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                isActive: true,
                department: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return role?.userAssignments.map(assignment => assignment.user) || [];
  }
}





