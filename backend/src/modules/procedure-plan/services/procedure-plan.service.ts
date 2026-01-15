import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ProcedurePlanRepository } from '../repositories/procedure-plan.repository';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { IdentityContextService } from '../../../modules/auth/services/identityContext.service';
import { RlsValidationService } from '../../../modules/audit/services/rlsValidation.service';
import { CreateProcedurePlanDto } from '../dto/create-procedure-plan.dto';
import { UpdateProcedurePlanDto } from '../dto/update-procedure-plan.dto';
import { ProcedurePlanType, ProcedurePlanStatus } from '../types/procedure-plan-types';
import { Domain, PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';

/**
 * Procedure Plan Service
 * 
 * Manages procedure plan lifecycle with workflow enforcement:
 * - DRAFT → APPROVED → SCHEDULED → IN_PROGRESS → COMPLETED
 * - Supports multi-session tracking for SERIES plans
 * - Enforces valid status transitions
 */
@Injectable()
export class ProcedurePlanService {
  private prisma: PrismaClient;

  // Valid state transitions
  private readonly validTransitions: Map<
    ProcedurePlanStatus,
    ProcedurePlanStatus[]
  > = new Map([
    [ProcedurePlanStatus.DRAFT, [ProcedurePlanStatus.APPROVED, ProcedurePlanStatus.CANCELLED]],
    [ProcedurePlanStatus.APPROVED, [ProcedurePlanStatus.SCHEDULED, ProcedurePlanStatus.CANCELLED, ProcedurePlanStatus.ON_HOLD]],
    [ProcedurePlanStatus.SCHEDULED, [ProcedurePlanStatus.IN_PROGRESS, ProcedurePlanStatus.CANCELLED, ProcedurePlanStatus.ON_HOLD]],
    [ProcedurePlanStatus.IN_PROGRESS, [ProcedurePlanStatus.COMPLETED, ProcedurePlanStatus.ON_HOLD, ProcedurePlanStatus.CANCELLED]],
    [ProcedurePlanStatus.ON_HOLD, [ProcedurePlanStatus.SCHEDULED, ProcedurePlanStatus.APPROVED, ProcedurePlanStatus.CANCELLED]],
  ]);

  constructor(
    private readonly procedurePlanRepository: ProcedurePlanRepository,
    private readonly domainEventService: DomainEventService,
    private readonly correlationService: CorrelationService,
    private readonly identityContext: IdentityContextService,
    private readonly rlsValidation: RlsValidationService,
  ) {
    this.prisma = getPrismaClient();
  }

  /**
   * Create a new procedure plan
   * Only DOCTOR, SURGEON, ADMIN can create
   */
  async createPlan(
    createPlanDto: CreateProcedurePlanDto,
    userId: string,
  ) {
    // Role check
    if (
      !this.identityContext.hasRole('ADMIN') &&
      !this.identityContext.hasRole('DOCTOR') &&
      !this.identityContext.hasRole('SURGEON')
    ) {
      throw new ForbiddenException(
        'Only DOCTOR, SURGEON, and ADMIN can create procedure plans',
      );
    }

    // Validate consultation exists and is in correct state
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: createPlanDto.consultationId },
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation with ID ${createPlanDto.consultationId} not found`);
    }

    // Validate patient access
    const hasAccess = await this.rlsValidation.canAccessPatient(
      consultation.patientId,
      userId,
    );
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to patient');
    }

    // Validate multi-session logic
    if (createPlanDto.planType === ProcedurePlanType.SERIES) {
      if (!createPlanDto.sessionCount || createPlanDto.sessionCount < 2) {
        throw new BadRequestException('SERIES plans must have at least 2 sessions');
      }
      if (!createPlanDto.sessionIntervalDays || createPlanDto.sessionIntervalDays < 1) {
        throw new BadRequestException('SERIES plans must specify sessionIntervalDays');
      }
    } else {
      // Single session plans should have sessionCount = 1
      if (createPlanDto.sessionCount && createPlanDto.sessionCount !== 1) {
        throw new BadRequestException('Non-SERIES plans must have sessionCount = 1');
      }
    }

    // Create plan
    const plan = await this.procedurePlanRepository.create({
      ...createPlanDto,
      createdBy: userId,
    });

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'PROCEDURE_PLAN_CREATED',
      domain: Domain.CONSULTATION,
      aggregateId: plan.id,
      aggregateType: 'ProcedurePlan',
      payload: {
        planId: plan.id,
        consultationId: createPlanDto.consultationId,
        patientId: consultation.patientId,
        planType: createPlanDto.planType,
        sessionCount: createPlanDto.sessionCount || 1,
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return plan;
  }

  /**
   * Update procedure plan
   * Only allowed in DRAFT status
   */
  async updatePlan(
    id: string,
    updatePlanDto: UpdateProcedurePlanDto,
    userId: string,
  ) {
    const plan = await this.procedurePlanRepository.findById(id);
    if (!plan) {
      throw new NotFoundException(`Procedure plan with ID ${id} not found`);
    }

    // Role check
    if (
      !this.identityContext.hasRole('ADMIN') &&
      !this.identityContext.hasRole('DOCTOR') &&
      !this.identityContext.hasRole('SURGEON')
    ) {
      throw new ForbiddenException(
        'Only DOCTOR, SURGEON, and ADMIN can update procedure plans',
      );
    }

    // Only allow updates in DRAFT status
    if (plan.status !== ProcedurePlanStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot update procedure plan in ${plan.status} status. Only DRAFT plans can be updated.`,
      );
    }

    // Validate multi-session logic if planType is being changed to SERIES
    if (updatePlanDto.planType === ProcedurePlanType.SERIES) {
      const sessionCount = updatePlanDto.sessionCount || plan.sessionCount;
      if (!sessionCount || sessionCount < 2) {
        throw new BadRequestException('SERIES plans must have at least 2 sessions');
      }
      const intervalDays = updatePlanDto.sessionIntervalDays || plan.sessionIntervalDays;
      if (!intervalDays || intervalDays < 1) {
        throw new BadRequestException('SERIES plans must specify sessionIntervalDays');
      }
    }

    const updated = await this.procedurePlanRepository.update(id, {
      ...updatePlanDto,
      updatedBy: userId,
    });

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'PROCEDURE_PLAN_UPDATED',
      domain: Domain.CONSULTATION,
      aggregateId: id,
      aggregateType: 'ProcedurePlan',
      payload: {
        planId: id,
        changes: updatePlanDto,
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
   * Approve procedure plan
   * Transitions from DRAFT → APPROVED
   */
  async approvePlan(id: string, userId: string) {
    const plan = await this.procedurePlanRepository.findById(id);
    if (!plan) {
      throw new NotFoundException(`Procedure plan with ID ${id} not found`);
    }

    // Role check: Only DOCTOR, SURGEON, ADMIN can approve
    if (
      !this.identityContext.hasRole('ADMIN') &&
      !this.identityContext.hasRole('DOCTOR') &&
      !this.identityContext.hasRole('SURGEON')
    ) {
      throw new ForbiddenException(
        'Only DOCTOR, SURGEON, and ADMIN can approve procedure plans',
      );
    }

    // Validate state transition
    this.validateStateTransition(
      plan.status,
      ProcedurePlanStatus.APPROVED,
      userId,
    );

    const updated = await this.procedurePlanRepository.changeStatus(
      id,
      ProcedurePlanStatus.APPROVED,
      {
        approvedAt: new Date(),
        approvedBy: userId,
        updatedBy: userId,
        version: plan.version,
      },
    );

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'PROCEDURE_PLAN_APPROVED',
      domain: Domain.CONSULTATION,
      aggregateId: id,
      aggregateType: 'ProcedurePlan',
      payload: {
        planId: id,
        approvedBy: userId,
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
   * Schedule procedure plan
   * Transitions from APPROVED → SCHEDULED
   * Links to appointment
   */
  async schedulePlan(id: string, appointmentId: string, userId: string) {
    const plan = await this.procedurePlanRepository.findById(id);
    if (!plan) {
      throw new NotFoundException(`Procedure plan with ID ${id} not found`);
    }

    // Role check: Only FRONT_DESK, ADMIN can schedule
    if (
      !this.identityContext.hasRole('ADMIN') &&
      !this.identityContext.hasRole('FRONT_DESK')
    ) {
      throw new ForbiddenException(
        'Only FRONT_DESK and ADMIN can schedule procedure plans',
      );
    }

    // Validate state transition
    this.validateStateTransition(
      plan.status,
      ProcedurePlanStatus.SCHEDULED,
      userId,
    );

    // Validate appointment exists and belongs to same patient
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${appointmentId} not found`);
    }

    if (appointment.patientId !== plan.patientId) {
      throw new BadRequestException('Appointment must belong to the same patient as the procedure plan');
    }

    // Update plan with appointment link
    const updated = await this.procedurePlanRepository.update(id, {
      plannedDate: appointment.scheduledDate.toISOString(),
      updatedBy: userId,
    });

    // Change status
    await this.procedurePlanRepository.changeStatus(
      id,
      ProcedurePlanStatus.SCHEDULED,
      {
        updatedBy: userId,
        version: updated.version,
      },
    );

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'PROCEDURE_PLAN_SCHEDULED',
      domain: Domain.CONSULTATION,
      aggregateId: id,
      aggregateType: 'ProcedurePlan',
      payload: {
        planId: id,
        appointmentId,
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return await this.procedurePlanRepository.findById(id);
  }

  /**
   * Complete a session (for multi-session plans)
   * Updates currentSession and transitions to IN_PROGRESS or COMPLETED
   */
  async completeSession(id: string, sessionNumber: number, userId: string) {
    const plan = await this.procedurePlanRepository.findById(id);
    if (!plan) {
      throw new NotFoundException(`Procedure plan with ID ${id} not found`);
    }

    // Role check: Only DOCTOR, SURGEON, ADMIN can complete sessions
    if (
      !this.identityContext.hasRole('ADMIN') &&
      !this.identityContext.hasRole('DOCTOR') &&
      !this.identityContext.hasRole('SURGEON')
    ) {
      throw new ForbiddenException(
        'Only DOCTOR, SURGEON, and ADMIN can complete sessions',
      );
    }

    // Validate plan type
    if (plan.planType !== ProcedurePlanType.SERIES) {
      throw new BadRequestException('completeSession is only valid for SERIES plans');
    }

    // Validate session number
    if (sessionNumber < 1 || sessionNumber > (plan.sessionCount || 1)) {
      throw new BadRequestException(`Invalid session number. Must be between 1 and ${plan.sessionCount}`);
    }

    // Validate current status
    if (plan.status !== ProcedurePlanStatus.SCHEDULED && plan.status !== ProcedurePlanStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Cannot complete session in ${plan.status} status. Plan must be SCHEDULED or IN_PROGRESS.`,
      );
    }

    // Update current session
    const updated = await this.procedurePlanRepository.update(id, {
      currentSession: sessionNumber,
      updatedBy: userId,
    });

    // Determine new status
    let newStatus: ProcedurePlanStatus;
    if (sessionNumber >= (plan.sessionCount || 1)) {
      // All sessions completed
      newStatus = ProcedurePlanStatus.COMPLETED;
    } else {
      // More sessions remaining
      newStatus = ProcedurePlanStatus.IN_PROGRESS;
    }

    // Change status if needed
    if (plan.status !== newStatus) {
      await this.procedurePlanRepository.changeStatus(
        id,
        newStatus,
        {
          updatedBy: userId,
          version: updated.version,
        },
      );
    }

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'PROCEDURE_PLAN_SESSION_COMPLETED',
      domain: Domain.CONSULTATION,
      aggregateId: id,
      aggregateType: 'ProcedurePlan',
      payload: {
        planId: id,
        sessionNumber,
        totalSessions: plan.sessionCount,
        isComplete: newStatus === ProcedurePlanStatus.COMPLETED,
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return await this.procedurePlanRepository.findById(id);
  }

  /**
   * Complete procedure plan
   * Transitions to COMPLETED
   */
  async completePlan(id: string, userId: string) {
    const plan = await this.procedurePlanRepository.findById(id);
    if (!plan) {
      throw new NotFoundException(`Procedure plan with ID ${id} not found`);
    }

    // Role check: Only DOCTOR, SURGEON, ADMIN can complete
    if (
      !this.identityContext.hasRole('ADMIN') &&
      !this.identityContext.hasRole('DOCTOR') &&
      !this.identityContext.hasRole('SURGEON')
    ) {
      throw new ForbiddenException(
        'Only DOCTOR, SURGEON, and ADMIN can complete procedure plans',
      );
    }

    // Validate state transition
    this.validateStateTransition(
      plan.status,
      ProcedurePlanStatus.COMPLETED,
      userId,
    );

    // For SERIES plans, ensure all sessions are completed
    if (plan.planType === ProcedurePlanType.SERIES) {
      if (plan.currentSession !== plan.sessionCount) {
        throw new BadRequestException(
          `Cannot complete SERIES plan. Only ${plan.currentSession} of ${plan.sessionCount} sessions completed.`,
        );
      }
    }

    const updated = await this.procedurePlanRepository.changeStatus(
      id,
      ProcedurePlanStatus.COMPLETED,
      {
        updatedBy: userId,
        version: plan.version,
      },
    );

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'PROCEDURE_PLAN_COMPLETED',
      domain: Domain.CONSULTATION,
      aggregateId: id,
      aggregateType: 'ProcedurePlan',
      payload: {
        planId: id,
        planType: plan.planType,
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
   * Find one procedure plan
   */
  async findOne(id: string, userId?: string) {
    const plan = await this.procedurePlanRepository.findById(id);
    if (!plan) {
      throw new NotFoundException(`Procedure plan with ID ${id} not found`);
    }

    // Validate access if userId provided
    if (userId) {
      const hasAccess = await this.rlsValidation.canAccessPatient(
        plan.patientId,
        userId,
      );
      if (!hasAccess) {
        throw new ForbiddenException(`Access denied to procedure plan ${id}`);
      }
    }

    return plan;
  }

  /**
   * Find procedure plans by consultation
   */
  async findByConsultation(consultationId: string, userId?: string) {
    const plans = await this.procedurePlanRepository.findByConsultationId(consultationId);
    
    // Validate access if userId provided
    if (userId && plans.length > 0) {
      const hasAccess = await this.rlsValidation.canAccessPatient(
        plans[0].patientId,
        userId,
      );
      if (!hasAccess) {
        throw new ForbiddenException('Access denied to consultation');
      }
    }

    return plans;
  }

  /**
   * Find procedure plans by patient
   */
  async findByPatient(patientId: string, userId?: string) {
    if (userId) {
      const hasAccess = await this.rlsValidation.canAccessPatient(patientId, userId);
      if (!hasAccess) {
        throw new ForbiddenException('Access denied to patient');
      }
    }

    return await this.procedurePlanRepository.findByPatientId(patientId);
  }

  /**
   * Validate state transition
   */
  private validateStateTransition(
    currentStatus: ProcedurePlanStatus,
    targetStatus: ProcedurePlanStatus,
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
}
