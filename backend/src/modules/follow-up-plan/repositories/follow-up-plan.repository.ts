import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaClient, Prisma, FollowUpPlanStatus } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { CreateFollowUpPlanDto } from '../dto/create-follow-up-plan.dto';
import { UpdateFollowUpPlanDto } from '../dto/update-follow-up-plan.dto';

@Injectable()
export class FollowUpPlanRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Create a new follow-up plan
   */
  async create(
    data: CreateFollowUpPlanDto & { createdBy?: string },
  ): Promise<any> {
    // Get consultation to get patientId
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: data.consultationId },
      select: { patientId: true },
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation with ID ${data.consultationId} not found`);
    }

    const planData: Prisma.FollowUpPlanCreateInput = {
      consultation: { connect: { id: data.consultationId } },
      patient: { connect: { id: consultation.patientId } },
      doctor: { connect: { id: data.doctorId } },
      followUpType: data.followUpType,
      intervalDays: data.intervalDays,
      reason: data.reason,
      status: FollowUpPlanStatus.PENDING,
      ...(data.createdBy && {
        createdBy: data.createdBy,
      }),
    };

    return await this.prisma.followUpPlan.create({
      data: planData,
      include: {
        consultation: true,
        patient: true,
        doctor: true,
      },
    });
  }

  /**
   * Find follow-up plan by ID
   */
  async findById(id: string): Promise<any> {
    return await this.prisma.followUpPlan.findUnique({
      where: { id },
      include: {
        consultation: true,
        patient: true,
        doctor: true,
        appointment: true,
      },
    });
  }

  /**
   * Find follow-up plans by consultation ID
   */
  async findByConsultationId(consultationId: string): Promise<any[]> {
    return await this.prisma.followUpPlan.findMany({
      where: { consultationId },
      include: {
        consultation: true,
        patient: true,
        doctor: true,
        appointment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find follow-up plans by patient ID
   */
  async findByPatientId(patientId: string): Promise<any[]> {
    return await this.prisma.followUpPlan.findMany({
      where: { patientId },
      include: {
        consultation: true,
        doctor: true,
        appointment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update follow-up plan
   */
  async update(
    id: string,
    data: UpdateFollowUpPlanDto & { updatedBy?: string },
  ): Promise<any> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Follow-up plan with ID ${id} not found`);
    }

    const updateData: Prisma.FollowUpPlanUpdateInput = {
      ...(data.followUpType !== undefined && { followUpType: data.followUpType }),
      ...(data.scheduledDate !== undefined && { scheduledDate: new Date(data.scheduledDate) }),
      ...(data.intervalDays !== undefined && { intervalDays: data.intervalDays }),
      ...(data.reason !== undefined && { reason: data.reason }),
      ...(data.appointmentId !== undefined && {
        appointment: data.appointmentId ? { connect: { id: data.appointmentId } } : { disconnect: true },
      }),
      version: { increment: 1 },
      ...(data.updatedBy && { updatedBy: data.updatedBy }),
    };

    return await this.prisma.followUpPlan.update({
      where: { id },
      data: updateData,
      include: {
        consultation: true,
        patient: true,
        doctor: true,
        appointment: true,
      },
    });
  }

  /**
   * Change follow-up plan status
   */
  async changeStatus(
    id: string,
    newStatus: FollowUpPlanStatus,
    options?: {
      updatedBy?: string;
      version?: number;
    },
  ): Promise<any> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Follow-up plan with ID ${id} not found`);
    }

    if (options?.version !== undefined && options.version !== existing.version) {
      throw new ConflictException(
        'Follow-up plan record was modified by another user. Please refresh and try again.',
      );
    }

    const updateData: Prisma.FollowUpPlanUpdateInput = {
      status: newStatus,
      version: { increment: 1 },
      ...(options?.updatedBy && { updatedBy: options.updatedBy }),
    };

    return await this.prisma.followUpPlan.update({
      where: { id },
      data: updateData,
      include: {
        consultation: true,
        patient: true,
        doctor: true,
        appointment: true,
      },
    });
  }
}
