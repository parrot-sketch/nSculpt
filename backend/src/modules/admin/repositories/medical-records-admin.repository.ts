import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';

/**
 * Medical Records Admin Repository
 * 
 * Data access layer for admin-specific medical record operations.
 * Read-only access to merge history for auditing.
 */
@Injectable()
export class MedicalRecordsAdminRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Get merge history for a record
   */
  async getMergeHistory(recordId: string) {
    return await this.prisma.recordMergeHistory.findMany({
      where: {
        OR: [
          { sourceRecordId: recordId },
          { targetRecordId: recordId },
        ],
      },
      orderBy: { mergedAt: 'desc' },
      include: {
        sourceRecord: {
          select: {
            id: true,
            recordNumber: true,
            patientId: true,
            status: true,
          },
        },
        targetRecord: {
          select: {
            id: true,
            recordNumber: true,
            patientId: true,
            status: true,
          },
        },
        triggeringEvent: {
          select: {
            id: true,
            eventType: true,
            occurredAt: true,
            createdBy: true,
          },
        },
        reversalEvent: {
          select: {
            id: true,
            eventType: true,
            occurredAt: true,
            createdBy: true,
          },
        },
      },
    });
  }

  /**
   * Get merge history by ID
   */
  async getMergeHistoryById(mergeId: string) {
    return await this.prisma.recordMergeHistory.findUnique({
      where: { id: mergeId },
      include: {
        sourceRecord: {
          select: {
            id: true,
            recordNumber: true,
            patientId: true,
            status: true,
          },
        },
        targetRecord: {
          select: {
            id: true,
            recordNumber: true,
            patientId: true,
            status: true,
          },
        },
        triggeringEvent: {
          select: {
            id: true,
            eventType: true,
            occurredAt: true,
          },
        },
        reversalEvent: {
          select: {
            id: true,
            eventType: true,
            occurredAt: true,
          },
        },
      },
    });
  }
}









