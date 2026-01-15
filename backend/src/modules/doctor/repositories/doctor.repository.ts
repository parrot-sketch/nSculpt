import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';

/**
 * Doctor Repository
 * 
 * Data access layer for doctor-related operations.
 * Handles doctor profile, patient assignments, and related queries.
 */
@Injectable()
export class DoctorRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Find doctor by user ID
   */
  async findByUserId(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        department: true,
        doctorProfile: true,
        roleAssignments: {
          where: {
            isActive: true,
            role: {
              code: { in: ['DOCTOR', 'SURGEON'] },
            },
          },
          include: {
            role: true,
          },
        },
      },
    });
  }

  /**
   * Get all doctors (users with DOCTOR or SURGEON role)
   */
  async findAllDoctors() {
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        roleAssignments: {
          some: {
            isActive: true,
            role: {
              code: { in: ['DOCTOR', 'SURGEON'] },
              isActive: true,
            },
          },
        },
      },
      include: {
        department: true,
        roleAssignments: {
          where: {
            isActive: true,
            role: {
              code: { in: ['DOCTOR', 'SURGEON'] },
            },
          },
          include: {
            role: true,
          },
        },
      },
      orderBy: {
        lastName: 'asc',
      },
    });
  }

  /**
   * Get patients assigned to a doctor
   */
  async getAssignedPatients(doctorId: string, skip?: number, take?: number) {
    const [patients, total] = await Promise.all([
      this.prisma.patient.findMany({
        where: {
          doctorInChargeId: doctorId,
          mergedInto: null,
          status: { not: 'ARCHIVED' },
        },
        skip,
        take,
        include: {
          consultations: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
          procedurePlans: {
            where: { status: { in: ['APPROVED', 'SCHEDULED'] } },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      }),
      this.prisma.patient.count({
        where: {
          doctorInChargeId: doctorId,
          mergedInto: null,
          status: { not: 'ARCHIVED' },
        },
      }),
    ]);

    return {
      patients,
      total,
      skip: skip ?? 0,
      take: take ?? 20,
    };
  }

  /**
   * Get doctor's consultations
   */
  async getConsultations(doctorId: string, skip?: number, take?: number) {
    const [consultations, total] = await Promise.all([
      this.prisma.consultation.findMany({
        where: {
          doctorId,
        },
        skip,
        take,
        include: {
          patient: {
            select: {
              id: true,
              patientNumber: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          consultationDate: 'desc',
        },
      }),
      this.prisma.consultation.count({
        where: {
          doctorId,
        },
      }),
    ]);

    return {
      consultations,
      total,
      skip: skip ?? 0,
      take: take ?? 20,
    };
  }

  /**
   * Get doctor's upcoming surgeries
   */
  async getUpcomingSurgeries(doctorId: string) {
    return this.prisma.surgicalCase.findMany({
      where: {
        primarySurgeonId: doctorId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        scheduledStartAt: { gte: new Date() },
      },
      include: {
        patient: {
          select: {
            id: true,
            patientNumber: true,
            firstName: true,
            lastName: true,
          },
        },
        procedurePlan: {
          select: {
            id: true,
            procedureName: true,
          },
        },
      },
      orderBy: {
        scheduledStartAt: 'asc',
      },
      take: 10,
    });
  }

  /**
   * Get doctor dashboard statistics
   */
  async getDashboardStats(doctorId: string) {
    const [
      totalPatients,
      pendingConsultations,
      upcomingSurgeries,
      pendingConsents,
    ] = await Promise.all([
      this.prisma.patient.count({
        where: {
          doctorInChargeId: doctorId,
          mergedInto: null,
          status: { not: 'ARCHIVED' },
        },
      }),
      this.prisma.consultation.count({
        where: {
          doctorId,
          status: { in: ['SCHEDULED', 'CHECKED_IN', 'IN_TRIAGE'] },
        },
      }),
      this.prisma.surgicalCase.count({
        where: {
          primarySurgeonId: doctorId,
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
          scheduledStartAt: { gte: new Date() },
        },
      }),
      this.prisma.patientConsentInstance.count({
        where: {
          presentedBy: doctorId,
          status: { in: ['DRAFT', 'IN_PROGRESS', 'PENDING_SIGNATURES'] },
        },
      }),
    ]);

    return {
      totalPatients,
      pendingConsultations,
      upcomingSurgeries,
      pendingConsents,
    };
  }

  /**
   * Assign patient to doctor
   */
  async assignPatient(
    patientId: string,
    doctorId: string,
    assignedBy: string,
    reason?: string,
  ) {
    // Verify patient exists
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, doctorInChargeId: true },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${patientId} not found`);
    }

    // Update patient assignment
    return this.prisma.patient.update({
      where: { id: patientId },
      data: {
        doctorInChargeId: doctorId,
        updatedBy: assignedBy,
        version: { increment: 1 },
      },
      include: {
        doctorInCharge: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Unassign patient from doctor
   */
  async unassignPatient(patientId: string, unassignedBy: string, reason?: string) {
    // Verify patient exists and is assigned
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, doctorInChargeId: true },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${patientId} not found`);
    }

    if (!patient.doctorInChargeId) {
      throw new BadRequestException(`Patient is not assigned to any doctor`);
    }

    // Remove assignment
    return this.prisma.patient.update({
      where: { id: patientId },
      data: {
        doctorInChargeId: null,
        updatedBy: unassignedBy,
        version: { increment: 1 },
      },
      include: {
        doctorInCharge: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Get patient by ID (for validation)
   */
  async getPatientById(patientId: string) {
    return this.prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        doctorInChargeId: true,
        patientNumber: true,
        firstName: true,
        lastName: true,
      },
    });
  }
}

