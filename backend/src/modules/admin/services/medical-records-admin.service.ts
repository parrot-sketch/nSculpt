import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { MedicalRecordsAdminRepository } from '../repositories/medical-records-admin.repository';
import { MergeRecordsDto } from '../dto/medical-records/merge-records.dto';
import { ReverseMergeDto } from '../dto/medical-records/reverse-merge.dto';
import { MedicalRecordsService } from '../../medical-records/services/medicalRecords.service';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { DataAccessLogService } from '../../audit/services/dataAccessLog.service';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { Domain } from '@prisma/client';

/**
 * Medical Records Admin Service
 * 
 * Business logic for admin-specific medical record operations.
 * CD-001: Merge Medical Records
 * CD-002: Reverse Medical Record Merge
 */
@Injectable()
export class MedicalRecordsAdminService {
  private prisma: PrismaClient;

  constructor(
    private readonly medicalRecordsAdminRepository: MedicalRecordsAdminRepository,
    private readonly medicalRecordsService: MedicalRecordsService,
    private readonly domainEventService: DomainEventService,
    private readonly correlationService: CorrelationService,
    private readonly dataAccessLogService: DataAccessLogService,
  ) {
    this.prisma = getPrismaClient();
  }

  /**
   * Merge medical records
   * CD-001: Merge Medical Records
   */
  async mergeRecords(sourceRecordId: string, mergeRecordsDto: MergeRecordsDto, adminId: string) {
    // Validate both records exist
    const sourceRecord = await this.prisma.medicalRecord.findUnique({
      where: { id: sourceRecordId },
    });
    if (!sourceRecord) {
      throw new NotFoundException(`Source record with ID ${sourceRecordId} not found`);
    }

    const targetRecord = await this.prisma.medicalRecord.findUnique({
      where: { id: mergeRecordsDto.targetRecordId },
    });
    if (!targetRecord) {
      throw new NotFoundException(`Target record with ID ${mergeRecordsDto.targetRecordId} not found`);
    }

    // Validate records are active
    if (sourceRecord.status !== 'ACTIVE') {
      throw new BadRequestException(`Source record is not active (status: ${sourceRecord.status})`);
    }
    if (targetRecord.status !== 'ACTIVE') {
      throw new BadRequestException(`Target record is not active (status: ${targetRecord.status})`);
    }

    // Prevent merging into itself
    if (sourceRecordId === mergeRecordsDto.targetRecordId) {
      throw new BadRequestException('Cannot merge record into itself');
    }

    // Use existing merge service (which handles event creation and merge history)
    const result = await this.medicalRecordsService.mergeRecords(
      sourceRecordId,
      mergeRecordsDto.targetRecordId,
      mergeRecordsDto.reason,
      adminId,
    );

    // Log admin action
    const context = this.correlationService.getContext();
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'MedicalRecord',
      resourceId: sourceRecordId,
      action: 'MERGE',
      sessionId: context.sessionId,
      reason: `Admin merged record ${sourceRecordId} into ${mergeRecordsDto.targetRecordId}: ${mergeRecordsDto.reason}`,
      accessedPHI: true, // Medical records contain PHI
      success: true,
    });

    return result;
  }

  /**
   * Reverse medical record merge
   * CD-002: Reverse Medical Record Merge
   */
  async reverseMerge(mergeId: string, reverseMergeDto: ReverseMergeDto, adminId: string) {
    // Get merge history
    const mergeHistory = await this.medicalRecordsAdminRepository.getMergeHistoryById(mergeId);
    if (!mergeHistory) {
      throw new NotFoundException(`Merge history with ID ${mergeId} not found`);
    }

    // Validate merge hasn't been reversed
    if (mergeHistory.reversedAt) {
      throw new BadRequestException(`Merge ${mergeId} has already been reversed`);
    }

    const context = this.correlationService.getContext();

    // Create reversal domain event
    const reversalEvent = await this.domainEventService.createEvent({
      eventType: 'MedicalRecord.MergeReversed',
      domain: Domain.MEDICAL_RECORDS,
      aggregateId: mergeHistory.sourceRecordId,
      aggregateType: 'MedicalRecord',
      payload: {
        mergeHistoryId: mergeId,
        sourceRecordId: mergeHistory.sourceRecordId,
        targetRecordId: mergeHistory.targetRecordId,
        reason: reverseMergeDto.reason,
      },
      createdBy: adminId,
      sessionId: context.sessionId || undefined,
      correlationId: context.correlationId || undefined,
    });

    // Update merge history with reversal info (only reversal fields can be updated)
    await this.prisma.recordMergeHistory.update({
      where: { id: mergeId },
      data: {
        reversedAt: new Date(),
        reversalEventId: reversalEvent.id,
        reversedBy: adminId,
      },
    });

    // Restore source record status
    await this.prisma.medicalRecord.update({
      where: { id: mergeHistory.sourceRecordId },
      data: {
        status: 'ACTIVE',
        mergedInto: null,
        updatedBy: adminId,
      },
    });

    // Log admin action
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'MedicalRecord',
      resourceId: mergeHistory.sourceRecordId,
      action: 'MERGE_REVERSE',
      sessionId: context.sessionId,
      reason: `Admin reversed merge ${mergeId}: ${reverseMergeDto.reason}`,
      accessedPHI: true, // Medical records contain PHI
      success: true,
    });

    return {
      success: true,
      reversalEventId: reversalEvent.id,
      mergeHistoryId: mergeId,
    };
  }

  /**
   * Get merge history for a record
   */
  async getMergeHistory(recordId: string, adminId: string) {
    // Validate record exists
    const record = await this.prisma.medicalRecord.findUnique({
      where: { id: recordId },
    });
    if (!record) {
      throw new NotFoundException(`Medical record with ID ${recordId} not found`);
    }

    const mergeHistory = await this.medicalRecordsAdminRepository.getMergeHistory(recordId);

    // Log access
    const context = this.correlationService.getContext();
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'MedicalRecord',
      resourceId: recordId,
      action: 'READ_MERGE_HISTORY',
      sessionId: context.sessionId,
      reason: 'Admin viewed merge history',
      accessedPHI: true, // Medical records contain PHI
      success: true,
    });

    return mergeHistory;
  }
}









