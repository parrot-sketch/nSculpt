import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { FollowUpPlanRepository } from '../repositories/follow-up-plan.repository';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { IdentityContextService } from '../../../modules/auth/services/identityContext.service';
import { RlsValidationService } from '../../../modules/audit/services/rlsValidation.service';
import { CreateFollowUpPlanDto } from '../dto/create-follow-up-plan.dto';
import { UpdateFollowUpPlanDto } from '../dto/update-follow-up-plan.dto';
import { FollowUpPlanStatus } from '../types/follow-up-plan-types';
import { Domain, PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';

/**
 * Follow-Up Plan Service
 * 
 * Manages follow-up care planning:
 * - PENDING → SCHEDULED → COMPLETED
 * - Supports multiple follow-ups per consultation
 * - Links to appointments when scheduled
 */
@Injectable()
export class FollowUpPlanService {
  private prisma: PrismaClient;

  // Valid state transitions
  private readonly validTransitions: Map<
    FollowUpPlanStatus,
    FollowUpPlanStatus[]
  > = new Map([
    [FollowUpPlanStatus.PENDING, [FollowUpPlanStatus.SCHEDULED, FollowUpPlanStatus.CANCELLED]],
    [FollowUpPlanStatus.SCHEDULED, [FollowUpPlanStatus.COMPLETED, FollowUpPlanStatus.CANCELLED]],
  ]);

  constructor(
    private readonly followUpPlanRepository: FollowUpPlanRepository,
    private readonly domainEventService: DomainEventService,
    private readonly correlationService: CorrelationService,
    private readonly identityContext: IdentityContextService,
    private readonly rlsValidation: RlsValidationService,
  ) {
    this.prisma = getPrismaClient();
  }

  /**
   * Create a new follow-up plan
   * Only DOCTOR, SURGEON, ADMIN can create
   */
  async createFollowUp(
    createFollowUpDto: CreateFollowUpPlanDto,
    userId: string,
  ) {
    // Role check
    if (
      !this.identityContext.hasRole('ADMIN') &&
      !this.identityContext.hasRole('DOCTOR') &&
      !this.identityContext.hasRole('SURGEON')
    ) {
      throw new ForbiddenException(
        'Only DOCTOR, SURGEON, and ADMIN can create follow-up plans',
      );
    }

    // Validate consultation exists
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: createFollowUpDto.consultationId },
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation with ID ${createFollowUpDto.consultationId} not found`);
    }

    // Validate patient access
    const hasAccess = await this.rlsValidation.canAccessPatient(
      consultation.patientId,
      userId,
    );
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to patient');
    }

    // Create follow-up plan
    const followUpPlan = await this.followUpPlanRepository.create({
      ...createFollowUpDto,
      createdBy: userId,
    });

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'FOLLOW_UP_PLAN_CREATED',
      domain: Domain.CONSULTATION,
      aggregateId: followUpPlan.id,
      aggregateType: 'FollowUpPlan',
      payload: {
        followUpPlanId: followUpPlan.id,
        consultationId: createFollowUpDto.consultationId,
        patientId: consultation.patientId,
        followUpType: createFollowUpDto.followUpType,
        intervalDays: createFollowUpDto.intervalDays,
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return followUpPlan;
  }

  /**
   * Schedule follow-up
   * Links to appointment and transitions to SCHEDULED
   */
  async scheduleFollowUp(
    id: string,
    appointmentId: string,
    userId: string,
  ) {
    const followUpPlan = await this.followUpPlanRepository.findById(id);
    if (!followUpPlan) {
      throw new NotFoundException(`Follow-up plan with ID ${id} not found`);
    }

    // Role check: Only FRONT_DESK, ADMIN can schedule
    if (
      !this.identityContext.hasRole('ADMIN') &&
      !this.identityContext.hasRole('FRONT_DESK')
    ) {
      throw new ForbiddenException(
        'Only FRONT_DESK and ADMIN can schedule follow-ups',
      );
    }

    // Validate state transition
    this.validateStateTransition(
      followUpPlan.status,
      FollowUpPlanStatus.SCHEDULED,
      userId,
    );

    // Validate appointment exists and belongs to same patient
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${appointmentId} not found`);
    }

    if (appointment.patientId !== followUpPlan.patientId) {
      throw new BadRequestException('Appointment must belong to the same patient as the follow-up plan');
    }

    // Update follow-up plan with appointment link
    const updated = await this.followUpPlanRepository.update(id, {
      appointmentId,
      scheduledDate: appointment.scheduledDate.toISOString(),
      updatedBy: userId,
    });

    // Change status
    await this.followUpPlanRepository.changeStatus(
      id,
      FollowUpPlanStatus.SCHEDULED,
      {
        updatedBy: userId,
        version: updated.version,
      },
    );

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'FOLLOW_UP_PLAN_SCHEDULED',
      domain: Domain.CONSULTATION,
      aggregateId: id,
      aggregateType: 'FollowUpPlan',
      payload: {
        followUpPlanId: id,
        appointmentId,
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return await this.followUpPlanRepository.findById(id);
  }

  /**
   * Complete follow-up
   * Transitions to COMPLETED
   */
  async completeFollowUp(id: string, userId: string) {
    const followUpPlan = await this.followUpPlanRepository.findById(id);
    if (!followUpPlan) {
      throw new NotFoundException(`Follow-up plan with ID ${id} not found`);
    }

    // Role check: Only DOCTOR, SURGEON, ADMIN can complete
    if (
      !this.identityContext.hasRole('ADMIN') &&
      !this.identityContext.hasRole('DOCTOR') &&
      !this.identityContext.hasRole('SURGEON')
    ) {
      throw new ForbiddenException(
        'Only DOCTOR, SURGEON, and ADMIN can complete follow-ups',
      );
    }

    // Validate state transition
    this.validateStateTransition(
      followUpPlan.status,
      FollowUpPlanStatus.COMPLETED,
      userId,
    );

    const updated = await this.followUpPlanRepository.changeStatus(
      id,
      FollowUpPlanStatus.COMPLETED,
      {
        updatedBy: userId,
        version: followUpPlan.version,
      },
    );

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'FOLLOW_UP_PLAN_COMPLETED',
      domain: Domain.CONSULTATION,
      aggregateId: id,
      aggregateType: 'FollowUpPlan',
      payload: {
        followUpPlanId: id,
        consultationId: followUpPlan.consultationId,
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
   * Find one follow-up plan
   */
  async findOne(id: string, userId?: string) {
    const followUpPlan = await this.followUpPlanRepository.findById(id);
    if (!followUpPlan) {
      throw new NotFoundException(`Follow-up plan with ID ${id} not found`);
    }

    // Validate access if userId provided
    if (userId) {
      const hasAccess = await this.rlsValidation.canAccessPatient(
        followUpPlan.patientId,
        userId,
      );
      if (!hasAccess) {
        throw new ForbiddenException(`Access denied to follow-up plan ${id}`);
      }
    }

    return followUpPlan;
  }

  /**
   * Find follow-up plans by consultation
   */
  async findByConsultation(consultationId: string, userId?: string) {
    const followUpPlans = await this.followUpPlanRepository.findByConsultationId(consultationId);
    
    // Validate access if userId provided
    if (userId && followUpPlans.length > 0) {
      const hasAccess = await this.rlsValidation.canAccessPatient(
        followUpPlans[0].patientId,
        userId,
      );
      if (!hasAccess) {
        throw new ForbiddenException('Access denied to consultation');
      }
    }

    return followUpPlans;
  }

  /**
   * Find follow-up plans by patient
   */
  async findByPatient(patientId: string, userId?: string) {
    if (userId) {
      const hasAccess = await this.rlsValidation.canAccessPatient(patientId, userId);
      if (!hasAccess) {
        throw new ForbiddenException('Access denied to patient');
      }
    }

    return await this.followUpPlanRepository.findByPatientId(patientId);
  }

  /**
   * Validate state transition
   */
  private validateStateTransition(
    currentStatus: FollowUpPlanStatus,
    targetStatus: FollowUpPlanStatus,
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
