/**
 * Patient Lifecycle Service
 * 
 * Single authority that governs patient progression through the clinical workflow.
 * 
 * CRITICAL: Controllers and other services must NOT update patient lifecycle state directly.
 * They MUST call this service to ensure consistency, validation, and auditability.
 * 
 * Responsibilities:
 * - Enforce valid state transitions
 * - Validate actor authorization (role-based)
 * - Validate required data exists before transitions
 * - Persist state changes with audit trail
 * - Emit domain events for all transitions
 * - Log all transitions for compliance
 * 
 * @domain-service
 */

import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaClient, ConsentStatus, ConsultationStatus, Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { getPrismaClient } from '../../../../prisma/client';
import { PatientRepository } from '../../repositories/patient.repository';
import { DomainEventService } from '../../../../services/domainEvent.service';
import { CorrelationService } from '../../../../services/correlation.service';
import { DataAccessLogService } from '../../../audit/services/dataAccessLog.service';
import { AuthRepository } from '../../../auth/repositories/auth.repository';
import { Domain } from '@prisma/client';
import { PatientLifecycleState, TERMINAL_STATES } from '../patient-lifecycle-state.enum';
import {
  InvalidPatientLifecycleTransitionError,
  UnauthorizedLifecycleTransitionError,
  MissingRequiredDataError,
  PatientLifecycleNotFoundError,
} from '../exceptions/patient-lifecycle.exceptions';

/**
 * Actor information for lifecycle transitions
 */
export interface LifecycleActor {
  userId: string;
  role: string; // Role code from database (e.g., 'ADMIN', 'DOCTOR', 'PATIENT')
}

/**
 * Context information for lifecycle transitions
 */
export interface LifecycleTransitionContext {
  reason?: string;
  consultationId?: string;
  appointmentId?: string;
  consentId?: string;
  procedurePlanId?: string;
  surgicalCaseId?: string;
  ipAddress?: string; // For audit trail
  userAgent?: string; // For audit trail
  [key: string]: any;
}

/**
 * Transition configuration
 * Defines allowed transitions, required roles, and data validation
 */
interface TransitionRule {
  from: PatientLifecycleState;
  to: PatientLifecycleState;
  allowedRoles: string[]; // Empty array means SYSTEM-only (no user role)
  requiredData?: {
    intakeCompleted?: boolean;
    intakeVerified?: boolean;
    consultationRequested?: boolean;
    consultationApproved?: boolean;
    appointmentScheduled?: boolean;
    consultationCompleted?: boolean;
    procedurePlanExists?: boolean;
    consentSigned?: boolean;
    surgeryScheduled?: boolean;
    surgeryCompleted?: boolean;
    followUpNotesExist?: boolean;
  };
}

@Injectable()
export class PatientLifecycleService {
  private readonly logger = new Logger(PatientLifecycleService.name);
  private readonly prisma: PrismaClient;

  /**
   * Authoritative transition rules
   * Defines all allowed transitions with role requirements and data validation
   */
  private readonly TRANSITION_RULES: TransitionRule[] = [
    // REGISTERED → EXPLORING (PATIENT or SYSTEM)
    {
      from: PatientLifecycleState.REGISTERED,
      to: PatientLifecycleState.EXPLORING,
      allowedRoles: ['PATIENT'],
    },

    // EXPLORING → VERIFIED (ADMIN or SYSTEM)
    {
      from: PatientLifecycleState.EXPLORING,
      to: PatientLifecycleState.VERIFIED,
      allowedRoles: ['ADMIN'],
    },

    // REGISTERED → VERIFIED (ADMIN or SYSTEM only)
    {
      from: PatientLifecycleState.REGISTERED,
      to: PatientLifecycleState.VERIFIED,
      allowedRoles: ['ADMIN'], // Empty means SYSTEM-only, ADMIN can also verify
    },

    // VERIFIED → INTAKE_IN_PROGRESS (PATIENT)
    {
      from: PatientLifecycleState.VERIFIED,
      to: PatientLifecycleState.INTAKE_IN_PROGRESS,
      allowedRoles: ['PATIENT'],
    },

    // INTAKE_IN_PROGRESS → INTAKE_COMPLETED (PATIENT)
    {
      from: PatientLifecycleState.INTAKE_IN_PROGRESS,
      to: PatientLifecycleState.INTAKE_COMPLETED,
      allowedRoles: ['PATIENT'],
      requiredData: {
        intakeCompleted: true,
      },
    },

    // INTAKE_COMPLETED → INTAKE_VERIFIED (NURSE or ADMIN)
    {
      from: PatientLifecycleState.INTAKE_COMPLETED,
      to: PatientLifecycleState.INTAKE_VERIFIED,
      allowedRoles: ['NURSE', 'ADMIN', 'FRONT_DESK'],
      requiredData: {
        intakeCompleted: true,
        intakeVerified: true,
      },
    },

    // REGISTERED → CONSULTATION_REQUESTED (PATIENT)
    // Allows immediate booking after registration
    {
      from: PatientLifecycleState.REGISTERED,
      to: PatientLifecycleState.CONSULTATION_REQUESTED,
      allowedRoles: ['PATIENT'],
    },

    // EXPLORING → CONSULTATION_REQUESTED (PATIENT)
    // Allows immediate booking while exploring
    {
      from: PatientLifecycleState.EXPLORING,
      to: PatientLifecycleState.CONSULTATION_REQUESTED,
      allowedRoles: ['PATIENT'],
    },

    // VERIFIED → CONSULTATION_REQUESTED (PATIENT)
    // Allows booking after identity verification
    {
      from: PatientLifecycleState.VERIFIED,
      to: PatientLifecycleState.CONSULTATION_REQUESTED,
      allowedRoles: ['PATIENT'],
    },

    // INTAKE_VERIFIED → CONSULTATION_REQUESTED (PATIENT)
    {
      from: PatientLifecycleState.INTAKE_VERIFIED,
      to: PatientLifecycleState.CONSULTATION_REQUESTED,
      allowedRoles: ['PATIENT'],
      requiredData: {
        intakeVerified: true,
      },
    },

    // APPOINTMENT_SCHEDULED → CONSULTATION_REQUESTED (PATIENT)
    // Allows patient to request another consultation even if one is already scheduled
    {
      from: PatientLifecycleState.APPOINTMENT_SCHEDULED,
      to: PatientLifecycleState.CONSULTATION_REQUESTED,
      allowedRoles: ['PATIENT'],
    },

    // CONSULTATION_REQUESTED → CONSULTATION_APPROVED (ADMIN or DOCTOR)
    {
      from: PatientLifecycleState.CONSULTATION_REQUESTED,
      to: PatientLifecycleState.CONSULTATION_APPROVED,
      allowedRoles: ['ADMIN', 'FRONT_DESK', 'DOCTOR', 'SURGEON'],
      requiredData: {
        consultationRequested: true,
      },
    },

    // CONSULTATION_APPROVED → APPOINTMENT_SCHEDULED (SYSTEM or ADMIN)
    {
      from: PatientLifecycleState.CONSULTATION_APPROVED,
      to: PatientLifecycleState.APPOINTMENT_SCHEDULED,
      allowedRoles: ['ADMIN', 'FRONT_DESK'], // Empty means SYSTEM can also do this
      requiredData: {
        consultationApproved: true,
        appointmentScheduled: true,
      },
    },

    // CONSULTATION_REQUESTED → APPOINTMENT_SCHEDULED (ADMIN or FRONT_DESK)
    // Allows direct scheduling from a request bypassing separate approval
    {
      from: PatientLifecycleState.CONSULTATION_REQUESTED,
      to: PatientLifecycleState.APPOINTMENT_SCHEDULED,
      allowedRoles: ['ADMIN', 'FRONT_DESK'],
      requiredData: {
        consultationRequested: true,
        appointmentScheduled: true,
      },
    },

    // APPOINTMENT_SCHEDULED → CONSULTATION_COMPLETED (DOCTOR)
    {
      from: PatientLifecycleState.APPOINTMENT_SCHEDULED,
      to: PatientLifecycleState.CONSULTATION_COMPLETED,
      allowedRoles: ['DOCTOR', 'SURGEON', 'ADMIN'],
      requiredData: {
        appointmentScheduled: true,
        consultationCompleted: true,
      },
    },

    // CONSULTATION_COMPLETED → PROCEDURE_PLANNED (DOCTOR)
    {
      from: PatientLifecycleState.CONSULTATION_COMPLETED,
      to: PatientLifecycleState.PROCEDURE_PLANNED,
      allowedRoles: ['DOCTOR', 'SURGEON', 'ADMIN'],
      requiredData: {
        consultationCompleted: true,
        procedurePlanExists: true,
      },
    },

    // PROCEDURE_PLANNED → CONSENT_SIGNED (PATIENT + consent must exist)
    {
      from: PatientLifecycleState.PROCEDURE_PLANNED,
      to: PatientLifecycleState.CONSENT_SIGNED,
      allowedRoles: ['PATIENT', 'ADMIN'], // Admin can mark as signed if physical signature
      requiredData: {
        procedurePlanExists: true,
        consentSigned: true,
      },
    },

    // CONSENT_SIGNED → SURGERY_SCHEDULED (ADMIN)
    {
      from: PatientLifecycleState.CONSENT_SIGNED,
      to: PatientLifecycleState.SURGERY_SCHEDULED,
      allowedRoles: ['ADMIN', 'DOCTOR', 'SURGEON'],
      requiredData: {
        consentSigned: true,
        surgeryScheduled: true,
      },
    },

    // SURGERY_SCHEDULED → SURGERY_COMPLETED (DOCTOR)
    {
      from: PatientLifecycleState.SURGERY_SCHEDULED,
      to: PatientLifecycleState.SURGERY_COMPLETED,
      allowedRoles: ['DOCTOR', 'SURGEON', 'ADMIN'],
      requiredData: {
        surgeryScheduled: true,
        surgeryCompleted: true,
      },
    },

    // SURGERY_COMPLETED → FOLLOW_UP (SYSTEM)
    {
      from: PatientLifecycleState.SURGERY_COMPLETED,
      to: PatientLifecycleState.FOLLOW_UP,
      allowedRoles: [], // SYSTEM-only (automatic transition)
    },

    // FOLLOW_UP → DISCHARGED (DOCTOR)
    {
      from: PatientLifecycleState.FOLLOW_UP,
      to: PatientLifecycleState.DISCHARGED,
      allowedRoles: ['DOCTOR', 'SURGEON', 'ADMIN'],
      requiredData: {
        followUpNotesExist: true,
      },
    },
  ];

  /**
   * Build allowed transitions map for fast lookup
   */
  private readonly ALLOWED_TRANSITIONS: Map<PatientLifecycleState, Set<PatientLifecycleState>> = (() => {
    const map = new Map<PatientLifecycleState, Set<PatientLifecycleState>>();

    // Initialize all states
    Object.values(PatientLifecycleState).forEach(state => {
      map.set(state, new Set());
    });

    // Populate from rules
    this.TRANSITION_RULES.forEach(rule => {
      const allowed = map.get(rule.from) || new Set();
      allowed.add(rule.to);
      map.set(rule.from, allowed);
    });

    return map;
  })();

  /**
   * Build transition rules map for fast lookup
   */
  private readonly TRANSITION_RULES_MAP: Map<string, TransitionRule> = (() => {
    const map = new Map<string, TransitionRule>();
    this.TRANSITION_RULES.forEach(rule => {
      const key = `${rule.from}→${rule.to}`;
      map.set(key, rule);
    });
    return map;
  })();

  constructor(
    private readonly patientRepository: PatientRepository,
    private readonly domainEventService: DomainEventService,
    private readonly correlationService: CorrelationService,
    private readonly dataAccessLogService: DataAccessLogService,
    private readonly authRepository: AuthRepository,
  ) {
    this.prisma = getPrismaClient();
  }

  /**
   * Transition patient to target state
   * 
   * This is the ONLY method that should be used to change patient lifecycle state.
   * All validations, authorizations, and side effects are handled here.
   * 
   * CRITICAL: This method is wrapped in a transaction to ensure atomicity of:
   * - State update
   * - Transition history record
   * - Domain event creation
   * - Audit log write
   * 
   * Optimistic locking prevents concurrent state corruption.
   * 
   * @param patientId - Patient ID
   * @param targetState - Target lifecycle state
   * @param actor - Actor performing the transition (userId + role)
   * @param context - Optional context for the transition (consultationId, consentId, etc.)
   * @throws InvalidPatientLifecycleTransitionError if transition is not allowed
   * @throws UnauthorizedLifecycleTransitionError if actor lacks permission
   * @throws MissingRequiredDataError if required data doesn't exist
   * @throws PatientLifecycleNotFoundError if patient doesn't exist
   * @throws ConflictException if concurrent modification detected (optimistic locking)
   */
  async transitionPatient(
    patientId: string,
    targetState: PatientLifecycleState,
    actor: LifecycleActor,
    context?: LifecycleTransitionContext,
  ): Promise<void> {
    this.logger.log(
      `Transitioning patient ${patientId} to state ${targetState} by ${actor.role} (${actor.userId})`,
    );

    // 1. Load patient from repository to get current state and version
    const patient = await this.patientRepository.findById(patientId);
    if (!patient) {
      throw new PatientLifecycleNotFoundError(
        `Patient with ID ${patientId} not found`,
        patientId,
      );
    }

    // Get current lifecycle state from patient record
    // Schema now properly defines lifecycleState field with default REGISTERED
    const currentState: PatientLifecycleState = (patient.lifecycleState as any) || PatientLifecycleState.REGISTERED;

    // 2. Validate transition is allowed
    if (currentState === targetState) {
      this.logger.log(`Patient ${patientId} is already in state ${targetState}. Skipping transition.`);
      return;
    }
    this.validateTransition(currentState, targetState, patientId);

    // 3. Validate actor role is allowed for this transition
    const transitionKey = `${currentState}→${targetState}`;
    const rule = this.TRANSITION_RULES_MAP.get(transitionKey);

    if (!rule) {
      throw new InvalidPatientLifecycleTransitionError(
        `No transition rule found for ${currentState} → ${targetState}`,
        patientId,
        currentState,
        targetState,
      );
    }

    // 4. Validate actor role against real RBAC (CRITICAL: Do not trust caller-provided role)
    await this.validateActorRole(actor.userId, actor.role, patientId, currentState, targetState, rule.allowedRoles);

    // Check role authorization (now validated against real RBAC)
    if (rule.allowedRoles.length > 0 && !rule.allowedRoles.includes(actor.role)) {
      throw new UnauthorizedLifecycleTransitionError(
        `Role ${actor.role} is not authorized to transition from ${currentState} to ${targetState}`,
        patientId,
        currentState,
        targetState,
        actor.role,
        rule.allowedRoles,
      );
    }

    // SYSTEM-only transitions (empty allowedRoles) can only be done by SYSTEM
    if (rule.allowedRoles.length === 0 && actor.role !== 'SYSTEM') {
      throw new UnauthorizedLifecycleTransitionError(
        `Transition from ${currentState} to ${targetState} is SYSTEM-only and cannot be performed by ${actor.role}`,
        patientId,
        currentState,
        targetState,
        actor.role,
        ['SYSTEM'],
      );
    }

    // 5. Validate required data exists
    if (rule.requiredData) {
      await this.validateRequiredData(patientId, targetState, rule.requiredData, context);
    }

    // 6. Require reason for sensitive transitions
    this.validateReasonRequired(targetState, context?.reason);

    // 7. ATOMIC TRANSACTION: State update + Transition history + Domain event + Audit log
    // All operations must succeed together or all fail together
    const correlationContext = this.correlationService.getContext();
    const transitionTimestamp = new Date();

    try {
      await this.prisma.$transaction(async (tx) => {
        // 7a. Re-read patient within transaction to get latest version
        // This ensures we have the most up-to-date version at transaction start
        const currentPatient = await tx.patient.findUnique({
          where: { id: patientId },
          select: { id: true, version: true, lifecycleState: true },
        });

        if (!currentPatient) {
          throw new PatientLifecycleNotFoundError(
            `Patient with ID ${patientId} not found`,
            patientId,
          );
        }

        // 7b. Update patient state with optimistic locking
        // If version changed between read and update, Prisma will throw P2025
        try {
          await tx.patient.update({
            where: {
              id: patientId,
              version: currentPatient.version, // Optimistic locking: ensure we're updating the expected version
            },
            data: {
              lifecycleState: targetState,
              lifecycleStateChangedAt: transitionTimestamp,
              lifecycleStateChangedBy: actor.userId,
              version: {
                increment: 1,
              },
            },
          });
        } catch (updateError: any) {
          // Handle optimistic locking failure (P2025 = Record not found = version mismatch)
          if (updateError.code === 'P2025') {
            throw new ConflictException(
              `Concurrency conflict: Patient ${patientId} was modified by another process. ` +
              `Expected version ${currentPatient.version}. Please retry the transition.`,
            );
          }
          throw updateError;
        }

        // 7b. Create transition history record (source of truth for lifecycle history)
        await tx.patientLifecycleTransition.create({
          data: {
            patientId,
            fromState: currentState,
            toState: targetState,
            actorUserId: actor.userId,
            actorRole: actor.role,
            reason: context?.reason || null,
            context: context ? this.sanitizeContext(context) : null,
            ipAddress: context?.ipAddress || null,
            userAgent: context?.userAgent || null,
            correlationId: correlationContext.correlationId || null,
          },
        });

        // 7c. Create domain event (inside transaction for atomicity)
        // We create directly here since DomainEventService doesn't support transaction client
        // This ensures atomicity of state change and event creation
        const eventOccurredAt = new Date();
        const eventPayload = {
          patientId,
          from: currentState,
          to: targetState,
          actorUserId: actor.userId,
          actorRole: actor.role,
          timestamp: eventOccurredAt.toISOString(),
          context: context || {},
        };

        // Compute content hash for event integrity (matching DomainEventService pattern)
        const eventContentHash = createHash('sha256')
          .update(JSON.stringify({
            eventType: 'Patient.LifecycleTransitioned',
            domain: Domain.MEDICAL_RECORDS,
            aggregateId: patientId,
            aggregateType: 'Patient',
            payload: eventPayload,
            metadata: null,
            occurredAt: eventOccurredAt.toISOString(),
          }))
          .digest('hex');

        await tx.domainEvent.create({
          data: {
            eventType: 'Patient.LifecycleTransitioned',
            domain: Domain.MEDICAL_RECORDS,
            aggregateId: patientId,
            aggregateType: 'Patient',
            payload: eventPayload,
            metadata: null,
            causationId: correlationContext.causationId || null,
            correlationId: correlationContext.correlationId || null,
            createdBy: actor.userId,
            sessionId: correlationContext.sessionId || null,
            requestId: correlationContext.requestId || null,
            occurredAt: eventOccurredAt,
            contentHash: eventContentHash,
          },
        });

        // 7d. Create audit log (inside transaction for atomicity)
        // We create directly here since DataAccessLogService doesn't support transaction client
        const resourceIdUuid = this.stringToUuid(patientId);
        await tx.dataAccessLog.create({
          data: {
            userId: actor.userId,
            resourceType: 'Patient',
            resourceId: resourceIdUuid,
            action: 'PATIENT_LIFECYCLE_TRANSITION',
            ipAddress: context?.ipAddress || null,
            userAgent: context?.userAgent || null,
            sessionId: correlationContext.sessionId || null,
            reason: context?.reason || `Patient lifecycle transition: ${currentState} → ${targetState}`,
            justification: context?.reason || null,
            accessedPHI: true,
            success: true,
            errorMessage: null,
            accessedAt: transitionTimestamp,
          },
        });
      });
    } catch (error: any) {
      // Re-throw ConflictException (optimistic locking failure)
      if (error instanceof ConflictException) {
        this.logger.warn(
          `Optimistic locking failure for patient ${patientId}: version mismatch`,
        );
        throw error;
      }

      // Handle Prisma transaction errors
      if (error.code === 'P2025') {
        // Record not found (version mismatch caught by update check, but handle as fallback)
        throw new ConflictException(
          `Concurrency conflict: Patient ${patientId} was modified by another process. Please retry the transition.`,
        );
      }

      this.logger.error(
        `Failed to transition patient ${patientId} from ${currentState} to ${targetState}: ${error.message}`,
        error.stack,
      );
      throw error;
    }

    this.logger.log(
      `Successfully transitioned patient ${patientId} from ${currentState} to ${targetState} (atomic transaction completed)`,
    );
  }

  /**
   * Validate actor role against real RBAC tables
   * CRITICAL: Do not trust caller-provided role - validate against database
   */
  private async validateActorRole(
    userId: string,
    claimedRole: string,
    patientId: string,
    fromState: PatientLifecycleState,
    toState: PatientLifecycleState,
    requiredRoles: string[],
  ): Promise<void> {
    const { roles } = await this.authRepository.getUserRolesAndPermissions(userId);
    const userRoleCodes = roles.map(r => r.code);

    if (!userRoleCodes.includes(claimedRole)) {
      throw new UnauthorizedLifecycleTransitionError(
        `User ${userId} does not have role ${claimedRole}. Actual roles: ${userRoleCodes.join(', ') || 'none'}`,
        patientId,
        fromState,
        toState,
        claimedRole,
        requiredRoles,
      );
    }
  }

  /**
   * Validate that reason is required for sensitive transitions
   */
  private validateReasonRequired(targetState: PatientLifecycleState, reason?: string): void {
    const sensitiveTransitions = [
      PatientLifecycleState.CONSENT_SIGNED,
      PatientLifecycleState.SURGERY_SCHEDULED,
      PatientLifecycleState.SURGERY_COMPLETED,
      PatientLifecycleState.DISCHARGED,
    ];

    if (sensitiveTransitions.includes(targetState) && !reason) {
      throw new BadRequestException(
        `Reason is required for sensitive lifecycle transition to ${targetState}. ` +
        `Please provide a reason in the transition context.`,
      );
    }
  }

  /**
   * Sanitize context to remove sensitive fields before storing
   */
  private sanitizeContext(context: LifecycleTransitionContext): Record<string, any> {
    const sanitized: Record<string, any> = {};

    // Only include allowed context fields
    const allowedFields = ['consultationId', 'appointmentId', 'consentId', 'procedurePlanId', 'surgicalCaseId'];
    allowedFields.forEach(field => {
      if (context[field]) {
        sanitized[field] = context[field];
      }
    });

    return sanitized;
  }

  /**
   * Convert string to deterministic UUID format (matching DataAccessLogService pattern)
   */
  private stringToUuid(input: string): string {
    const hash = createHash('sha256').update(input).digest('hex');
    return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
  }

  /**
   * Validate state transition is allowed
   */
  private validateTransition(
    from: PatientLifecycleState,
    to: PatientLifecycleState,
    patientId: string,
  ): void {
    // Allow same state (idempotent operations)
    if (from === to) {
      this.logger.debug(`Idempotent state transition for patient ${patientId}: ${from}`);
      return;
    }

    // Check if current state is terminal
    if (TERMINAL_STATES.includes(from)) {
      throw new InvalidPatientLifecycleTransitionError(
        `Cannot transition from terminal state ${from} to ${to}`,
        patientId,
        from,
        to,
      );
    }

    // Check if transition is allowed
    const allowedNextStates = this.ALLOWED_TRANSITIONS.get(from);
    if (!allowedNextStates || !allowedNextStates.has(to)) {
      const allowedStatesArray = Array.from(allowedNextStates || []);
      throw new InvalidPatientLifecycleTransitionError(
        `Invalid state transition for patient ${patientId}: ${from} → ${to}. ` +
        `Allowed transitions from ${from}: ${allowedStatesArray.join(', ') || 'none (terminal state)'}`,
        patientId,
        from,
        to,
        allowedStatesArray,
      );
    }
  }

  /**
   * Validate required data exists before transition
   */
  private async validateRequiredData(
    patientId: string,
    targetState: PatientLifecycleState,
    requiredData: NonNullable<TransitionRule['requiredData']>,
    context?: LifecycleTransitionContext,
  ): Promise<void> {
    const missingData: string[] = [];

    // Validate intake completed
    if (requiredData.intakeCompleted) {
      // NOTE: Once Prisma client is regenerated with new schema, use PatientIntakeStatus.COMPLETED enum
      const intakeExists = await this.prisma.patientIntake.findFirst({
        where: {
          patientId,
          status: 'COMPLETED', // String literal matching PatientIntakeStatus.COMPLETED enum value
        },
      });

      if (!intakeExists) {
        missingData.push('intake_completed');
      }
    }

    // Validate intake verified
    if (requiredData.intakeVerified) {
      // NOTE: Once Prisma client is regenerated with new schema, use PatientIntakeStatus.VERIFIED enum
      const intakeVerified = await this.prisma.patientIntake.findFirst({
        where: {
          patientId,
          status: 'VERIFIED', // String literal matching PatientIntakeStatus.VERIFIED enum value
        },
      });

      if (!intakeVerified) {
        missingData.push('intake_verified');
      }
    }

    // Validate consultation requested
    if (requiredData.consultationRequested) {
      // Check for ConsultationRequest record
      const consultationRequest = await this.prisma.consultationRequest.findFirst({
        where: {
          patientId,
          status: 'PENDING',
        },
      });

      // ALSO check for Appointment record in REQUESTED or SCHEDULED status
      const appointmentRequest = await this.prisma.appointment.findFirst({
        where: {
          patientId,
          status: { in: ['REQUESTED', 'SCHEDULED'] },
        },
      });

      if (!consultationRequest && !appointmentRequest && !context?.consultationId) {
        missingData.push('consultation_request');
      }
    }

    // Validate consultation approved
    if (requiredData.consultationApproved) {
      // NOTE: Once Prisma client is regenerated with new schema, use ConsultationRequestStatus.APPROVED enum
      const consultationRequest = await this.prisma.consultationRequest.findFirst({
        where: {
          patientId,
          status: 'APPROVED', // String literal matching ConsultationRequestStatus.APPROVED enum value
        },
      });

      if (!consultationRequest && !context?.consultationId) {
        missingData.push('consultation_approval');
      }
    }

    // Validate appointment scheduled
    if (requiredData.appointmentScheduled) {
      const appointment = await this.prisma.appointment.findFirst({
        where: {
          patientId,
          status: 'CONFIRMED',
        },
      });

      if (!appointment && !context?.appointmentId) {
        missingData.push('appointment_scheduled');
      }
    }

    // Validate consultation completed
    if (requiredData.consultationCompleted) {
      const consultation = await this.prisma.consultation.findFirst({
        where: {
          patientId,
          status: {
            in: [ConsultationStatus.CLOSED, ConsultationStatus.FOLLOW_UP, ConsultationStatus.SURGERY_SCHEDULED],
          },
        },
        orderBy: {
          consultationDate: 'desc',
        },
      });

      if (!consultation && !context?.consultationId) {
        missingData.push('consultation_completed');
      }
    }

    // Validate procedure plan exists
    if (requiredData.procedurePlanExists) {
      const procedurePlan = await this.prisma.procedurePlan.findFirst({
        where: {
          patientId,
          status: 'APPROVED', // ProcedurePlan status is string, not enum
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!procedurePlan && !context?.procedurePlanId) {
        missingData.push('procedure_plan_approved');
      }
    }

    // Validate consent signed
    if (requiredData.consentSigned) {
      // Check both PDF consents and structured consents
      const pdfConsent = await this.prisma.pDFConsent.findFirst({
        where: {
          patientId,
          status: ConsentStatus.SIGNED,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const structuredConsent = await this.prisma.patientConsentInstance.findFirst({
        where: {
          patientId,
          status: 'SIGNED',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!pdfConsent && !structuredConsent && !context?.consentId) {
        missingData.push('consent_signed');
      }
    }

    // Validate surgery scheduled
    if (requiredData.surgeryScheduled) {
      const surgicalCase = await this.prisma.surgicalCase.findFirst({
        where: {
          patientId,
          status: {
            in: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'],
          },
        },
        orderBy: {
          scheduledStartAt: 'desc', // SurgicalCase uses scheduledStartAt
        },
      });

      if (!surgicalCase && !context?.surgicalCaseId) {
        missingData.push('surgery_scheduled');
      }
    }

    // Validate surgery completed
    if (requiredData.surgeryCompleted) {
      const surgicalCase = await this.prisma.surgicalCase.findFirst({
        where: {
          patientId,
          status: 'COMPLETED',
        },
        orderBy: {
          actualEndAt: 'desc', // SurgicalCase uses actualEndAt, not completedAt
        },
      });

      if (!surgicalCase && !context?.surgicalCaseId) {
        missingData.push('surgery_completed');
      }
    }

    // Validate follow-up notes exist
    if (requiredData.followUpNotesExist) {
      const followUpNote = await this.prisma.eMRNote.findFirst({
        where: {
          patientId,
          noteType: 'ADDENDUM',
          content: {
            contains: 'follow-up',
            mode: 'insensitive',
          },
        },
      });

      if (!followUpNote) {
        missingData.push('follow_up_notes');
      }
    }

    // Throw error if any required data is missing
    if (missingData.length > 0) {
      throw new MissingRequiredDataError(
        `Cannot transition patient ${patientId} to ${targetState}: Missing required data: ${missingData.join(', ')}`,
        patientId,
        targetState,
        missingData,
      );
    }
  }

  /**
   * Get current lifecycle state for a patient
   */
  async getCurrentState(patientId: string): Promise<PatientLifecycleState> {
    const patient = await this.patientRepository.findById(patientId);
    if (!patient) {
      throw new PatientLifecycleNotFoundError(
        `Patient with ID ${patientId} not found`,
        patientId,
      );
    }

    // Schema now properly defines lifecycleState field with default REGISTERED
    return (patient.lifecycleState as any) || PatientLifecycleState.REGISTERED;
  }

  /**
   * Get lifecycle history for a patient
   * 
   * Returns the complete audit trail of lifecycle transitions for clinical defensibility.
   * This is the source of truth for patient lifecycle history.
   * 
   * @param patientId - Patient ID
   * @param skip - Optional pagination offset
   * @param take - Optional pagination limit
   * @returns Array of lifecycle transitions ordered by createdAt DESC
   */
  async getLifecycleHistory(
    patientId: string,
    skip?: number,
    take?: number,
  ): Promise<{
    transitions: Array<{
      id: string;
      fromState: string;
      toState: string;
      actorUserId: string;
      actorRole: string;
      reason: string | null;
      context: any;
      ipAddress: string | null;
      userAgent: string | null;
      correlationId: string | null;
      createdAt: Date;
    }>;
    total: number;
  }> {
    // Verify patient exists
    const patient = await this.patientRepository.findById(patientId);
    if (!patient) {
      throw new PatientLifecycleNotFoundError(
        `Patient with ID ${patientId} not found`,
        patientId,
      );
    }

    // Get transitions from PatientLifecycleTransition table
    const [transitions, total] = await Promise.all([
      this.prisma.patientLifecycleTransition.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
        skip: skip || 0,
        take: take || 100,
        select: {
          id: true,
          fromState: true,
          toState: true,
          actorUserId: true,
          actorRole: true,
          reason: true,
          context: true,
          ipAddress: true,
          userAgent: true,
          correlationId: true,
          createdAt: true,
        },
      }),
      this.prisma.patientLifecycleTransition.count({
        where: { patientId },
      }),
    ]);

    return {
      transitions: transitions.map(t => ({
        id: t.id,
        fromState: t.fromState,
        toState: t.toState,
        actorUserId: t.actorUserId,
        actorRole: t.actorRole,
        reason: t.reason,
        context: t.context,
        ipAddress: t.ipAddress,
        userAgent: t.userAgent,
        correlationId: t.correlationId,
        createdAt: t.createdAt,
      })),
      total,
    };
  }

  /**
   * Get allowed next states for a patient
   */
  async getAllowedNextStates(patientId: string): Promise<PatientLifecycleState[]> {
    const currentState = await this.getCurrentState(patientId);
    const allowed = this.ALLOWED_TRANSITIONS.get(currentState);
    return Array.from(allowed || []);
  }

  /**
   * Check if a transition is allowed
   */
  async canTransition(
    patientId: string,
    targetState: PatientLifecycleState,
    actor: LifecycleActor,
  ): Promise<boolean> {
    try {
      const currentState = await this.getCurrentState(patientId);
      const transitionKey = `${currentState}→${targetState}`;
      const rule = this.TRANSITION_RULES_MAP.get(transitionKey);

      if (!rule) {
        return false;
      }

      // Check role authorization
      if (rule.allowedRoles.length === 0) {
        // SYSTEM-only
        return actor.role === 'SYSTEM';
      }

      return rule.allowedRoles.includes(actor.role);
    } catch (error) {
      return false;
    }
  }
}
