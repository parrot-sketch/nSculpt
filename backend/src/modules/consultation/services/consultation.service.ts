import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConsultationRepository } from '../repositories/consultation.repository';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { IdentityContextService } from '../../../modules/auth/services/identityContext.service';
import { RlsValidationService } from '../../../modules/audit/services/rlsValidation.service';
import { BillingRepository } from '../../billing/repositories/billing.repository';
import { CreateConsultationDto } from '../dto/create-consultation.dto';
import { UpdateConsultationDto } from '../dto/update-consultation.dto';
import { FinalizePlanDto } from '../dto/finalize-plan.dto';
import { ScheduleFollowUpDto } from '../dto/schedule-follow-up.dto';
import { ReferConsultationDto } from '../dto/refer-consultation.dto';
import { OverrideStateDto } from '../dto/override-state.dto';
import { ConsultationEventType } from '../events/consultation.events';
import { BillingEventType } from '../../billing/events/billing.events';
import { Domain, PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { ConsultationStatus } from '../types/consultation-status';
import { ConsultationOutcome } from '../types/consultation-outcome';
import { ProcedurePlanService } from '../../procedure-plan/services/procedure-plan.service';
import { FollowUpPlanService } from '../../follow-up-plan/services/follow-up-plan.service';

/**
 * Consultation Service
 * 
 * Implements state machine-based consultation lifecycle with role-based permissions.
 * 
 * State Transitions:
 * - SCHEDULED → CHECKED_IN (FRONT_DESK, ADMIN)
 * - CHECKED_IN → IN_TRIAGE (NURSE, ADMIN)
 * - IN_TRIAGE → IN_CONSULTATION (DOCTOR, SURGEON, ADMIN)
 * - IN_CONSULTATION → PLAN_CREATED (DOCTOR, SURGEON, ADMIN)
 * - PLAN_CREATED → CLOSED (DOCTOR, SURGEON, ADMIN)
 * - PLAN_CREATED → FOLLOW_UP (DOCTOR, SURGEON, ADMIN)
 * - PLAN_CREATED → REFERRED (DOCTOR, SURGEON, ADMIN)
 * - PLAN_CREATED → SURGERY_SCHEDULED (DOCTOR, SURGEON, ADMIN)
 * 
 * ADMIN can override any state transition (must be audited)
 */
@Injectable()
export class ConsultationService {
  private prisma: PrismaClient;

  // Valid state transitions
  private readonly validTransitions: Map<
    ConsultationStatus,
    ConsultationStatus[]
  > = new Map([
    [ConsultationStatus.SCHEDULED, [ConsultationStatus.CHECKED_IN]],
    [ConsultationStatus.CHECKED_IN, [ConsultationStatus.IN_TRIAGE]],
    [ConsultationStatus.IN_TRIAGE, [ConsultationStatus.IN_CONSULTATION]],
    [
      ConsultationStatus.IN_CONSULTATION,
      [ConsultationStatus.PLAN_CREATED],
    ],
    [
      ConsultationStatus.PLAN_CREATED,
      [
        ConsultationStatus.CLOSED,
        ConsultationStatus.FOLLOW_UP,
        ConsultationStatus.REFERRED,
        ConsultationStatus.SURGERY_SCHEDULED,
      ],
    ],
  ]);

  constructor(
    private readonly consultationRepository: ConsultationRepository,
    private readonly domainEventService: DomainEventService,
    private readonly correlationService: CorrelationService,
    private readonly identityContext: IdentityContextService,
    private readonly rlsValidation: RlsValidationService,
    private readonly billingRepository: BillingRepository,
    private readonly procedurePlanService: ProcedurePlanService,
    private readonly followUpPlanService: FollowUpPlanService,
  ) {
    this.prisma = getPrismaClient();
  }

  /**
   * Create a new consultation
   * Only ADMIN and FRONT_DESK can create consultations
   * Starts with SCHEDULED status
   */
  async createConsultation(
    createConsultationDto: CreateConsultationDto,
    userId: string,
  ) {
    // Role check: Only ADMIN and FRONT_DESK can create
    if (
      !this.identityContext.hasRole('ADMIN') &&
      !this.identityContext.hasRole('FRONT_DESK')
    ) {
      throw new ForbiddenException(
        'Only ADMIN and FRONT_DESK can create consultations',
      );
    }

    // Validate patient access
    const hasAccess = await this.rlsValidation.canAccessPatient(
      createConsultationDto.patientId,
      userId,
    );
    if (!hasAccess) {
      throw new ForbiddenException(
        `Access denied to patient ${createConsultationDto.patientId}`,
      );
    }

    // Create consultation
    const consultation = await this.consultationRepository.create({
      ...createConsultationDto,
      createdBy: userId,
    });

    // Get correlation context
    const context = this.correlationService.getContext();

    // Emit domain event
    await this.domainEventService.createEvent({
      eventType: ConsultationEventType.CREATED,
      domain: Domain.CONSULTATION,
      aggregateId: consultation.id,
      aggregateType: 'Consultation',
      payload: {
        consultationId: consultation.id,
        patientId: consultation.patientId,
        doctorId: consultation.doctorId,
        visitType: consultation.visitType,
        status: consultation.status,
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return consultation;
  }

  /**
   * Check in patient
   * Transitions from SCHEDULED to CHECKED_IN
   * Creates billing entry for consultation fee
   */
  async checkIn(id: string, userId: string) {
    const consultation = await this.consultationRepository.findById(id);
    if (!consultation) {
      throw new NotFoundException(`Consultation with ID ${id} not found`);
    }

    // Role check: Only FRONT_DESK, ADMIN can check in
    if (
      !this.identityContext.hasRole('ADMIN') &&
      !this.identityContext.hasRole('FRONT_DESK')
    ) {
      throw new ForbiddenException(
        'Only FRONT_DESK and ADMIN can check in patients',
      );
    }

    // State machine validation
    this.validateStateTransition(
      consultation.status,
      ConsultationStatus.CHECKED_IN,
      userId,
    );

    // Update status
    const updated = await this.consultationRepository.changeStatus(
      id,
      ConsultationStatus.CHECKED_IN,
      {
        completedAt: new Date(),
        updatedBy: userId,
        version: consultation.version,
      },
    );

    // Get correlation context
    const context = this.correlationService.getContext();

    // Create billing entry for consultation fee
    let billingEventId: string | undefined;
    try {
      billingEventId = await this.createConsultationBillingEntry(
        consultation,
        userId,
        context,
      );
    } catch (error) {
      // Log error but don't fail the check-in
      console.error('Failed to create billing entry for consultation:', error);
    }

    // Emit domain event
    const checkInEvent = await this.domainEventService.createEvent({
      eventType: ConsultationEventType.CHECKED_IN,
      domain: Domain.CONSULTATION,
      aggregateId: id,
      aggregateType: 'Consultation',
      payload: {
        consultationId: id,
        patientId: consultation.patientId,
        billingEventId,
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return updated;
  }

  /**
   * Start triage
   * Transitions from CHECKED_IN to IN_TRIAGE
   */
  async startTriage(id: string, userId: string) {
    const consultation = await this.consultationRepository.findById(id);
    if (!consultation) {
      throw new NotFoundException(`Consultation with ID ${id} not found`);
    }

    // Role check: Only NURSE, ADMIN can start triage
    if (
      !this.identityContext.hasRole('ADMIN') &&
      !this.identityContext.hasRole('NURSE')
    ) {
      throw new ForbiddenException(
        'Only NURSE and ADMIN can start triage',
      );
    }

    // State machine validation
    this.validateStateTransition(
      consultation.status,
      ConsultationStatus.IN_TRIAGE,
      userId,
    );

    // Update status
    const updated = await this.consultationRepository.changeStatus(
      id,
      ConsultationStatus.IN_TRIAGE,
      {
        updatedBy: userId,
        version: consultation.version,
      },
    );

    // Get correlation context
    const context = this.correlationService.getContext();

    // Emit domain event
    await this.domainEventService.createEvent({
      eventType: ConsultationEventType.TRIAGE_STARTED,
      domain: Domain.CONSULTATION,
      aggregateId: id,
      aggregateType: 'Consultation',
      payload: {
        consultationId: id,
        patientId: consultation.patientId,
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return updated;
  }

  /**
   * Start consultation
   * Transitions from IN_TRIAGE to IN_CONSULTATION
   */
  async startConsultation(id: string, userId: string) {
    const consultation = await this.consultationRepository.findById(id);
    if (!consultation) {
      throw new NotFoundException(`Consultation with ID ${id} not found`);
    }

    // Role check: Only DOCTOR, SURGEON, ADMIN can start consultation
    if (
      !this.identityContext.hasRole('ADMIN') &&
      !this.identityContext.hasRole('DOCTOR') &&
      !this.identityContext.hasRole('SURGEON')
    ) {
      throw new ForbiddenException(
        'Only DOCTOR, SURGEON, and ADMIN can start consultations',
      );
    }

    // State machine validation
    this.validateStateTransition(
      consultation.status,
      ConsultationStatus.IN_CONSULTATION,
      userId,
    );

    // Update status
    const updated = await this.consultationRepository.changeStatus(
      id,
      ConsultationStatus.IN_CONSULTATION,
      {
        updatedBy: userId,
        version: consultation.version,
      },
    );

    // Get correlation context
    const context = this.correlationService.getContext();

    // Emit domain event
    await this.domainEventService.createEvent({
      eventType: ConsultationEventType.CONSULTATION_STARTED,
      domain: Domain.CONSULTATION,
      aggregateId: id,
      aggregateType: 'Consultation',
      payload: {
        consultationId: id,
        patientId: consultation.patientId,
        doctorId: userId,
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return updated;
  }

  /**
   * Finalize plan
   * Transitions from IN_CONSULTATION to PLAN_CREATED
   * Sets consultationOutcome and creates ProcedurePlan or FollowUpPlan if required
   */
  async finalizePlan(
    id: string,
    finalizePlanDto: FinalizePlanDto,
    userId: string,
  ) {
    const consultation = await this.consultationRepository.findById(id);
    if (!consultation) {
      throw new NotFoundException(`Consultation with ID ${id} not found`);
    }

    // Role check: Only DOCTOR, SURGEON, ADMIN can finalize plan
    if (
      !this.identityContext.hasRole('ADMIN') &&
      !this.identityContext.hasRole('DOCTOR') &&
      !this.identityContext.hasRole('SURGEON')
    ) {
      throw new ForbiddenException(
        'Only DOCTOR, SURGEON, and ADMIN can finalize plans',
      );
    }

    // State machine validation
    this.validateStateTransition(
      consultation.status,
      ConsultationStatus.PLAN_CREATED,
      userId,
    );

    // Validate outcome → workflow mapping
    const outcome = finalizePlanDto.outcome;
    
    // Validate outcome requirements
    if (outcome === ConsultationOutcome.PROCEDURE_PLANNED && !finalizePlanDto.procedurePlan) {
      throw new BadRequestException(
        'PROCEDURE_PLANNED outcome requires procedurePlan to be provided',
      );
    }

    if (outcome === ConsultationOutcome.FOLLOW_UP && !finalizePlanDto.followUpPlan) {
      throw new BadRequestException(
        'FOLLOW_UP outcome requires followUpPlan to be provided',
      );
    }

    // Update consultation with plan details and outcome
    await this.prisma.consultation.update({
      where: { id },
      data: {
        notes: finalizePlanDto.clinicalSummary,
        diagnosis: finalizePlanDto.diagnoses ? JSON.stringify(finalizePlanDto.diagnoses) : undefined,
        consultationOutcome: outcome as any,
        updatedBy: userId,
        version: { increment: 1 },
      },
    });

    // Update status
    const updated = await this.consultationRepository.changeStatus(
      id,
      ConsultationStatus.PLAN_CREATED,
      {
        updatedBy: userId,
      },
    );

    // Create ProcedurePlan if outcome is PROCEDURE_PLANNED
    let procedurePlan = null;
    if (outcome === ConsultationOutcome.PROCEDURE_PLANNED && finalizePlanDto.procedurePlan) {
      procedurePlan = await this.procedurePlanService.createPlan(
        {
          consultationId: id,
          surgeonId: consultation.doctorId,
          ...finalizePlanDto.procedurePlan,
        },
        userId,
      );
    }

    // Create FollowUpPlan if outcome is FOLLOW_UP
    let followUpPlan = null;
    if (outcome === ConsultationOutcome.FOLLOW_UP && finalizePlanDto.followUpPlan) {
      followUpPlan = await this.followUpPlanService.createFollowUp(
        {
          consultationId: id,
          doctorId: consultation.doctorId,
          ...finalizePlanDto.followUpPlan,
        },
        userId,
      );
    }

    // Get correlation context
    const context = this.correlationService.getContext();

    // Emit domain event
    await this.domainEventService.createEvent({
      eventType: ConsultationEventType.PLAN_CREATED,
      domain: Domain.CONSULTATION,
      aggregateId: id,
      aggregateType: 'Consultation',
      payload: {
        consultationId: id,
        patientId: consultation.patientId,
        outcome,
        clinicalSummary: finalizePlanDto.clinicalSummary,
        diagnoses: finalizePlanDto.diagnoses,
        procedurePlanId: procedurePlan?.id,
        followUpPlanId: followUpPlan?.id,
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return {
      ...updated,
      procedurePlan,
      followUpPlan,
    };
  }

  /**
   * Close consultation
   * Transitions from PLAN_CREATED to CLOSED
   */
  async closeConsultation(id: string, userId: string) {
    const consultation = await this.consultationRepository.findById(id);
    if (!consultation) {
      throw new NotFoundException(`Consultation with ID ${id} not found`);
    }

    // Role check: Only DOCTOR, SURGEON, ADMIN can close
    if (
      !this.identityContext.hasRole('ADMIN') &&
      !this.identityContext.hasRole('DOCTOR') &&
      !this.identityContext.hasRole('SURGEON')
    ) {
      throw new ForbiddenException(
        'Only DOCTOR, SURGEON, and ADMIN can close consultations',
      );
    }

    // State machine validation
    this.validateStateTransition(
      consultation.status,
      ConsultationStatus.CLOSED,
      userId,
    );

    // Update status
    const updated = await this.consultationRepository.changeStatus(
      id,
      ConsultationStatus.CLOSED,
      {
        completedAt: new Date(),
        updatedBy: userId,
        version: consultation.version,
      },
    );

    // Get correlation context
    const context = this.correlationService.getContext();

    // Emit domain event
    await this.domainEventService.createEvent({
      eventType: ConsultationEventType.CLOSED,
      domain: Domain.CONSULTATION,
      aggregateId: id,
      aggregateType: 'Consultation',
      payload: {
        consultationId: id,
        patientId: consultation.patientId,
        endedAt: new Date().toISOString(),
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return updated;
  }

  /**
   * Schedule follow-up
   * Transitions from PLAN_CREATED to FOLLOW_UP
   */
  async scheduleFollowUp(
    id: string,
    scheduleFollowUpDto: ScheduleFollowUpDto,
    userId: string,
  ) {
    const consultation = await this.consultationRepository.findById(id);
    if (!consultation) {
      throw new NotFoundException(`Consultation with ID ${id} not found`);
    }

    // Role check: Only DOCTOR, SURGEON, ADMIN can schedule follow-up
    if (
      !this.identityContext.hasRole('ADMIN') &&
      !this.identityContext.hasRole('DOCTOR') &&
      !this.identityContext.hasRole('SURGEON')
    ) {
      throw new ForbiddenException(
        'Only DOCTOR, SURGEON, and ADMIN can schedule follow-ups',
      );
    }

    // State machine validation
    this.validateStateTransition(
      consultation.status,
      ConsultationStatus.FOLLOW_UP,
      userId,
    );

    // Update status
    const updated = await this.consultationRepository.changeStatus(
      id,
      ConsultationStatus.FOLLOW_UP,
      {
        completedAt: new Date(),
        updatedBy: userId,
        version: consultation.version,
      },
    );

    // Get correlation context
    const context = this.correlationService.getContext();

    // Emit domain event
    await this.domainEventService.createEvent({
      eventType: ConsultationEventType.FOLLOW_UP_SCHEDULED,
      domain: Domain.CONSULTATION,
      aggregateId: id,
      aggregateType: 'Consultation',
      payload: {
        consultationId: id,
        patientId: consultation.patientId,
        scheduledDate: scheduleFollowUpDto.scheduledDate,
        notes: scheduleFollowUpDto.notes,
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return updated;
  }

  /**
   * Refer patient
   * Transitions from PLAN_CREATED to REFERRED
   */
  async referPatient(
    id: string,
    referConsultationDto: ReferConsultationDto,
    userId: string,
  ) {
    const consultation = await this.consultationRepository.findById(id);
    if (!consultation) {
      throw new NotFoundException(`Consultation with ID ${id} not found`);
    }

    // Role check: Only DOCTOR, SURGEON, ADMIN can refer
    if (
      !this.identityContext.hasRole('ADMIN') &&
      !this.identityContext.hasRole('DOCTOR') &&
      !this.identityContext.hasRole('SURGEON')
    ) {
      throw new ForbiddenException(
        'Only DOCTOR, SURGEON, and ADMIN can refer patients',
      );
    }

    // State machine validation
    this.validateStateTransition(
      consultation.status,
      ConsultationStatus.REFERRED,
      userId,
    );

    // Update status
    const updated = await this.consultationRepository.changeStatus(
      id,
      ConsultationStatus.REFERRED,
      {
        completedAt: new Date(),
        updatedBy: userId,
        version: consultation.version,
      },
    );

    // Get correlation context
    const context = this.correlationService.getContext();

    // Emit domain event
    await this.domainEventService.createEvent({
      eventType: ConsultationEventType.REFERRED,
      domain: Domain.CONSULTATION,
      aggregateId: id,
      aggregateType: 'Consultation',
      payload: {
        consultationId: id,
        patientId: consultation.patientId,
        referralReason: referConsultationDto.referralReason,
        referredToDoctorId: referConsultationDto.referredToDoctorId,
        referralNotes: referConsultationDto.referralNotes,
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return updated;
  }

  /**
   * Schedule surgery request
   * Transitions from PLAN_CREATED to SURGERY_SCHEDULED
   */
  async scheduleSurgeryRequest(id: string, userId: string) {
    const consultation = await this.consultationRepository.findById(id);
    if (!consultation) {
      throw new NotFoundException(`Consultation with ID ${id} not found`);
    }

    // Role check: Only DOCTOR, SURGEON, ADMIN can schedule surgery
    if (
      !this.identityContext.hasRole('ADMIN') &&
      !this.identityContext.hasRole('DOCTOR') &&
      !this.identityContext.hasRole('SURGEON')
    ) {
      throw new ForbiddenException(
        'Only DOCTOR, SURGEON, and ADMIN can schedule surgery requests',
      );
    }

    // State machine validation
    this.validateStateTransition(
      consultation.status,
      ConsultationStatus.SURGERY_SCHEDULED,
      userId,
    );

    // Update status
    const updated = await this.consultationRepository.changeStatus(
      id,
      ConsultationStatus.SURGERY_SCHEDULED,
      {
        completedAt: new Date(),
        updatedBy: userId,
        version: consultation.version,
      },
    );

    // Get correlation context
    const context = this.correlationService.getContext();

    // Emit domain event
    await this.domainEventService.createEvent({
      eventType: ConsultationEventType.SURGERY_SCHEDULED,
      domain: Domain.CONSULTATION,
      aggregateId: id,
      aggregateType: 'Consultation',
      payload: {
        consultationId: id,
        patientId: consultation.patientId,
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return updated;
  }

  /**
   * Override state (ADMIN only)
   * Allows ADMIN to bypass state machine rules
   * Must be audited
   */
  async overrideState(
    id: string,
    overrideStateDto: OverrideStateDto,
    userId: string,
  ) {
    const consultation = await this.consultationRepository.findById(id);
    if (!consultation) {
      throw new NotFoundException(`Consultation with ID ${id} not found`);
    }

    // Role check: Only ADMIN can override
    if (!this.identityContext.hasRole('ADMIN')) {
      throw new ForbiddenException('Only ADMIN can override state transitions');
    }

    const previousStatus = consultation.status;

    // Update status (bypassing state machine validation)
    const updated = await this.consultationRepository.changeStatus(
      id,
      overrideStateDto.newStatus,
      {
        updatedBy: userId,
        version: consultation.version,
      },
    );

    // Get correlation context
    const context = this.correlationService.getContext();

    // Emit override event (CRITICAL: Must audit all overrides)
    await this.domainEventService.createEvent({
      eventType: ConsultationEventType.STATE_OVERRIDE,
      domain: Domain.CONSULTATION,
      aggregateId: id,
      aggregateType: 'Consultation',
      payload: {
        consultationId: id,
        previousStatus,
        newStatus: overrideStateDto.newStatus,
        reason: overrideStateDto.reason,
        overriddenBy: userId,
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    // Also emit status changed event
    await this.domainEventService.createEvent({
      eventType: ConsultationEventType.STATUS_CHANGED,
      domain: Domain.CONSULTATION,
      aggregateId: id,
      aggregateType: 'Consultation',
      payload: {
        consultationId: id,
        previousStatus,
        newStatus: overrideStateDto.newStatus,
        reason: overrideStateDto.reason,
        overriddenBy: userId,
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return updated;
  }

  /**
   * Find one consultation
   */
  async findOne(id: string, userId?: string) {
    const consultation = await this.consultationRepository.findById(id);
    if (!consultation) {
      throw new NotFoundException(`Consultation with ID ${id} not found`);
    }

    // Validate access if userId provided
    if (userId) {
      const hasAccess = await this.rlsValidation.canAccessPatient(
        consultation.patientId,
        userId,
      );
      if (!hasAccess) {
        throw new ForbiddenException(
          `Access denied to consultation ${id}`,
        );
      }
    }

    return consultation;
  }

  /**
   * Find all consultations with pagination
   */
  async findAll(
    skip?: number,
    take?: number,
    filters?: {
      patientId?: string;
      doctorId?: string;
      status?: ConsultationStatus;
    },
    userId?: string,
  ) {
    return await this.consultationRepository.findAll(skip, take, {
      ...filters,
      archived: false,
    });
  }

  /**
   * Get consultations with outcomes for a patient
   * Returns consultations that have been finalized (have consultationOutcome)
   */
  async getConsultationOutcomes(patientId: string, userId?: string) {
    // Validate access
    if (userId) {
      const hasAccess = await this.rlsValidation.canAccessPatient(patientId, userId);
      if (!hasAccess) {
        throw new ForbiddenException('Access denied to patient');
      }
    }

    const consultations = await this.prisma.consultation.findMany({
      where: {
        patientId,
        consultationOutcome: { not: null },
      },
      include: {
        patient: true,
        doctor: true,
        procedurePlans: {
          include: {
            surgeon: true,
          },
        },
        followUpPlans: {
          include: {
            doctor: true,
            appointment: true,
          },
        },
      },
      orderBy: {
        consultationDate: 'desc',
      },
    });

    return consultations;
  }

  /**
   * Update consultation
   */
  async update(
    id: string,
    updateConsultationDto: UpdateConsultationDto,
    userId: string,
  ) {
    // Validate access
    await this.findOne(id, userId);

    try {
      const updated = await this.consultationRepository.update(id, {
        ...updateConsultationDto,
        updatedBy: userId,
      });

      // Get correlation context
      const context = this.correlationService.getContext();

      // Emit domain event
      await this.domainEventService.createEvent({
        eventType: ConsultationEventType.STATUS_CHANGED,
        domain: Domain.CONSULTATION,
        aggregateId: id,
        aggregateType: 'Consultation',
        payload: {
          consultationId: id,
          changes: updateConsultationDto,
        },
        correlationId: context.correlationId || undefined,
        causationId: context.causationId || undefined,
        createdBy: userId,
        sessionId: context.sessionId || undefined,
        requestId: context.requestId || undefined,
      });

      return updated;
    } catch (error) {
      // Re-throw ConflictException from repository (version mismatch)
      if (error instanceof ConflictException) {
        throw error;
      }
      throw error;
    }
  }

  /**
   * Archive consultation
   */
  async archive(id: string, userId: string) {
    // Validate access
    await this.findOne(id, userId);

    const consultation = await this.consultationRepository.cancel(id, userId);

    // Get correlation context
    const context = this.correlationService.getContext();

    // Emit domain event
    await this.domainEventService.createEvent({
      eventType: ConsultationEventType.ARCHIVED,
      domain: Domain.CONSULTATION,
      aggregateId: id,
      aggregateType: 'Consultation',
      payload: {
        consultationId: id,
        patientId: consultation.patientId,
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return consultation;
  }

  /**
   * Validate state transition
   * Throws BadRequestException if transition is invalid
   * ADMIN can bypass validation
   */
  private validateStateTransition(
    currentStatus: ConsultationStatus,
    targetStatus: ConsultationStatus,
    userId: string,
  ): void {
    // ADMIN can always override
    if (this.identityContext.hasRole('ADMIN')) {
      return;
    }

    // Check if transition is valid
    const allowedTransitions = this.validTransitions.get(currentStatus);
    if (!allowedTransitions || !allowedTransitions.includes(targetStatus)) {
      throw new BadRequestException(
        `Invalid state transition from ${currentStatus} to ${targetStatus}`,
      );
    }
  }

  /**
   * Create billing entry for consultation check-in
   * Looks up consultation billing code or uses default fee
   */
  private async createConsultationBillingEntry(
    consultation: any,
    userId: string,
    context: any,
  ): Promise<string | undefined> {
    try {
      // Try to find consultation billing code (CPT 99213 or similar)
      // Look for common consultation codes
      const consultationCode = await this.prisma.billingCode.findFirst({
        where: {
          OR: [
            { code: '99213' }, // Established patient office visit
            { code: '99214' }, // Established patient office visit (more complex)
            { code: '99203' }, // New patient office visit
            { description: { contains: 'consultation', mode: 'insensitive' } },
          ],
          active: true,
        },
      });

      if (!consultationCode || !consultationCode.defaultCharge) {
        // No billing code found or no default charge - skip billing
        console.warn(
          'No consultation billing code found, skipping billing entry',
        );
        return undefined;
      }

      // Get or create bill for patient
      const existingBill = await this.prisma.bill.findFirst({
        where: {
          patientId: consultation.patientId,
          status: { in: ['DRAFT', 'PENDING'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      let billId: string;
      if (existingBill) {
        billId = existingBill.id;
      } else {
        // Create new bill
        const billNumber = `BILL-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
        const newBill = await this.prisma.bill.create({
          data: {
            billNumber,
            patientId: consultation.patientId,
            billDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            subtotal: consultationCode.defaultCharge,
            tax: 0,
            discount: 0,
            totalAmount: consultationCode.defaultCharge,
            balance: consultationCode.defaultCharge,
            status: 'DRAFT',
          },
        });
        billId = newBill.id;
      }

      // Create billing event for line item
      const billingEvent = await this.domainEventService.createEvent({
        eventType: BillingEventType.BILL_LINE_ITEM_CREATED,
        domain: Domain.BILLING,
        aggregateId: billId,
        aggregateType: 'BillLineItem',
        payload: {
          billId,
          billingCodeId: consultationCode.id,
          consultationId: consultation.id,
          quantity: 1,
          unitPrice: Number(consultationCode.defaultCharge),
        },
        correlationId: context.correlationId || undefined,
        causationId: context.causationId || undefined,
        createdBy: userId,
        sessionId: context.sessionId || undefined,
        requestId: context.requestId || undefined,
      });

      // Create line item
      await this.billingRepository.createLineItem({
        billId,
        billingCodeId: consultationCode.id,
        description: `Consultation - ${consultation.visitType}`,
        quantity: 1,
        unitPrice: Number(consultationCode.defaultCharge),
        serviceDate: new Date(),
        triggeringEventId: billingEvent.id,
      });

      return billingEvent.id;
    } catch (error) {
      console.error('Error creating consultation billing entry:', error);
      // Return undefined to allow check-in to continue even if billing fails
      return undefined;
    }
  }
}

