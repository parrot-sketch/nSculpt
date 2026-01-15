import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { MedicalRecordsRepository } from '../repositories/medicalRecords.repository';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { IdentityContextService } from '../../../modules/auth/services/identityContext.service';
import { RlsValidationService } from '../../../modules/audit/services/rlsValidation.service';
import { CreateMedicalRecordDto } from '../dto/create-medicalRecord.dto';
import { UpdateMedicalRecordDto } from '../dto/update-medicalRecord.dto';
import { MedicalRecordEventType, RecordMergedPayload } from '../events/medicalRecords.events';
import { Domain } from '@prisma/client';

@Injectable()
export class MedicalRecordsService {
  constructor(
    private readonly medicalRecordsRepository: MedicalRecordsRepository,
    private readonly domainEventService: DomainEventService,
    private readonly correlationService: CorrelationService,
    private readonly identityContext: IdentityContextService,
    private readonly rlsValidation: RlsValidationService,
  ) {}

  async create(createMedicalRecordDto: CreateMedicalRecordDto, userId: string) {
    const record = await this.medicalRecordsRepository.createRecord(createMedicalRecordDto);

    const context = this.correlationService.getContext();

    await this.domainEventService.createEvent({
      eventType: MedicalRecordEventType.RECORD_CREATED,
      domain: Domain.MEDICAL_RECORDS,
      aggregateId: record.id,
      aggregateType: 'MedicalRecord',
      payload: {
        recordId: record.id,
        recordNumber: record.recordNumber,
        patientId: record.patientId,
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return record;
  }

  async findOne(id: string, userId?: string) {
    const record = await this.medicalRecordsRepository.findRecordById(id);
    if (!record) {
      throw new NotFoundException(`Medical record with ID ${id} not found`);
    }

    // Validate access if userId provided
    if (userId) {
      const hasAccess = await this.rlsValidation.canAccessMedicalRecord(id, userId);
      if (!hasAccess) {
        throw new ForbiddenException(`Access denied to medical record ${id}`);
      }
    }

    return record;
  }

  async update(id: string, updateMedicalRecordDto: UpdateMedicalRecordDto, userId: string) {
    // Validate access and modification rights
    await this.findOne(id, userId);
    const canModify = await this.rlsValidation.canModifyMedicalRecord(id, userId);
    if (!canModify) {
      throw new ForbiddenException(`Modification denied to medical record ${id}`);
    }
    const updatedRecord = await this.medicalRecordsRepository.updateRecord(id, updateMedicalRecordDto);

    const context = this.correlationService.getContext();

    await this.domainEventService.createEvent({
      eventType: MedicalRecordEventType.RECORD_UPDATED,
      domain: Domain.MEDICAL_RECORDS,
      aggregateId: id,
      aggregateType: 'MedicalRecord',
      payload: {
        recordId: id,
        changes: updateMedicalRecordDto,
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return updatedRecord;
  }

  async mergeRecords(
    sourceRecordId: string,
    targetRecordId: string,
    reason?: string,
    userId?: string,
  ) {
    if (!userId) {
      throw new ForbiddenException('User ID required for record merge');
    }

    // Verify both records exist and user has access
    await this.findOne(sourceRecordId, userId);
    await this.findOne(targetRecordId, userId);

    // Verify user can modify both records
    const canModifySource = await this.rlsValidation.canModifyMedicalRecord(sourceRecordId, userId);
    const canModifyTarget = await this.rlsValidation.canModifyMedicalRecord(targetRecordId, userId);
    if (!canModifySource || !canModifyTarget) {
      throw new ForbiddenException('Modification denied to one or both medical records');
    }

    const context = this.correlationService.getContext();

    // CRITICAL: Create merge event first
    const mergeEvent = await this.domainEventService.createEvent({
      eventType: MedicalRecordEventType.RECORD_MERGED,
      domain: Domain.MEDICAL_RECORDS,
      aggregateId: targetRecordId,
      aggregateType: 'MedicalRecord',
      payload: {
        sourceRecordId,
        targetRecordId,
        reason,
      } as RecordMergedPayload,
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    // Create merge history (CRITICAL: Must be event-anchored)
    await this.medicalRecordsRepository.createMergeHistory({
      sourceRecordId,
      targetRecordId,
      triggeringEventId: mergeEvent.id,
      reason,
      mergedBy: userId,
    });

    // Update source record to mark as merged
    await this.medicalRecordsRepository.updateRecord(sourceRecordId, {
      status: 'MERGED',
      mergedInto: targetRecordId,
    } as any);

    return { success: true, mergeEventId: mergeEvent.id };
  }

  async findAll(skip?: number, take?: number, userId?: string) {
    if (!userId) {
      return [];
    }

    // ADMIN sees all records
    if (this.identityContext.hasRole('ADMIN')) {
      return this.medicalRecordsRepository.findAllRecords(skip, take);
    }

    // Filter by patient relationships
    return this.medicalRecordsRepository.findAllFiltered(skip, take, userId);
  }
}

