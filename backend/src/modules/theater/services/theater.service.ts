import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { TheaterRepository } from '../repositories/theater.repository';
import { InventoryService } from '../../inventory/services/inventory.service';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { IdentityContextService } from '../../../modules/auth/services/identityContext.service';
import { RlsValidationService } from '../../../modules/audit/services/rlsValidation.service';
import { CreateCaseDto } from '../dto/create-case.dto';
import { UpdateCaseDto } from '../dto/update-case.dto';
import { RecordSurgeryUsageDto } from '../dto/record-surgery-usage.dto';
import { TheaterEventType, CaseStatusChangedPayload } from '../events/theater.events';
import { InventoryEventType } from '../../inventory/events/inventory.events';
import { Domain } from '@prisma/client';

@Injectable()
export class TheaterService {
  constructor(
    private readonly theaterRepository: TheaterRepository,
    private readonly inventoryService: InventoryService,
    private readonly domainEventService: DomainEventService,
    private readonly correlationService: CorrelationService,
    private readonly identityContext: IdentityContextService,
    private readonly rlsValidation: RlsValidationService,
  ) {}

  async createCase(createCaseDto: CreateCaseDto, userId: string) {
    // Check if case number already exists
    const existing = await this.theaterRepository.findCaseByNumber(createCaseDto.caseNumber);
    if (existing) {
      throw new BadRequestException(`Case number ${createCaseDto.caseNumber} already exists`);
    }

    // CRITICAL: Validate workflow - surgery requires signed consent
    // This validation should be done via PatientWorkflowService
    // For now, we'll add basic validation here
    // TODO: Inject PatientWorkflowService and use validateSurgicalCaseCreation()

    // Create case
    const surgicalCase = await this.theaterRepository.createCase(createCaseDto);

    // Get correlation context
    const context = this.correlationService.getContext();

    // Emit domain event
    const event = await this.domainEventService.createEvent({
      eventType: TheaterEventType.CASE_CREATED,
      domain: Domain.THEATER,
      aggregateId: surgicalCase.id,
      aggregateType: 'SurgicalCase',
      payload: {
        caseId: surgicalCase.id,
        caseNumber: surgicalCase.caseNumber,
        patientId: surgicalCase.patientId,
        procedureName: surgicalCase.procedureName,
        scheduledStartAt: surgicalCase.scheduledStartAt.toISOString(),
        scheduledEndAt: surgicalCase.scheduledEndAt.toISOString(),
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    // Create initial status history entry
    await this.theaterRepository.createStatusHistory({
      caseId: surgicalCase.id,
      fromStatus: null,
      toStatus: surgicalCase.status,
      triggeringEventId: event.id,
      changedBy: userId,
    });

    return surgicalCase;
  }

  async findOne(id: string, userId?: string) {
    const surgicalCase = await this.theaterRepository.findCaseById(id);
    if (!surgicalCase) {
      throw new NotFoundException(`Surgical case with ID ${id} not found`);
    }

    // Validate access if userId provided (RLS check - RlsGuard also validates, but defensive check here)
    if (userId) {
      const hasAccess = await this.rlsValidation.canAccessSurgicalCase(id, userId);
      if (!hasAccess) {
        throw new ForbiddenException(`Access denied to surgical case ${id}`);
      }
    }

    return surgicalCase;
  }

  async updateCase(id: string, updateCaseDto: UpdateCaseDto, userId: string) {
    // Validate access and modification rights
    const existingCase = await this.findOne(id, userId);
    const canModify = await this.rlsValidation.canModifySurgicalCase(id, userId);
    if (!canModify) {
      throw new ForbiddenException(`Modification denied to surgical case ${id}`);
    }

    // If status is being changed, handle it specially
    if (updateCaseDto.status && updateCaseDto.status !== existingCase.status) {
      return this.updateCaseStatus(id, existingCase.status, updateCaseDto.status, updateCaseDto.reason, userId);
    }

    // Regular update
    const updatedCase = await this.theaterRepository.updateCase(id, updateCaseDto);

    // Get correlation context
    const context = this.correlationService.getContext();

    // Emit domain event
    await this.domainEventService.createEvent({
      eventType: TheaterEventType.CASE_UPDATED,
      domain: Domain.THEATER,
      aggregateId: id,
      aggregateType: 'SurgicalCase',
      payload: {
        caseId: id,
        changes: updateCaseDto,
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return updatedCase;
  }

  async updateCaseStatus(
    caseId: string,
    fromStatus: string,
    toStatus: string,
    reason?: string,
    userId?: string,
  ) {
    // Validate access and modification rights
    if (userId) {
      const canModify = await this.rlsValidation.canModifySurgicalCase(caseId, userId);
      if (!canModify) {
        throw new ForbiddenException(`Status modification denied to surgical case ${caseId}`);
      }
    }

    // Get existing case
    const existingCase = await this.findOne(caseId, userId);

    // Update status
    const updatedCase = await this.theaterRepository.updateCase(caseId, { status: toStatus });

    // Get correlation context
    const context = this.correlationService.getContext();

    // Emit domain event for status change
    const event = await this.domainEventService.createEvent({
      eventType: TheaterEventType.CASE_STATUS_CHANGED,
      domain: Domain.THEATER,
      aggregateId: caseId,
      aggregateType: 'SurgicalCase',
      payload: {
        caseId,
        fromStatus: existingCase.status,
        toStatus,
        reason,
      } as CaseStatusChangedPayload,
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    // Create status history entry (CRITICAL: Must be event-anchored)
    await this.theaterRepository.createStatusHistory({
      caseId,
      fromStatus: existingCase.status,
      toStatus,
      triggeringEventId: event.id,
      reason,
      changedBy: userId,
    });

    return updatedCase;
  }

  async findAll(skip?: number, take?: number, userId?: string) {
    if (!userId) {
      return [];
    }

    // ADMIN sees all cases
    if (this.identityContext.hasRole('ADMIN')) {
      return this.theaterRepository.findAllCases(skip, take);
    }

    // Filter by user's access:
    // 1. Cases where user is primarySurgeonId
    // 2. Cases where user is allocated via ResourceAllocation
    // 3. Cases in user's department
    return this.theaterRepository.findAllFiltered(skip, take, userId);
  }

  /**
   * Phase 2: Record inventory usage during surgery
   * Consumes inventory and creates usage record linked to surgical case
   */
  async recordSurgeryUsage(
    caseId: string,
    recordSurgeryUsageDto: RecordSurgeryUsageDto,
    userId: string,
  ) {
    // Validate case access
    const surgicalCase = await this.findOne(caseId, userId);
    if (!surgicalCase) {
      throw new NotFoundException(`Surgical case with ID ${caseId} not found`);
    }

    // Role check: Only SURGEON, NURSE, ADMIN can record usage
    const userRoles = this.identityContext.getRoles();
    if (
      !userRoles.includes('ADMIN') &&
      !userRoles.includes('SURGEON') &&
      !userRoles.includes('NURSE')
    ) {
      throw new ForbiddenException(
        'Only SURGEON, NURSE, and ADMIN can record surgery inventory usage',
      );
    }

    // Get correlation context
    const context = this.correlationService.getContext();

    // Create domain event for inventory consumption
    const consumptionEvent = await this.domainEventService.createEvent({
      eventType: InventoryEventType.INVENTORY_CONSUMED,
      domain: Domain.INVENTORY,
      aggregateId: recordSurgeryUsageDto.inventoryItemId,
      aggregateType: 'InventoryItem',
      payload: {
        itemId: recordSurgeryUsageDto.inventoryItemId,
        quantity: recordSurgeryUsageDto.quantity,
        caseId,
        patientId: surgicalCase.patientId,
        procedureName: surgicalCase.procedureName,
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    // Phase 2: Consume from inventory (FIFO) with usage record
    const { transactions, usage } =
      await this.inventoryService.consumeStockForClinicalUse(
        {
          itemId: recordSurgeryUsageDto.inventoryItemId,
          quantity: recordSurgeryUsageDto.quantity,
          caseId,
          patientId: surgicalCase.patientId,
          reason: `Surgical case usage: ${surgicalCase.procedureName}`,
          notes: recordSurgeryUsageDto.notes,
        },
        userId,
        consumptionEvent.id,
      );

    // Emit surgery usage event
    await this.domainEventService.createEvent({
      eventType: TheaterEventType.SURGICAL_ITEM_USED,
      domain: Domain.THEATER,
      aggregateId: caseId,
      aggregateType: 'SurgicalCase',
      payload: {
        caseId,
        itemId: recordSurgeryUsageDto.inventoryItemId,
        quantity: recordSurgeryUsageDto.quantity,
        inventoryUsageId: usage?.id,
        timestamp: new Date().toISOString(),
      },
      correlationId: context.correlationId || undefined,
      causationId: consumptionEvent.id,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return {
      usage,
      transactions,
      surgicalCase,
    };
  }
}

