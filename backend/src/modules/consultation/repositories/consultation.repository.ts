import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { CreateConsultationDto } from '../dto/create-consultation.dto';
import { UpdateConsultationDto } from '../dto/update-consultation.dto';
import { ConsultationStatus } from '../types/consultation-status';

@Injectable()
export class ConsultationRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Create a new consultation
   * Starts with SCHEDULED status
   */
  async create(
    data: CreateConsultationDto & { createdBy?: string },
  ): Promise<any> {
    // Generate consultation number if not provided
    const consultationNumber = `CONS-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Note: appointmentId is required in schema but not always in DTO
    // For now, we'll create a temporary appointment or make it optional
    // TODO: Add appointmentId to CreateConsultationDto and connect here
    const consultationData: any = {
      patient: {
        connect: { id: data.patientId },
      },
      consultationNumber,
      consultationType: data.visitType || 'INITIAL',
      status: ConsultationStatus.SCHEDULED,
      chiefComplaint: data.chiefComplaint || data.reasonForVisit,
      version: 1,
      ...(data.doctorId && {
        doctor: {
          connect: { id: data.doctorId },
        },
      }),
      ...(data.createdBy && {
        createdBy: data.createdBy,
      }),
      // appointmentId is required in schema but may not be in DTO
      // For now, we'll make it optional and handle at service layer
      // TODO: Add appointmentId to CreateConsultationDto
      ...((data as any).appointmentId && {
        appointment: {
          connect: { id: (data as any).appointmentId },
        },
      }),
    };

    // If appointmentId is not provided, we cannot create the consultation
    // This should be handled at the service layer by ensuring appointment exists first
    if (!(data as any).appointmentId) {
      throw new Error('appointmentId is required to create a consultation. Please create an appointment first.');
    }

    return await this.prisma.consultation.create({
      data: consultationData,
      include: {
        patient: true,
        doctor: true,
      },
    });
  }

  /**
   * Find consultation by ID
   * Returns null if not found
   */
  async findById(id: string): Promise<any> {
    return await this.prisma.consultation.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: true,
      },
    });
  }

  /**
   * List consultations with pagination
   */
  async findAll(
    skip?: number,
    take?: number,
    filters?: {
      patientId?: string;
      doctorId?: string;
      status?: string;
      archived?: boolean;
    },
  ): Promise<{ data: any[]; total: number }> {
    const where: Prisma.ConsultationWhereInput = {
      ...(filters?.patientId && { patientId: filters.patientId }),
      ...(filters?.doctorId && { doctorId: filters.doctorId }),
      ...(filters?.status && { status: filters.status as any }),
    };

    const [data, total] = await Promise.all([
      this.prisma.consultation.findMany({
        where,
        skip,
        take,
        include: {
          patient: true,
          doctor: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.consultation.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Update consultation with optimistic locking
   * Throws ConflictException if version mismatch
   */
  async update(
    id: string,
    data: UpdateConsultationDto & { updatedBy?: string },
  ): Promise<any> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Consultation with ID ${id} not found`);
    }

    // Optimistic locking: check version if provided
    if (data.version !== undefined && data.version !== existing.version) {
      throw new ConflictException(
        'Consultation record was modified by another user. Please refresh and try again.',
      );
    }

    const updateData: Prisma.ConsultationUpdateInput = {
      ...(data.chiefComplaint !== undefined && {
        chiefComplaint: data.chiefComplaint,
      }),
      ...(data.reasonForVisit !== undefined && {
        chiefComplaint: data.reasonForVisit,
      }),
      ...(data.clinicalSummary !== undefined && {
        notes: data.clinicalSummary,
      }),
      version: {
        increment: 1,
      },
      ...(data.updatedBy && {
        updatedBy: data.updatedBy,
      }),
    };

    return await this.prisma.consultation.update({
      where: { id },
      data: updateData,
      include: {
        patient: true,
        doctor: true,
      },
    });
  }

  /**
   * Change consultation status
   * Must be used with state machine validation in service layer
   */
  async changeStatus(
    id: string,
    newStatus: ConsultationStatus,
    options?: {
      completedAt?: Date;
      updatedBy?: string;
      version?: number;
    },
  ): Promise<any> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Consultation with ID ${id} not found`);
    }

    // Optimistic locking: check version if provided
    if (
      options?.version !== undefined &&
      options.version !== existing.version
    ) {
      throw new ConflictException(
        'Consultation record was modified by another user. Please refresh and try again.',
      );
    }

    const updateData: Prisma.ConsultationUpdateInput = {
      status: newStatus,
      ...(options?.completedAt && { completedAt: options.completedAt }),
      version: {
        increment: 1,
      },
      ...(options?.updatedBy && {
        updatedBy: options.updatedBy,
      }),
    };

    return await this.prisma.consultation.update({
      where: { id },
      data: updateData,
      include: {
        patient: true,
        doctor: true,
      },
    });
  }

  /**
   * Cancel consultation
   * Sets status to CANCELLED
   */
  async cancel(id: string, cancelledBy: string): Promise<any> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Consultation with ID ${id} not found`);
    }

    if (existing.status === ConsultationStatus.CANCELLED) {
      throw new ConflictException('Consultation is already cancelled');
    }

    return await this.prisma.consultation.update({
      where: { id },
      data: {
        status: ConsultationStatus.CANCELLED,
        version: {
          increment: 1,
        },
        updatedBy: cancelledBy,
      },
      include: {
        patient: true,
        doctor: true,
      },
    });
  }
}




