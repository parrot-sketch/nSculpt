import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';

@Injectable()
export class PermissionService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(userId: string, permissionCode: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roleAssignments: {
          where: {
            isActive: true,
            validFrom: { lte: new Date() },
            OR: [
              { validUntil: null },
              { validUntil: { gte: new Date() } },
            ],
          },
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

    if (!user || !user.roleAssignments) return false;

    return user.roleAssignments
      .filter(assignment => assignment.role && assignment.role.isActive)
      .some(assignment =>
        assignment.role!.permissions.some(rp => rp.permission && rp.permission.code === permissionCode)
      );
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasAnyPermission(userId: string, permissionCodes: string[]): Promise<boolean> {
    for (const code of permissionCodes) {
      if (await this.hasPermission(userId, code)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if user has all specified permissions
   */
  async hasAllPermissions(userId: string, permissionCodes: string[]): Promise<boolean> {
    for (const code of permissionCodes) {
      if (!(await this.hasPermission(userId, code))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get all permissions for user
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roleAssignments: {
          where: {
            isActive: true,
            validFrom: { lte: new Date() },
            OR: [
              { validUntil: null },
              { validUntil: { gte: new Date() } },
            ],
          },
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

    if (!user || !user.roleAssignments) return [];

    const permissions = new Set<string>();
    user.roleAssignments
      .filter(assignment => assignment.role && assignment.role.isActive)
      .forEach(assignment => {
        assignment.role!.permissions.forEach(rp => {
          if (rp.permission) {
            permissions.add(rp.permission.code);
          }
        });
      });

    return Array.from(permissions);
  }
}

