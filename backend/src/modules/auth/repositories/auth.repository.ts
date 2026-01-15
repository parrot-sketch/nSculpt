import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';

@Injectable()
export class AuthRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        isEmailVerified: true,
        firstName: true,
        lastName: true,
        isActive: true,
        passwordHash: true,
        lastLoginAt: true,
        departmentId: true,
        employeeId: true,
        mfaEnabled: true,
        mfaSecret: true,
        backupCodes: true,
        department: {
          select: {
            id: true,
            code: true,
            name: true,
          }
        }
      },
    });
  }

  /**
   * Find user by email or ID (for failed login logging)
   */
  async findByEmailOrId(identifier: string) {
    // Try as UUID first
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)) {
      return this.prisma.user.findUnique({
        where: { id: identifier },
        select: {
          id: true,
          email: true,
          isActive: true,
        },
      });
    }
    // Try as email
    return this.findByEmail(identifier);
  }

  /**
   * Find user by ID
   */
  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        isEmailVerified: true,
        firstName: true,
        lastName: true,
        isActive: true,
        departmentId: true,
        employeeId: true,
        mfaEnabled: true,
        mfaSecret: true,
        backupCodes: true,
        department: {
          select: {
            id: true,
            code: true,
            name: true,
          }
        }
      },
    });
  }

  /**
   * Get user roles and permissions
   */
  async getUserRolesAndPermissions(userId: string) {
    // Use select to avoid selecting fields that don't exist in database (like username)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        roleAssignments: {
          where: {
            isActive: true,
            revokedAt: null,  // Explicit revocation check (defense in depth)
            validFrom: { lte: new Date() },
            OR: [
              { validUntil: null },
              { validUntil: { gt: new Date() } },  // Exclusive upper bound (fixes 1-second bypass)
            ],
          },
          select: {
            validFrom: true,
            validUntil: true,
            role: {
              select: {
                id: true,
                code: true,
                isActive: true,
                permissions: {
                  select: {
                    permission: {
                      select: {
                        id: true,
                        code: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.roleAssignments) {
      return { roles: [], permissions: [] };
    }

    // Filter active roles and their permissions
    const activeRoles = user.roleAssignments
      .filter(assignment => assignment.role && assignment.role.isActive)
      .map(assignment => assignment.role!)
      .filter(role => role !== null);

    const permissions = new Set<string>();
    activeRoles.forEach(role => {
      role.permissions.forEach(rp => {
        if (rp.permission) {
          permissions.add(rp.permission.code);
        }
      });
    });

    return {
      roles: activeRoles.map(r => ({ code: r.code, id: r.id })),
      permissions: Array.from(permissions).map(code => ({ code })),
    };
  }

  /**
   * Update user last login timestamp
   */
  async updateLastLogin(userId: string) {
    // Use updateMany to avoid selecting fields that don't exist (like username)
    await this.prisma.user.updateMany({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
    // Return the updated user with only fields that exist
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        lastLoginAt: true,
      },
    });
  }

  /**
   * Increment failed login attempts and lock account if threshold exceeded
   * Phase 1 Security Hardening: Account Lockout Mechanism
   */
  async incrementFailedAttempts(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { failedLoginAttempts: true },
    });

    const newAttempts = (user?.failedLoginAttempts || 0) + 1;
    const MAX_ATTEMPTS = 5;
    const LOCKOUT_MINUTES = 15;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: newAttempts,
        lastFailedLoginAt: new Date(),
        ...(newAttempts >= MAX_ATTEMPTS && {
          lockedUntil: new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000),
        }),
      },
    });
  }

  /**
   * Reset failed login attempts on successful login
   */
  async resetFailedAttempts(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
        lockedUntil: null,
      },
    });
  }

  /**
   * Check if account is locked
   */
  async isAccountLocked(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { lockedUntil: true },
    });

    return user?.lockedUntil ? user.lockedUntil > new Date() : false;
  }

  /**
   * Update user password hash
   */
  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  /**
   * Update MFA secret and backup codes (MFA initiation, not yet enabled)
   */
  async updateMfaSecret(userId: string, mfaSecret: string, backupCodes: string[]): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaSecret,
        backupCodes,
        // Note: mfaEnabled remains false until verification
      },
    });
  }

  /**
   * Enable MFA for user (after successful verification)
   */
  async enableMfa(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
      },
    });
  }

  /**
   * Disable MFA for user
   */
  async disableMfa(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        backupCodes: [],
      },
    });
  }

  /**
   * Update backup codes (remove used code)
   */
  async updateBackupCodes(userId: string, backupCodes: string[]): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        backupCodes,
      },
    });
  }
}



