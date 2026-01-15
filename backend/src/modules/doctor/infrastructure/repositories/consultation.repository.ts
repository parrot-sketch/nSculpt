/**
 * Consultation Repository
 * 
 * Infrastructure layer repository for Consultation persistence.
 * Maps between domain entities and Prisma models.
 * 
 * @infrastructure-layer
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaClient, Prisma, ConsultationStatus as PrismaConsultationStatus } from '@prisma/client';
import { getPrismaClient } from '../../../../prisma/client';
import { Consultation, ConsultationStatus, ConsultationType } from '../../domain/entities/consultation.entity';
import { ConsultationNumber } from '../../domain/value-objects/consultation-number.vo';

/**
 * Map domain ConsultationStatus to Prisma ConsultationStatus
 */
function mapDomainStatusToPrisma(
  status: ConsultationStatus,
): PrismaConsultationStatus {
  const mapping: Record<ConsultationStatus, PrismaConsultationStatus> = {
    [ConsultationStatus.SCHEDULED]: PrismaConsultationStatus.SCHEDULED,
    [ConsultationStatus.IN_PROGRESS]: PrismaConsultationStatus.IN_CONSULTATION,
    [ConsultationStatus.COMPLETED]: PrismaConsultationStatus.CLOSED,
    [ConsultationStatus.REQUIRES_FOLLOW_UP]: PrismaConsultationStatus.FOLLOW_UP,
    [ConsultationStatus.CANCELLED]: PrismaConsultationStatus.CANCELLED,
  };
  return mapping[status] || PrismaConsultationStatus.SCHEDULED;
}

/**
 * Map Prisma ConsultationStatus to domain ConsultationStatus
 */
function mapPrismaStatusToDomain(
  status: PrismaConsultationStatus,
): ConsultationStatus {
  const mapping: Record<PrismaConsultationStatus, ConsultationStatus> = {
    [PrismaConsultationStatus.SCHEDULED]: ConsultationStatus.SCHEDULED,
    [PrismaConsultationStatus.CHECKED_IN]: ConsultationStatus.SCHEDULED,
    [PrismaConsultationStatus.IN_TRIAGE]: ConsultationStatus.SCHEDULED,
    [PrismaConsultationStatus.IN_CONSULTATION]: ConsultationStatus.IN_PROGRESS,
    [PrismaConsultationStatus.PLAN_CREATED]: ConsultationStatus.IN_PROGRESS,
    [PrismaConsultationStatus.CLOSED]: ConsultationStatus.COMPLETED,
    [PrismaConsultationStatus.FOLLOW_UP]: ConsultationStatus.REQUIRES_FOLLOW_UP,
    [PrismaConsultationStatus.REFERRED]: ConsultationStatus.COMPLETED,
    [PrismaConsultationStatus.SURGERY_SCHEDULED]: ConsultationStatus.COMPLETED,
    [PrismaConsultationStatus.CANCELLED]: ConsultationStatus.CANCELLED,
    [PrismaConsultationStatus.NO_SHOW]: ConsultationStatus.CANCELLED, // NO_SHOW maps to CANCELLED in domain
  };
  return mapping[status] || ConsultationStatus.SCHEDULED;
}

@Injectable()
export class ConsultationRepository {
  private readonly logger = new Logger(ConsultationRepository.name);
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Generate next consultation number
   * Format: CONS-YYYY-NNNNN
   */
  async generateNextConsultationNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CONS-${year}-`;

    const lastConsultation = await this.prisma.consultation.findFirst({
      where: {
        consultationNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        consultationNumber: 'desc',
      },
      select: {
        consultationNumber: true,
      },
    });

    let nextNumber = 1;
    if (lastConsultation) {
      const match = lastConsultation.consultationNumber.match(/-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    const formattedNumber = nextNumber.toString().padStart(5, '0');
    return `${prefix}${formattedNumber}`;
  }

  /**
   * Find consultation by ID
   */
  async findById(id: string): Promise<Consultation | null> {
    const data = await this.prisma.consultation.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: true,
        appointment: true,
      },
    });

    if (!data) {
      return null;
    }

    return this.mapToDomainEntity(data);
  }

  /**
   * Find consultation by appointment ID
   */
  async findByAppointmentId(appointmentId: string): Promise<Consultation | null> {
    const data = await this.prisma.consultation.findUnique({
      where: { appointmentId },
      include: {
        patient: true,
        doctor: true,
        appointment: true,
      },
    });

    if (!data) {
      return null;
    }

    return this.mapToDomainEntity(data);
  }

  /**
   * Find appointment by ID (for validation)
   */
  async findAppointmentById(id: string): Promise<any> {
    return await this.prisma.appointment.findUnique({
      where: { id },
    });
  }

  /**
   * Create consultation
   */
  async create(consultation: Consultation): Promise<Consultation> {
    const props = consultation.toObject();

    const data = await this.prisma.consultation.create({
      data: {
        consultationNumber: props.consultationNumber,
        patientId: props.patientId,
        doctorId: props.doctorId,
        appointmentId: props.appointmentId,
        consultationType: props.consultationType,
        consultationDate: props.consultationDate,
        status: mapDomainStatusToPrisma(props.status),
        chiefComplaint: props.chiefComplaint,
        diagnosis: props.diagnosis,
        notes: props.notes,
        followUpRequired: props.followUpRequired,
        followUpDate: props.followUpDate,
        billable: props.billable,
        billed: props.billed,
        completedAt: props.completedAt,
        createdBy: props.createdBy,
        version: props.version,
      },
      include: {
        patient: true,
        doctor: true,
        appointment: true,
      },
    });

    return this.mapToDomainEntity(data);
  }

  /**
   * Update consultation
   */
  async update(consultation: Consultation): Promise<Consultation> {
    const props = consultation.toObject();

    const data = await this.prisma.consultation.update({
      where: { id: props.id },
      data: {
        status: mapDomainStatusToPrisma(props.status),
        chiefComplaint: props.chiefComplaint,
        diagnosis: props.diagnosis,
        notes: props.notes,
        followUpRequired: props.followUpRequired,
        followUpDate: props.followUpDate,
        completedAt: props.completedAt,
        updatedBy: props.updatedBy,
        version: props.version,
        updatedAt: new Date(),
      },
      include: {
        patient: true,
        doctor: true,
        appointment: true,
      },
    });

    return this.mapToDomainEntity(data);
  }

  /**
   * Find all consultations with filters
   */
  async findAll(params: {
    skip?: number;
    take?: number;
    doctorId?: string;
    patientId?: string;
    status?: string;
  }): Promise<{ data: Consultation[]; total: number }> {
    const where: Prisma.ConsultationWhereInput = {
      ...(params.doctorId && { doctorId: params.doctorId }),
      ...(params.patientId && { patientId: params.patientId }),
      ...(params.status && {
        status: this.mapDomainStatusToPrismaForQuery(params.status),
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.consultation.findMany({
        where,
        skip: params.skip,
        take: params.take,
        include: {
          patient: true,
          doctor: true,
          appointment: true,
        },
        orderBy: {
          consultationDate: 'desc',
        },
      }),
      this.prisma.consultation.count({ where }),
    ]);

    return {
      data: data.map((item) => this.mapToDomainEntity(item)),
      total,
    };
  }

  /**
   * Map Prisma data to domain entity
   */
  private mapToDomainEntity(data: any): Consultation {
    return Consultation.reconstitute({
      id: data.id,
      consultationNumber: data.consultationNumber,
      patientId: data.patientId,
      doctorId: data.doctorId,
      appointmentId: data.appointmentId,
      consultationType: data.consultationType as ConsultationType,
      consultationDate: data.consultationDate,
      status: mapPrismaStatusToDomain(data.status),
      chiefComplaint: data.chiefComplaint || undefined,
      diagnosis: data.diagnosis || undefined,
      notes: data.notes || undefined,
      followUpRequired: data.followUpRequired,
      followUpDate: data.followUpDate || undefined,
      billable: data.billable,
      billed: data.billed,
      completedAt: data.completedAt || undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      createdBy: data.createdBy || undefined,
      updatedBy: data.updatedBy || undefined,
      version: data.version,
    });
  }

  /**
   * Map domain status string to Prisma status for queries
   */
  private mapDomainStatusToPrismaForQuery(
    status: string,
  ): PrismaConsultationStatus | undefined {
    const domainStatus = status as ConsultationStatus;
    if (Object.values(ConsultationStatus).includes(domainStatus)) {
      return mapDomainStatusToPrisma(domainStatus);
    }
    return undefined;
  }
}
