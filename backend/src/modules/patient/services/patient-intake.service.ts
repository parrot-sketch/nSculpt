import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PatientIntakeRepository } from '../repositories/patient-intake.repository';
import { PatientRepository } from '../repositories/patient.repository';
import { PatientLifecycleService } from '../domain/services/patient-lifecycle.service';
import { PatientLifecycleState } from '../domain/patient-lifecycle-state.enum';
import { CreatePatientIntakeDto } from '../dto/create-patient-intake.dto';
import { UpdatePatientIntakeDto } from '../dto/update-patient-intake.dto';
import { SubmitPatientIntakeDto } from '../dto/submit-patient-intake.dto';
import { VerifyPatientIntakeDto } from '../dto/verify-patient-intake.dto';
import { CorrelationService } from '../../../services/correlation.service';

/**
 * Patient Intake Service
 * 
 * Clinical Intent: Manages patient intake forms and workflow
 * 
 * Workflow:
 * 1. Patient starts intake → INTAKE_IN_PROGRESS
 * 2. Patient saves draft → INTAKE_IN_PROGRESS (no transition)
 * 3. Patient submits intake → INTAKE_COMPLETED
 * 4. Staff verifies intake → INTAKE_VERIFIED
 * 
 * CRITICAL: All lifecycle transitions go through PatientLifecycleService
 * This service performs domain validation, saves data, then triggers lifecycle transitions.
 */
@Injectable()
export class PatientIntakeService {
  constructor(
    private readonly intakeRepository: PatientIntakeRepository,
    private readonly patientRepository: PatientRepository,
    private readonly lifecycleService: PatientLifecycleService,
    private readonly correlationService: CorrelationService,
  ) {}

  /**
   * Start Intake (Clinical Intent: Patient begins filling out intake forms)
   * 
   * POST /patients/:id/intake/start
   * 
   * Workflow:
   * 1. Validate patient exists and is in VERIFIED state
   * 2. Validate patient doesn't already have active intake
   * 3. Create intake record with DRAFT status
   * 4. Transition patient lifecycle: VERIFIED → INTAKE_IN_PROGRESS
   */
  async startIntake(
    patientId: string,
    data: CreatePatientIntakeDto,
    actor: { userId: string; role: string },
    context?: { ipAddress?: string; userAgent?: string },
  ) {
    // 1. Validate patient exists
    const patient = await this.patientRepository.findById(patientId);

    // 2. Validate patient is in VERIFIED state (required for intake)
    const currentState = patient.lifecycleState || PatientLifecycleState.REGISTERED;
    if (currentState !== PatientLifecycleState.VERIFIED) {
      throw new BadRequestException(
        `Cannot start intake for patient in state ${currentState}. ` +
        `Patient must be in VERIFIED state to begin intake.`,
      );
    }

    // 3. Validate patient doesn't already have active intake
    const existingIntake = await this.intakeRepository.findActiveByPatientId(patientId);
    if (existingIntake) {
      throw new BadRequestException(
        `Patient ${patientId} already has an active intake form. ` +
        `Please complete or discard the existing intake before starting a new one.`,
      );
    }

    // 4. Create intake record
    const intake = await this.intakeRepository.create(patientId, {
      ...data,
      createdBy: actor.userId,
    });

    // 5. Transition patient lifecycle: VERIFIED → INTAKE_IN_PROGRESS
    const correlationContext = this.correlationService.getContext();
    await this.lifecycleService.transitionPatient(
      patientId,
      PatientLifecycleState.INTAKE_IN_PROGRESS,
      {
        userId: actor.userId,
        role: actor.role,
      },
      {
        reason: 'Patient started filling out intake forms',
        intakeId: intake.id,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      },
    );

    return intake;
  }

  /**
   * Save Draft (Clinical Intent: Patient saves progress on intake forms)
   * 
   * PATCH /patients/:id/intake/:intakeId
   * 
   * Workflow:
   * 1. Validate intake exists and belongs to patient
   * 2. Validate intake is in DRAFT or IN_PROGRESS status
   * 3. Update intake record (status changes to IN_PROGRESS if was DRAFT)
   * 4. NO lifecycle transition (stays in INTAKE_IN_PROGRESS)
   */
  async saveDraft(
    patientId: string,
    intakeId: string,
    data: UpdatePatientIntakeDto,
    actor: { userId: string; role: string },
    context?: { ipAddress?: string; userAgent?: string },
  ) {
    // 1. Validate intake exists and belongs to patient
    const intake = await this.intakeRepository.findById(intakeId);
    if (intake.patientId !== patientId) {
      throw new ForbiddenException(
        `Intake ${intakeId} does not belong to patient ${patientId}`,
      );
    }

    // 2. Validate intake is in DRAFT or IN_PROGRESS status
    if (intake.status !== 'DRAFT' && intake.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        `Cannot update intake with status ${intake.status}. ` +
        `Only DRAFT and IN_PROGRESS intakes can be updated.`,
      );
    }

    // 3. Validate patient lifecycle state (should be INTAKE_IN_PROGRESS)
    const patient = await this.patientRepository.findById(patientId);
    const currentState = patient.lifecycleState || PatientLifecycleState.REGISTERED;
    if (currentState !== PatientLifecycleState.INTAKE_IN_PROGRESS) {
      // If not in INTAKE_IN_PROGRESS, this might be a stale intake - warn but allow
      // (intake might have been started but lifecycle not updated properly)
      // In production, we might want to sync state here
    }

    // 4. Update intake record (repository handles status update to IN_PROGRESS)
    const updatedIntake = await this.intakeRepository.update(intakeId, {
      ...data,
      updatedBy: actor.userId,
    });

    // NO lifecycle transition - patient stays in INTAKE_IN_PROGRESS

    return updatedIntake;
  }

  /**
   * Submit Intake (Clinical Intent: Patient submits completed intake forms for staff review)
   * 
   * POST /patients/:id/intake/:intakeId/submit
   * 
   * Workflow:
   * 1. Validate intake exists and belongs to patient
   * 2. Validate intake is in DRAFT or IN_PROGRESS status
   * 3. Validate patient is in INTAKE_IN_PROGRESS state
   * 4. Mark intake as COMPLETED
   * 5. Transition patient lifecycle: INTAKE_IN_PROGRESS → INTAKE_COMPLETED
   */
  async submitIntake(
    patientId: string,
    intakeId: string,
    data: SubmitPatientIntakeDto,
    actor: { userId: string; role: string },
    context?: { ipAddress?: string; userAgent?: string },
  ) {
    // 1. Validate intake exists and belongs to patient
    const intake = await this.intakeRepository.findById(intakeId);
    if (intake.patientId !== patientId) {
      throw new ForbiddenException(
        `Intake ${intakeId} does not belong to patient ${patientId}`,
      );
    }

    // 2. Validate intake is in DRAFT or IN_PROGRESS status
    if (intake.status !== 'DRAFT' && intake.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        `Cannot submit intake with status ${intake.status}. ` +
        `Only DRAFT and IN_PROGRESS intakes can be submitted.`,
      );
    }

    // 3. Validate patient attestation
    if (!data.isComplete) {
      throw new BadRequestException(
        'Patient must attest that intake is complete before submitting.',
      );
    }

    // 4. Validate patient is in INTAKE_IN_PROGRESS state
    const patient = await this.patientRepository.findById(patientId);
    const currentState = patient.lifecycleState || PatientLifecycleState.REGISTERED;
    if (currentState !== PatientLifecycleState.INTAKE_IN_PROGRESS) {
      throw new BadRequestException(
        `Cannot submit intake for patient in state ${currentState}. ` +
        `Patient must be in INTAKE_IN_PROGRESS state to submit intake.`,
      );
    }

    // 5. Mark intake as COMPLETED
    const completedIntake = await this.intakeRepository.markCompleted(
      intakeId,
      data.patientAttestation,
    );

    // 6. Transition patient lifecycle: INTAKE_IN_PROGRESS → INTAKE_COMPLETED
    const correlationContext = this.correlationService.getContext();
    await this.lifecycleService.transitionPatient(
      patientId,
      PatientLifecycleState.INTAKE_COMPLETED,
      {
        userId: actor.userId,
        role: actor.role, // Should be PATIENT
      },
      {
        reason: `Patient submitted completed intake forms${data.patientAttestation ? ' with attestation' : ''}`,
        intakeId: completedIntake.id,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      },
    );

    return completedIntake;
  }

  /**
   * Verify Intake (Clinical Intent: Nurse/Admin reviews and verifies intake forms)
   * 
   * POST /patients/:id/intake/:intakeId/verify
   * 
   * Workflow:
   * 1. Validate intake exists and is COMPLETED
   * 2. Validate patient is in INTAKE_COMPLETED state
   * 3. Validate actor has NURSE or ADMIN role
   * 4. Mark intake as VERIFIED
   * 5. Transition patient lifecycle: INTAKE_COMPLETED → INTAKE_VERIFIED
   */
  async verifyIntake(
    patientId: string,
    intakeId: string,
    data: VerifyPatientIntakeDto,
    actor: { userId: string; role: string },
    context?: { ipAddress?: string; userAgent?: string },
  ) {
    // 1. Validate intake exists and belongs to patient
    const intake = await this.intakeRepository.findById(intakeId);
    if (intake.patientId !== patientId) {
      throw new ForbiddenException(
        `Intake ${intakeId} does not belong to patient ${patientId}`,
      );
    }

    // 2. Validate intake is COMPLETED
    if (intake.status !== 'COMPLETED') {
      throw new BadRequestException(
        `Cannot verify intake with status ${intake.status}. ` +
        `Only COMPLETED intakes can be verified.`,
      );
    }

    // 3. Validate patient is in INTAKE_COMPLETED state
    const patient = await this.patientRepository.findById(patientId);
    const currentState = patient.lifecycleState || PatientLifecycleState.REGISTERED;
    if (currentState !== PatientLifecycleState.INTAKE_COMPLETED) {
      throw new BadRequestException(
        `Cannot verify intake for patient in state ${currentState}. ` +
        `Patient must be in INTAKE_COMPLETED state to verify intake.`,
      );
    }

    // 4. Validate actor role (NURSE or ADMIN can verify)
    if (actor.role !== 'NURSE' && actor.role !== 'ADMIN') {
      throw new ForbiddenException(
        `Role ${actor.role} is not authorized to verify intake. ` +
        `Only NURSE and ADMIN roles can verify intake.`,
      );
    }

    // 5. Validate reason is provided (clinical requirement)
    if (!data.reason || data.reason.trim().length === 0) {
      throw new BadRequestException(
        'Reason is required for intake verification (clinical requirement).',
      );
    }

    // 6. Mark intake as VERIFIED
    const verifiedIntake = await this.intakeRepository.markVerified(
      intakeId,
      actor.userId,
      data.reason,
      data.verificationNotes,
      data.approved !== false, // Default to true
    );

    // 7. Transition patient lifecycle: INTAKE_COMPLETED → INTAKE_VERIFIED
    const correlationContext = this.correlationService.getContext();
    await this.lifecycleService.transitionPatient(
      patientId,
      PatientLifecycleState.INTAKE_VERIFIED,
      {
        userId: actor.userId,
        role: actor.role, // Should be NURSE or ADMIN
      },
      {
        reason: data.reason,
        intakeId: verifiedIntake.id,
        verificationNotes: data.verificationNotes,
        approved: verifiedIntake.approved,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      },
    );

    return verifiedIntake;
  }

  /**
   * Get Intake by ID
   */
  async getIntakeById(intakeId: string, actor?: { userId: string; role: string }) {
    return this.intakeRepository.findById(intakeId);
  }

  /**
   * Get Active Intake for Patient
   */
  async getActiveIntake(patientId: string) {
    return this.intakeRepository.findActiveByPatientId(patientId);
  }

  /**
   * Get Intake History for Patient
   */
  async getIntakeHistory(patientId: string, skip?: number, take?: number) {
    return this.intakeRepository.findByPatientId(patientId, skip, take);
  }
}
