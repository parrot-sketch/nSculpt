import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { UserActivityQueryDto } from '../dto/reports/user-activity-query.dto';
import { PermissionUsageQueryDto } from '../dto/reports/permission-usage-query.dto';
import { DataAccessLogService } from '../../audit/services/dataAccessLog.service';
import { CorrelationService } from '../../../services/correlation.service';

/**
 * Reporting Service
 * 
 * Business logic for admin reporting workflows.
 * DR-002: View User Activity Report
 * DR-003: View Permission Usage Report
 */
@Injectable()
export class ReportingService {
  private prisma: PrismaClient;

  constructor(
    private readonly dataAccessLogService: DataAccessLogService,
    private readonly correlationService: CorrelationService,
  ) {
    this.prisma = getPrismaClient();
  }

  /**
   * Generate user activity report
   * DR-002: View User Activity Report
   */
  async generateUserActivityReport(query: UserActivityQueryDto, adminId: string) {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    // Base query conditions
    const where: any = {
      occurredAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (query.userId) {
      where.createdBy = query.userId;
    }

    // Get user creations
    const userCreations = await this.prisma.domainEvent.findMany({
      where: {
        ...where,
        eventType: 'User.Created',
      },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { occurredAt: 'asc' },
    });

    // Get user logins (from sessions)
    const userLogins = await this.prisma.session.findMany({
      where: {
        startedAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(query.userId ? { userId: query.userId } : {}),
      },
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
      orderBy: { startedAt: 'asc' },
    });

    // Get role assignments
    const roleAssignments = await this.prisma.userRoleAssignment.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(query.userId ? { userId: query.userId } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        role: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Get permission changes (via domain events)
    const permissionChanges = await this.prisma.domainEvent.findMany({
      where: {
        ...where,
        eventType: {
          in: ['Role.PermissionAssigned', 'RolePermission.Created', 'RolePermission.Removed'],
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { occurredAt: 'asc' },
    });

    // Calculate summary statistics
    const summary = {
      dateRange: {
        start: startDate,
        end: endDate,
      },
      totalUserCreations: userCreations.length,
      totalUserLogins: userLogins.length,
      totalRoleAssignments: roleAssignments.length,
      totalPermissionChanges: permissionChanges.length,
      uniqueUsers: query.userId
        ? 1
        : new Set([
            ...userCreations.map(e => e.createdBy).filter(Boolean),
            ...userLogins.map(s => s.userId),
            ...roleAssignments.map(a => a.userId),
            ...permissionChanges.map(e => e.createdBy).filter(Boolean),
          ]).size,
    };

    // Log access
    const context = this.correlationService.getContext();
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'UserActivityReport',
      resourceId: 'generated',
      action: 'GENERATE',
      sessionId: context.sessionId,
      reason: `Admin generated user activity report for ${query.startDate} to ${query.endDate}`,
      accessedPHI: false,
      success: true,
    });

    return {
      summary,
      userCreations: userCreations.map(e => ({
        id: e.id,
        occurredAt: e.occurredAt,
        user: e.creator,
        payload: e.payload,
      })),
      userLogins: userLogins.map(s => ({
        id: s.id,
        startedAt: s.startedAt,
        user: s.user,
        deviceInfo: s.deviceInfo,
        ipAddress: s.ipAddress,
      })),
      roleAssignments: roleAssignments.map(a => ({
        id: a.id,
        createdAt: a.createdAt,
        user: a.user,
        role: a.role,
        isActive: a.isActive,
        validFrom: a.validFrom,
        validUntil: a.validUntil,
      })),
      permissionChanges: permissionChanges.map(e => ({
        id: e.id,
        occurredAt: e.occurredAt,
        eventType: e.eventType,
        creator: e.creator,
        payload: e.payload,
      })),
    };
  }

  /**
   * Generate permission usage report
   * DR-003: View Permission Usage Report
   */
  async generatePermissionUsageReport(query: PermissionUsageQueryDto, adminId: string) {
    // Base query for permissions
    const permissionWhere: any = {};
    if (query.domain) {
      permissionWhere.domain = query.domain;
    }
    if (query.permissionId) {
      permissionWhere.id = query.permissionId;
    }

    // Get all permissions (or filtered)
    const permissions = await this.prisma.permission.findMany({
      where: permissionWhere,
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

    // Build permission → roles → users mapping
    const permissionUsage = await Promise.all(
      permissions.map(async (permission) => {
        // Get all roles with this permission
        const roles = permission.rolePermissions.map(rp => rp.role);

        // Get all users with these roles
        const roleIds = roles.map(r => r.id);
        const userAssignments = await this.prisma.userRoleAssignment.findMany({
          where: {
            roleId: { in: roleIds },
            isActive: true,
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                isActive: true,
              },
            },
            role: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        });

        // Group users by role
        const usersByRole: Record<string, any[]> = {};
        userAssignments.forEach(assignment => {
          const roleCode = assignment.role.code;
          if (!usersByRole[roleCode]) {
            usersByRole[roleCode] = [];
          }
          usersByRole[roleCode].push(assignment.user);
        });

        // Calculate statistics
        const totalUsers = new Set(userAssignments.map(a => a.userId)).size;
        const activeUsers = new Set(
          userAssignments.filter(a => a.user.isActive).map(a => a.userId),
        ).size;

        return {
          permission: {
            id: permission.id,
            code: permission.code,
            name: permission.name,
            domain: permission.domain,
            resource: permission.resource,
            action: permission.action,
          },
          roles: roles.map(r => ({
            id: r.id,
            code: r.code,
            name: r.name,
            isActive: r.isActive,
          })),
          usersByRole,
          statistics: {
            totalRoles: roles.length,
            totalUsers,
            activeUsers,
            inactiveUsers: totalUsers - activeUsers,
          },
        };
      }),
    );

    // Calculate overall statistics
    const totalPermissions = permissionUsage.length;
    const totalRoles = new Set(
      permissionUsage.flatMap(p => p.roles.map(r => r.id)),
    ).size;
    const totalUsers = new Set(
      permissionUsage.flatMap(p =>
        Object.values(p.usersByRole).flatMap(users => users.map(u => u.id)),
      ),
    ).size;

    // Log access
    const context = this.correlationService.getContext();
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'PermissionUsageReport',
      resourceId: 'generated',
      action: 'GENERATE',
      sessionId: context.sessionId,
      reason: `Admin generated permission usage report${query.domain ? ` for domain ${query.domain}` : ''}`,
      accessedPHI: false,
      success: true,
    });

    return {
      summary: {
        totalPermissions,
        totalRoles,
        totalUsers,
        filter: {
          domain: query.domain || 'all',
          permissionId: query.permissionId || 'all',
        },
      },
      permissionUsage,
    };
  }
}









