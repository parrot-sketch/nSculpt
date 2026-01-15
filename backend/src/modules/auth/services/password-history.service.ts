import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * Password History Service
 * 
 * Tracks password changes and enforces password reuse policy.
 * Part of Phase 2 User Management security enhancements.
 * 
 * Features:
 * - Record password changes with audit trail
 * - Prevent reuse of recent passwords
 * - Configurable history depth (default: 5 passwords)
 */
@Injectable()
export class PasswordHistoryService {
  private prisma: PrismaClient;
  private readonly PASSWORD_HISTORY_DEPTH = 5; // Number of previous passwords to check

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Record password change in history
   * 
   * @param userId - User ID
   * @param passwordHash - New password hash (bcrypt)
   * @param changedBy - Who changed the password (userId for self, adminId for admin reset)
   * @param ipAddress - IP address from request
   * @param userAgent - User agent from request
   * @param reason - Reason for password change
   */
  async recordPasswordChange(
    userId: string,
    passwordHash: string,
    changedBy: string,
    ipAddress?: string,
    userAgent?: string,
    reason?: string,
  ): Promise<void> {
    await this.prisma.passwordHistory.create({
      data: {
        userId,
        passwordHash,
        changedBy,
        ipAddress,
        userAgent,
        reason,
      },
    });
  }

  /**
   * Check if password was used recently
   * 
   * Compares new password against recent password hashes.
   * Prevents reuse of last N passwords (configured by PASSWORD_HISTORY_DEPTH).
   * 
   * @param userId - User ID
   * @param newPassword - New plaintext password to check
   * @throws BadRequestException if password was used recently
   */
  async checkPasswordReuse(userId: string, newPassword: string): Promise<void> {
    // Get recent password hashes
    const recentPasswords = await this.prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { changedAt: 'desc' },
      take: this.PASSWORD_HISTORY_DEPTH,
      select: { passwordHash: true },
    });

    // Also check current password hash
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (currentUser) {
      recentPasswords.unshift({ passwordHash: currentUser.passwordHash });
    }

    // Check new password against recent hashes
    for (const record of recentPasswords) {
      const isMatch = await bcrypt.compare(newPassword, record.passwordHash);
      if (isMatch) {
        throw new BadRequestException({
          message: `Password was used recently. Please choose a different password that you have not used in your last ${this.PASSWORD_HISTORY_DEPTH} password changes.`,
          field: 'password',
        });
      }
    }
  }

  /**
   * Get password history for user
   * 
   * @param userId - User ID
   * @param limit - Number of records to return (default: 10)
   * @returns Password change history (without hashes)
   */
  async getPasswordHistory(userId: string, limit: number = 10) {
    return this.prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { changedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        changedAt: true,
        changedBy: true,
        ipAddress: true,
        userAgent: true,
        reason: true,
      },
    });
  }

  /**
   * Clean up old password history
   * 
   * Keeps only the most recent N passwords per user.
   * Should be run periodically (e.g., daily cron job).
   * 
   * @param keepCount - Number of passwords to keep per user (default: PASSWORD_HISTORY_DEPTH)
   */
  async cleanupOldHistory(keepCount: number = this.PASSWORD_HISTORY_DEPTH): Promise<number> {
    // Get all users
    const users = await this.prisma.user.findMany({
      select: { id: true },
    });

    let deletedCount = 0;

    for (const user of users) {
      // Get IDs of passwords to keep (most recent)
      const toKeep = await this.prisma.passwordHistory.findMany({
        where: { userId: user.id },
        orderBy: { changedAt: 'desc' },
        take: keepCount,
        select: { id: true },
      });

      const keepIds = toKeep.map((p) => p.id);

      // Delete all others
      const result = await this.prisma.passwordHistory.deleteMany({
        where: {
          userId: user.id,
          id: { notIn: keepIds },
        },
      });

      deletedCount += result.count;
    }

    return deletedCount;
  }
}
