import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';

export interface CreateSessionData {
  userId: string;
  accessTokenHash: string;
  refreshTokenHash: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
  mfaVerified?: boolean;
  mfaMethod?: string;
}

@Injectable()
export class SessionRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Create new session
   */
  async create(data: CreateSessionData) {
    return this.prisma.session.create({
      data: {
        userId: data.userId,
        tokenHash: data.accessTokenHash,
        refreshTokenHash: data.refreshTokenHash,
        deviceInfo: data.deviceInfo,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        expiresAt: data.expiresAt,
        mfaVerified: data.mfaVerified || false,
        mfaMethod: data.mfaMethod,
      },
    });
  }

  /**
   * Find session by ID
   */
  async findById(sessionId: string) {
    return this.prisma.session.findUnique({
      where: { id: sessionId },
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
      },
    });
  }

  /**
   * Find session by refresh token hash
   */
  async findByRefreshTokenHash(refreshTokenHash: string) {
    return this.prisma.session.findFirst({
      where: {
        refreshTokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isActive: true,
          },
        },
      },
    });
  }

  /**
   * Find active sessions for user
   */
  async findActiveByUserId(userId: string) {
    return this.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActivityAt: 'desc' },
    });
  }

  /**
   * Update session last activity
   */
  async updateLastActivity(sessionId: string) {
    return this.prisma.session.update({
      where: { id: sessionId },
      data: { lastActivityAt: new Date() },
    });
  }

  /**
   * Revoke session
   */
  async revoke(sessionId: string, revokedBy: string, reason?: string) {
    return this.prisma.session.update({
      where: { id: sessionId },
      data: {
        revokedAt: new Date(),
        revokedBy,
        revokedReason: reason,
      },
    });
  }

  /**
   * Revoke all sessions for user (except current)
   */
  async revokeAllByUserId(userId: string, exceptSessionId?: string) {
    const where: any = {
      userId,
      revokedAt: null,
    };

    if (exceptSessionId) {
      where.id = { not: exceptSessionId };
    }

    return this.prisma.session.updateMany({
      where,
      data: {
        revokedAt: new Date(),
        revokedBy: userId,
        revokedReason: 'Revoked all sessions',
      },
    });
  }

  /**
   * Delete expired sessions (cleanup job)
   */
  async deleteExpired() {
    return this.prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }
}












