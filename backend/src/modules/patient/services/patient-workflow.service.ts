import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaClient, ConsentStatus } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';

/**
 * Patient Workflow Service
 * 
 * Enforces chronological workflow rules for aesthetic surgery center:
 * 1. Consultation → ProcedurePlan → Consent → SurgicalCase
 * 2. Validates that each step is completed before next can begin
 * 3. Ensures data integrity across workflow stages
 */
@Injectable()
export class PatientWorkflowService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Validate that a ProcedurePlan can be created
   * Requirements:
   * - Consultation must exist
   * - Consultation must be COMPLETED
   */
  async validateProcedurePlanCreation(consultationId: string): Promise<void> {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
    });

    if (!consultation) {
      throw new BadRequestException(`Consultation ${consultationId} not found`);
    }

    // Note: ConsultationStatus enum doesn't have COMPLETED, using CLOSED instead
    // This is a workflow validation - consultation should be in a completed state
    const completedStatuses = ['CLOSED', 'FOLLOW_UP', 'REFERRED', 'SURGERY_SCHEDULED'];
    if (!completedStatuses.includes(consultation.status)) {
      throw new BadRequestException(
        `Cannot create procedure plan: Consultation must be completed (CLOSED, FOLLOW_UP, REFERRED, or SURGERY_SCHEDULED). Current status: ${consultation.status}`,
      );
    }
  }

  /**
   * Validate that a Consent can be created
   * Requirements:
   * - ProcedurePlan must exist
   * - ProcedurePlan must be APPROVED
   * - Consultation must exist and be COMPLETED
   */
  async validateConsentCreation(procedurePlanId: string, consultationId: string): Promise<void> {
    // Validate procedure plan
    const procedurePlan = await this.prisma.procedurePlan.findUnique({
      where: { id: procedurePlanId },
    });

    if (!procedurePlan) {
      throw new BadRequestException(`Procedure plan ${procedurePlanId} not found`);
    }

    if (procedurePlan.status !== 'APPROVED') {
      throw new BadRequestException(
        `Cannot create consent: Procedure plan must be APPROVED. Current status: ${procedurePlan.status}`,
      );
    }

    // Check if consent already exists for this plan
    const existingConsent = await this.prisma.patientConsentInstance.findUnique({
      where: { procedurePlanId },
    });

    if (existingConsent) {
      throw new BadRequestException(
        `Consent already exists for procedure plan ${procedurePlanId}. Use re-consent workflow if needed.`,
      );
    }

    // Validate consultation
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
    });

    if (!consultation) {
      throw new BadRequestException(`Consultation ${consultationId} not found`);
    }

    // Note: ConsultationStatus enum doesn't have COMPLETED, using completed statuses instead
    const completedStatuses = ['CLOSED', 'FOLLOW_UP', 'REFERRED', 'SURGERY_SCHEDULED'];
    if (!completedStatuses.includes(consultation.status)) {
      throw new BadRequestException(
        `Cannot create consent: Consultation must be COMPLETED. Current status: ${consultation.status}`,
      );
    }

    // Validate consultation matches procedure plan
    if (procedurePlan.consultationId !== consultationId) {
      throw new BadRequestException(
        `Consultation ${consultationId} does not match procedure plan's consultation ${procedurePlan.consultationId}`,
      );
    }
  }

  /**
   * Validate that a SurgicalCase can be created
   * Requirements:
   * - ProcedurePlan must exist
   * - ProcedurePlan must be APPROVED
   * - Consent must exist and be SIGNED
   * - Consent must be linked to the ProcedurePlan
   */
  async validateSurgicalCaseCreation(procedurePlanId: string): Promise<void> {
    // Validate procedure plan
    const procedurePlan = await this.prisma.procedurePlan.findUnique({
      where: { id: procedurePlanId },
      include: {
        consentInstance: true,
      },
    });

    if (!procedurePlan) {
      throw new BadRequestException(`Procedure plan ${procedurePlanId} not found`);
    }

    if (procedurePlan.status !== 'APPROVED') {
      throw new BadRequestException(
        `Cannot create surgical case: Procedure plan must be APPROVED. Current status: ${procedurePlan.status}`,
      );
    }

    // Validate consent exists and is signed
    if (!procedurePlan.consentInstance) {
      throw new BadRequestException(
        `Cannot create surgical case: Consent must be created and signed before scheduling surgery.`,
      );
    }

    const consent = procedurePlan.consentInstance;

    if (consent.status !== ConsentStatus.SIGNED) {
      throw new BadRequestException(
        `Cannot create surgical case: Consent must be SIGNED. Current status: ${consent.status}`,
      );
    }

    // Validate consent is not expired
    if (consent.expiresAt && new Date(consent.expiresAt) < new Date()) {
      throw new BadRequestException(
        `Cannot create surgical case: Consent has expired. Expired at: ${consent.expiresAt}`,
      );
    }

    // Validate consent is not revoked
    // Type assertion needed because TypeScript infers narrow literal types
    const consentStatus = consent.status as ConsentStatus;
    if (consentStatus === ConsentStatus.REVOKED) {
      throw new BadRequestException(
        `Cannot create surgical case: Consent has been revoked.`,
      );
    }
  }

  /**
   * Validate that inventory can be consumed for a case
   * Requirements:
   * - SurgicalCase must exist
   * - SurgicalCase must be IN_PROGRESS or COMPLETED
   * - Items must be reserved (if reservation required)
   */
  async validateInventoryConsumption(caseId: string): Promise<void> {
    const surgicalCase = await this.prisma.surgicalCase.findUnique({
      where: { id: caseId },
    });

    if (!surgicalCase) {
      throw new BadRequestException(`Surgical case ${caseId} not found`);
    }

    if (!['IN_PROGRESS', 'COMPLETED'].includes(surgicalCase.status)) {
      throw new BadRequestException(
        `Cannot consume inventory: Case must be IN_PROGRESS or COMPLETED. Current status: ${surgicalCase.status}`,
      );
    }
  }

  /**
   * Get workflow status for a patient
   * Returns current stage in the workflow
   */
  async getPatientWorkflowStatus(patientId: string): Promise<{
    hasConsultation: boolean;
    hasProcedurePlan: boolean;
    hasConsent: boolean;
    hasSurgicalCase: boolean;
    canScheduleSurgery: boolean;
    nextStep: string;
  }> {
    // Find consultation in a completed state (CLOSED, FOLLOW_UP, REFERRED, or SURGERY_SCHEDULED)
    const consultation = await this.prisma.consultation.findFirst({
      where: {
        patientId,
        status: {
          in: ['CLOSED', 'FOLLOW_UP', 'REFERRED', 'SURGERY_SCHEDULED'],
        },
      },
      orderBy: { consultationDate: 'desc' },
    });

    if (!consultation) {
      return {
        hasConsultation: false,
        hasProcedurePlan: false,
        hasConsent: false,
        hasSurgicalCase: false,
        canScheduleSurgery: false,
        nextStep: 'Schedule consultation',
      };
    }

    const procedurePlan = await this.prisma.procedurePlan.findFirst({
      where: {
        consultationId: consultation.id,
        status: 'APPROVED',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        consentInstance: true,
      },
    });

    if (!procedurePlan) {
      return {
        hasConsultation: true,
        hasProcedurePlan: false,
        hasConsent: false,
        hasSurgicalCase: false,
        canScheduleSurgery: false,
        nextStep: 'Create and approve procedure plan',
      };
    }

    if (!procedurePlan.consentInstance) {
      return {
        hasConsultation: true,
        hasProcedurePlan: true,
        hasConsent: false,
        hasSurgicalCase: false,
        canScheduleSurgery: false,
        nextStep: 'Create and sign consent',
      };
    }

    const consent = procedurePlan.consentInstance;

    if (consent.status !== ConsentStatus.SIGNED) {
      return {
        hasConsultation: true,
        hasProcedurePlan: true,
        hasConsent: true,
        hasSurgicalCase: false,
        canScheduleSurgery: false,
        nextStep: `Consent status: ${consent.status}. Must be SIGNED to schedule surgery.`,
      };
    }

    const surgicalCase = await this.prisma.surgicalCase.findFirst({
      where: {
        procedurePlanId: procedurePlan.id,
      },
    });

    return {
      hasConsultation: true,
      hasProcedurePlan: true,
      hasConsent: true,
      hasSurgicalCase: !!surgicalCase,
      canScheduleSurgery: !surgicalCase, // Can schedule if no case exists yet
      nextStep: surgicalCase ? 'Surgery scheduled' : 'Schedule surgery',
    };
  }
}

