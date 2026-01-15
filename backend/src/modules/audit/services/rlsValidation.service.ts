import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { IdentityContextService } from '../../auth/services/identityContext.service';

/**
 * RLS Validation Service
 * 
 * Provides row-level security validation for resources.
 * Checks ownership, relationships, and access rights.
 */
@Injectable()
export class RlsValidationService {
  private prisma: PrismaClient;

  constructor(private identityContext: IdentityContextService) {
    this.prisma = getPrismaClient();
  }

  /**
   * Check if a patient user can access their own record
   * 
   * CRITICAL: This is the primary RLS check for patient self-service.
   * Uses the userId FK on Patient model for proper referential integrity.
   * 
   * @param patientId - The patient ID being accessed
   * @param userId - The user ID making the request
   * @returns true if patient.userId === userId
   */
  async canPatientAccessOwnRecord(patientId: string, userId: string): Promise<boolean> {
    // NOTE: Until Prisma client is regenerated with new schema,
    // we need to use raw query or cast to any
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    }) as any;

    if (!patient) {
      return false;
    }

    // Patient can only access their own record (via userId FK)
    // Falls back to false if userId field doesn't exist yet
    return patient.userId === userId;
  }

  /**
   * Check if user has access to a patient
   * 
   * Access granted if:
   * - User is ADMIN
   * - User is the patient themselves (via userId FK)
   * - User is assigned to a surgical case for this patient
   * - User is primary surgeon for a case involving this patient
   * - User is the doctor assigned to a consultation for this patient
   * - User has FRONT_DESK role (view-only for scheduling)
   */
  async canAccessPatient(patientId: string, userId: string): Promise<boolean> {
    // ADMIN has full access
    if (this.identityContext.hasRole('ADMIN')) {
      return true;
    }

    // Check if user IS the patient (via userId FK)
    if (this.identityContext.hasRole('PATIENT')) {
      const isSelf = await this.canPatientAccessOwnRecord(patientId, userId);
      if (isSelf) {
        return true;
      }
    }

    // FRONT_DESK can view patients for scheduling purposes
    if (this.identityContext.hasRole('FRONT_DESK')) {
      return true;
    }

    // Check if user is assigned to any surgical case for this patient
    const caseAssignment = await this.prisma.surgicalCase.findFirst({
      where: {
        patientId,
        OR: [
          { primarySurgeonId: userId },
          {
            resourceAllocations: {
              some: {
                resourceType: 'STAFF',
                resourceId: userId,
                status: 'ALLOCATED',
              },
            },
          },
        ],
      },
    });

    if (caseAssignment) {
      return true;
    }

    // Check if user is the doctor assigned to a consultation for this patient
    const consultation = await this.prisma.consultation.findFirst({
      where: {
        patientId,
        doctorId: userId,
      },
    });

    if (consultation) {
      return true;
    }

    // Check if user is doctor in charge of patient
    const isDocInCharge = await this.prisma.patient.findFirst({
      where: {
        id: patientId,
        doctorInChargeId: userId,
      },
    });

    if (isDocInCharge) {
      return true;
    }

    // Check if user has an appointment with this patient
    const hasAppointment = await this.prisma.appointment.findFirst({
      where: {
        patientId,
        doctorId: userId,
      },
    });

    if (hasAppointment) {
      return true;
    }

    return false;
  }

  /**
   * Check if user has access to a surgical case
   * 
   * Access granted if:
   * - User is ADMIN
   * - User is the primarySurgeonId
   * - User is allocated to the case via ResourceAllocation
   * - User's department matches the theater's department
   */
  async canAccessSurgicalCase(caseId: string, userId: string): Promise<boolean> {
    // ADMIN has full access
    if (this.identityContext.hasRole('ADMIN')) {
      return true;
    }

    const surgicalCase = await this.prisma.surgicalCase.findUnique({
      where: { id: caseId },
      include: {
        reservations: {
          include: {
            theater: {
              include: {
                department: true,
              },
            },
          },
        },
        resourceAllocations: true,
      },
    });

    if (!surgicalCase) {
      return false;
    }

    // Check if user is primary surgeon
    if (surgicalCase.primarySurgeonId === userId) {
      return true;
    }

    // Check if user is allocated to the case
    const isAllocated = surgicalCase.resourceAllocations.some(
      (allocation) =>
        allocation.resourceType === 'STAFF' &&
        allocation.resourceId === userId &&
        allocation.status === 'ALLOCATED',
    );

    if (isAllocated) {
      return true;
    }

    // Check if user's department matches theater department
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { departmentId: true },
    });

    if (user?.departmentId) {
      const theaterDepartmentMatch = surgicalCase.reservations.some(
        (reservation) => reservation.theater.departmentId === user.departmentId,
      );

      if (theaterDepartmentMatch) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if user has access to a medical record
   * 
   * Access granted if:
   * - User is ADMIN
   * - User has access to the patient (via case or department)
   */
  async canAccessMedicalRecord(
    recordId: string,
    userId: string,
  ): Promise<boolean> {
    // ADMIN has full access
    if (this.identityContext.hasRole('ADMIN')) {
      return true;
    }

    const record = await this.prisma.medicalRecord.findUnique({
      where: { id: recordId },
      select: { patientId: true },
    });

    if (!record) {
      return false;
    }

    // Check patient access
    return this.canAccessPatient(record.patientId, userId);
  }

  /**
   * Check if user has access to a consent instance
   * 
   * Access granted if:
   * - User is ADMIN
   * - User has access to the patient
   * - For restricted patients: Only ADMIN or assigned DOCTOR
   */
  async canAccessConsent(consentId: string, userId: string): Promise<boolean> {
    // ADMIN has full access
    if (this.identityContext.hasRole('ADMIN')) {
      return true;
    }

    // Try PDF consent first
    let consent = await this.prisma.pDFConsent.findUnique({
      where: { id: consentId },
      select: { 
        patientId: true,
        createdById: true,
        consultationId: true,
      },
    });

    // If not found, try structured consent
    if (!consent) {
      const structuredConsent = await this.prisma.patientConsentInstance.findUnique({
        where: { id: consentId },
        select: { 
          patientId: true,
          createdBy: true,
          consultationId: true,
        },
      });
      if (!structuredConsent) {
        return false; // Consent not found
      }
      consent = { 
        patientId: structuredConsent.patientId,
        createdById: structuredConsent.createdBy,
        consultationId: structuredConsent.consultationId,
      };
    }

    // Check if user created the consent
    if (consent.createdById === userId) {
      return true;
    }

    // Check consultation relationship
    if (consent.consultationId) {
      const consultation = await this.prisma.consultation.findUnique({
        where: { id: consent.consultationId },
        select: { doctorId: true },
      });
      
      // If user is the doctor assigned to the consultation, grant access
      if (consultation?.doctorId === userId) {
        return true;
      }
    }

    // Check patient access (includes surgical case assignments and consultation relationships)
    if (consent.patientId) {
      const hasPatientAccess = await this.canAccessPatient(consent.patientId, userId);
      if (hasPatientAccess) {
        // Check if patient is restricted
        const patient = await this.prisma.patient.findUnique({
          where: { id: consent.patientId },
          select: { restricted: true },
        });

        // For restricted patients, only ADMIN or assigned DOCTOR can access
        if (patient?.restricted) {
          const isDoctor = this.identityContext.hasRole('DOCTOR') || this.identityContext.hasRole('SURGEON');
          if (!isDoctor) {
            return false;
          }
          // Check if doctor has access via consultation or case
          return await this.canAccessPatient(consent.patientId, userId);
        }

        return true;
      }
    }

    // If no patientId, deny access (data integrity issue)
    return false;
  }

  /**
   * Check if user has access to a PDF consent
   * Enhanced with restricted patient checks
   */
  async canAccessPDFConsent(consentId: string, userId: string): Promise<boolean> {
    return this.canAccessConsent(consentId, userId);
  }

  /**
   * Check if user has access to a bill
   * 
   * Access granted if:
   * - User is ADMIN
   * - User has BILLING role
   * - User has access to the patient
   */
  async canAccessBill(billId: string, userId: string): Promise<boolean> {
    // ADMIN and BILLING roles have access
    if (
      this.identityContext.hasRole('ADMIN') ||
      this.identityContext.hasRole('BILLING')
    ) {
      return true;
    }

    const bill = await this.prisma.bill.findUnique({
      where: { id: billId },
      select: { patientId: true },
    });

    if (!bill) {
      return false;
    }

    // Check patient access (for DOCTOR role viewing their patient's bills)
    return this.canAccessPatient(bill.patientId, userId);
  }

  /**
   * Check if user can modify a surgical case
   * 
   * Modification allowed if:
   * - User is ADMIN
   * - User is the primarySurgeonId
   * - User is allocated to the case (for NURSE role)
   */
  async canModifySurgicalCase(
    caseId: string,
    userId: string,
  ): Promise<boolean> {
    // ADMIN can modify any case
    if (this.identityContext.hasRole('ADMIN')) {
      return true;
    }

    const surgicalCase = await this.prisma.surgicalCase.findUnique({
      where: { id: caseId },
      select: {
        primarySurgeonId: true,
        resourceAllocations: {
          where: {
            resourceType: 'STAFF',
            resourceId: userId,
            status: 'ALLOCATED',
          },
        },
      },
    });

    if (!surgicalCase) {
      return false;
    }

    // Primary surgeon can modify
    if (surgicalCase.primarySurgeonId === userId) {
      return true;
    }

    // Allocated staff (NURSE) can modify
    if (surgicalCase.resourceAllocations.length > 0) {
      return true;
    }

    return false;
  }

  /**
   * Check if user can modify a medical record
   * 
   * Modification allowed if:
   * - User is ADMIN
   * - User is DOCTOR and has access to the patient
   */
  async canModifyMedicalRecord(
    recordId: string,
    userId: string,
  ): Promise<boolean> {
    // ADMIN can modify any record
    if (this.identityContext.hasRole('ADMIN')) {
      return true;
    }

    // DOCTOR can modify if they have patient access
    if (this.identityContext.hasRole('DOCTOR')) {
      return this.canAccessMedicalRecord(recordId, userId);
    }

    return false;
  }
}

