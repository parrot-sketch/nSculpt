import { Injectable, NotFoundException } from '@nestjs/common';
import { SessionRepository } from '../repositories/session.repository';

export interface CreateSessionParams {
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
export class SessionService {
  constructor(private readonly sessionRepository: SessionRepository) {}

  /**
   * Create new session
   */
  async createSession(params: CreateSessionParams) {
    return this.sessionRepository.create(params);
  }

  /**
   * Find session by ID
   */
  async findById(sessionId: string) {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    return session;
  }

  /**
   * Find session by refresh token hash
   */
  async findByRefreshTokenHash(refreshTokenHash: string) {
    return this.sessionRepository.findByRefreshTokenHash(refreshTokenHash);
  }

  /**
   * Find active sessions for user
   */
  async findActiveSessionsByUserId(userId: string) {
    return this.sessionRepository.findActiveByUserId(userId);
  }

  /**
   * Update session last activity
   */
  async updateLastActivity(sessionId: string) {
    return this.sessionRepository.updateLastActivity(sessionId);
  }

  /**
   * Revoke session
   */
  async revokeSession(sessionId: string, revokedBy: string, reason?: string) {
    return this.sessionRepository.revoke(sessionId, revokedBy, reason);
  }

  /**
   * Revoke all sessions for user (except current)
   */
  async revokeAllUserSessions(userId: string, exceptSessionId?: string) {
    return this.sessionRepository.revokeAllByUserId(userId, exceptSessionId);
  }

  /**
   * Clean up expired sessions (cron job)
   */
  async cleanupExpiredSessions() {
    return this.sessionRepository.deleteExpired();
  }

  /**
   * Verify session is active and valid
   */
  async verifySession(sessionId: string): Promise<boolean> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) return false;
    if (session.revokedAt) return false;
    if (session.expiresAt < new Date()) return false;
    return true;
  }
}












