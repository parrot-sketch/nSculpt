import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { CreatePatientIntakeDto } from '../dto/create-patient-intake.dto';
import { UpdatePatientIntakeDto } from '../dto/update-patient-intake.dto';

@Injectable()
export class PatientIntakeRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Create a new patient intake (start intake)
   */
  async create(patientId: string, data: CreatePatientIntakeDto & { createdBy?: string }) {
    // Check if patient already has an active intake (DRAFT or IN_PROGRESS)
    const existingIntake = await this.prisma.patientIntake.findFirst({
      where: {
        patientId,
        status: {
          in: ['DRAFT', 'IN_PROGRESS'] as any, // Will use PatientIntakeStatus enum once Prisma generates client
        },
      },
    });

    if (existingIntake) {
      throw new ConflictException(
        `Patient ${patientId} already has an active intake form. ` +
        `Please complete or discard the existing intake before creating a new one.`,
      );
    }

    // Create intake with DRAFT status
    return this.prisma.patientIntake.create({
      data: {
        patientId,
        status: 'DRAFT',
        startedAt: new Date(),
        medicalHistory: data.medicalHistory || null,
        allergies: data.allergies ? JSON.parse(JSON.stringify(data.allergies)) : null,
        medications: data.medications ? JSON.parse(JSON.stringify(data.medications)) : null,
        chronicConditions: data.chronicConditions
          ? JSON.parse(JSON.stringify(data.chronicConditions))
          : null,
        notes: data.notes || null,
        createdBy: data.createdBy || null,
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
      },
    });
  }

  /**
   * Find intake by ID
   */
  async findById(id: string) {
    const intake = await this.prisma.patientIntake.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            patientNumber: true,
            firstName: true,
            lastName: true,
            lifecycleState: true,
          },
        },
        verifiedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!intake) {
      throw new NotFoundException(`Patient intake with ID ${id} not found`);
    }

    return intake;
  }

  /**
   * Find active intake for a patient
   */
  async findActiveByPatientId(patientId: string) {
    return this.prisma.patientIntake.findFirst({
      where: {
        patientId,
        status: {
          in: ['DRAFT', 'IN_PROGRESS'] as any, // Will use PatientIntakeStatus enum once Prisma generates client
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Find completed intake for a patient (not yet verified)
   */
  async findCompletedByPatientId(patientId: string) {
    return this.prisma.patientIntake.findFirst({
      where: {
        patientId,
        status: 'COMPLETED',
      },
      orderBy: {
        completedAt: 'desc',
      },
    });
  }

  /**
   * Find verified intake for a patient
   */
  async findVerifiedByPatientId(patientId: string) {
    return this.prisma.patientIntake.findFirst({
      where: {
        patientId,
        status: 'VERIFIED',
      },
      orderBy: {
        verifiedAt: 'desc',
      },
    });
  }

  /**
   * Update intake (save draft)
   */
  async update(
    id: string,
    data: UpdatePatientIntakeDto & { updatedBy?: string },
  ) {
    // Get current intake to check version
    const existingIntake = await this.findById(id);

    // Check version for optimistic locking
    if (data.version !== undefined && data.version !== existingIntake.version) {
      throw new ConflictException(
        `Intake was modified by another process. Expected version ${existingIntake.version}, got ${data.version}. ` +
        `Please reload and try again.`,
      );
    }

    // Cannot update if already completed or verified
    if (existingIntake.status === 'COMPLETED' || existingIntake.status === 'VERIFIED') {
      throw new ConflictException(
        `Cannot update intake with status ${existingIntake.status}. ` +
        `Only DRAFT and IN_PROGRESS intakes can be updated.`,
      );
    }

    // Prepare update data
    const updateData: Prisma.PatientIntakeUpdateInput = {
      status: 'IN_PROGRESS', // Mark as IN_PROGRESS when saved
      ...(data.medicalHistory !== undefined && {
        medicalHistory: data.medicalHistory ? JSON.parse(JSON.stringify(data.medicalHistory)) : null,
      }),
      ...(data.allergies !== undefined && {
        allergies: data.allergies ? JSON.parse(JSON.stringify(data.allergies)) : null,
      }),
      ...(data.medications !== undefined && {
        medications: data.medications ? JSON.parse(JSON.stringify(data.medications)) : null,
      }),
      ...(data.chronicConditions !== undefined && {
        chronicConditions: data.chronicConditions
          ? JSON.parse(JSON.stringify(data.chronicConditions))
          : null,
      }),
      ...(data.notes !== undefined && { notes: data.notes }),
      version: {
        increment: 1,
      },
    };

    return this.prisma.patientIntake.update({
      where: { id },
      data: updateData,
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
    });
  }

  /**
   * Mark intake as completed (patient submits)
   */
  async markCompleted(id: string, attestation?: string) {
    const existingIntake = await this.findById(id);

    // Can only complete if status is DRAFT or IN_PROGRESS
    if (existingIntake.status !== 'DRAFT' && existingIntake.status !== 'IN_PROGRESS') {
      throw new ConflictException(
        `Cannot complete intake with status ${existingIntake.status}. ` +
        `Only DRAFT and IN_PROGRESS intakes can be completed.`,
      );
    }

    return this.prisma.patientIntake.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        patientAttestation: attestation || null,
        version: {
          increment: 1,
        },
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
      },
    });
  }

  /**
   * Mark intake as verified (staff verification)
   */
  async markVerified(
    id: string,
    verifiedBy: string,
    reason: string,
    verificationNotes?: string,
    approved: boolean = true,
  ) {
    const existingIntake = await this.findById(id);

    // Can only verify if status is COMPLETED
    if (existingIntake.status !== 'COMPLETED') {
      throw new ConflictException(
        `Cannot verify intake with status ${existingIntake.status}. ` +
        `Only COMPLETED intakes can be verified.`,
      );
    }

    return this.prisma.patientIntake.update({
      where: { id },
      data: {
        status: 'VERIFIED',
        verifiedAt: new Date(),
        verifiedBy,
        reason: reason || null, // Reason for verification (clinical requirement)
        verificationNotes: verificationNotes || null,
        approved,
        version: {
          increment: 1,
        },
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
        verifiedByUser: {
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
   * Find all intakes for a patient (for history)
   */
  async findByPatientId(patientId: string, skip?: number, take?: number) {
    const [intakes, total] = await Promise.all([
      this.prisma.patientIntake.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
        skip: skip || 0,
        take: take || 50,
        include: {
          verifiedByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.patientIntake.count({
        where: { patientId },
      }),
    ]);

    return { data: intakes, total, skip: skip || 0, take: take || 50 };
  }
}
