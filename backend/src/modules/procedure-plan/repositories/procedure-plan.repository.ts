import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaClient, Prisma, ProcedurePlanType, ProcedurePlanStatus } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { CreateProcedurePlanDto } from '../dto/create-procedure-plan.dto';
import { UpdateProcedurePlanDto } from '../dto/update-procedure-plan.dto';

@Injectable()
export class ProcedurePlanRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Create a new procedure plan
   */
  async create(
    data: CreateProcedurePlanDto & { createdBy?: string },
  ): Promise<any> {
    // Generate plan number
    const planNumber = `PLAN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Get consultation to get patientId
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: data.consultationId },
      select: { patientId: true },
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation with ID ${data.consultationId} not found`);
    }

    const planData: Prisma.ProcedurePlanCreateInput = {
      planNumber,
      patient: { connect: { id: consultation.patientId } },
      consultation: { connect: { id: data.consultationId } },
      surgeon: { connect: { id: data.surgeonId } },
      procedureName: data.procedureName,
      procedureCode: data.procedureCode,
      procedureDescription: data.procedureDescription,
      planType: data.planType as ProcedurePlanType,
      sessionCount: data.sessionCount || 1,
      currentSession: data.currentSession || 1,
      sessionIntervalDays: data.sessionIntervalDays,
      sessionDetails: data.sessionDetails,
      followUpRequired: data.followUpRequired || false,
      followUpIntervalDays: data.followUpIntervalDays,
      notes: data.notes,
      preoperativeNotes: data.preoperativeNotes,
      status: ProcedurePlanStatus.DRAFT,
      ...(data.createdBy && {
        createdBy: data.createdBy,
      }),
    };

    return await this.prisma.procedurePlan.create({
      data: planData,
      include: {
        patient: true,
        consultation: true,
        surgeon: true,
      },
    });
  }

  /**
   * Find procedure plan by ID
   */
  async findById(id: string): Promise<any> {
    return await this.prisma.procedurePlan.findUnique({
      where: { id },
      include: {
        patient: true,
        consultation: true,
        surgeon: true,
      },
    });
  }

  /**
   * Find procedure plans by consultation ID
   */
  async findByConsultationId(consultationId: string): Promise<any[]> {
    return await this.prisma.procedurePlan.findMany({
      where: { consultationId },
      include: {
        patient: true,
        consultation: true,
        surgeon: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find procedure plans by patient ID
   */
  async findByPatientId(patientId: string): Promise<any[]> {
    return await this.prisma.procedurePlan.findMany({
      where: { patientId },
      include: {
        consultation: true,
        surgeon: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update procedure plan with optimistic locking
   */
  async update(
    id: string,
    data: UpdateProcedurePlanDto & { updatedBy?: string },
  ): Promise<any> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Procedure plan with ID ${id} not found`);
    }

    const updateData: Prisma.ProcedurePlanUpdateInput = {
      ...(data.procedureName !== undefined && { procedureName: data.procedureName }),
      ...(data.procedureCode !== undefined && { procedureCode: data.procedureCode }),
      ...(data.procedureDescription !== undefined && { procedureDescription: data.procedureDescription }),
      ...(data.planType !== undefined && { planType: data.planType as ProcedurePlanType }),
      ...(data.sessionCount !== undefined && { sessionCount: data.sessionCount }),
      ...(data.currentSession !== undefined && { currentSession: data.currentSession }),
      ...(data.sessionIntervalDays !== undefined && { sessionIntervalDays: data.sessionIntervalDays }),
      ...(data.sessionDetails !== undefined && { sessionDetails: data.sessionDetails }),
      ...(data.plannedDate !== undefined && { plannedDate: new Date(data.plannedDate) }),
      ...(data.estimatedDurationMinutes !== undefined && { estimatedDurationMinutes: data.estimatedDurationMinutes }),
      ...(data.complexity !== undefined && { complexity: data.complexity }),
      ...(data.followUpRequired !== undefined && { followUpRequired: data.followUpRequired }),
      ...(data.followUpIntervalDays !== undefined && { followUpIntervalDays: data.followUpIntervalDays }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.preoperativeNotes !== undefined && { preoperativeNotes: data.preoperativeNotes }),
      version: { increment: 1 },
      ...(data.updatedBy && { updatedBy: data.updatedBy }),
    };

    return await this.prisma.procedurePlan.update({
      where: { id },
      data: updateData,
      include: {
        patient: true,
        consultation: true,
        surgeon: true,
      },
    });
  }

  /**
   * Change procedure plan status
   */
  async changeStatus(
    id: string,
    newStatus: ProcedurePlanStatus,
    options?: {
      approvedAt?: Date;
      approvedBy?: string;
      updatedBy?: string;
      version?: number;
    },
  ): Promise<any> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Procedure plan with ID ${id} not found`);
    }

    if (options?.version !== undefined && options.version !== existing.version) {
      throw new ConflictException(
        'Procedure plan record was modified by another user. Please refresh and try again.',
      );
    }

    const updateData: Prisma.ProcedurePlanUpdateInput = {
      status: newStatus,
      ...(options?.approvedAt && { approvedAt: options.approvedAt }),
      ...(options?.approvedBy && { approvedBy: options.approvedBy }),
      version: { increment: 1 },
      ...(options?.updatedBy && { updatedBy: options.updatedBy }),
    };

    return await this.prisma.procedurePlan.update({
      where: { id },
      data: updateData,
      include: {
        patient: true,
        consultation: true,
        surgeon: true,
      },
    });
  }

  /**
   * Link follow-up consultation
   */
  async linkFollowUpConsultation(
    id: string,
    followUpConsultationId: string,
  ): Promise<any> {
    return await this.prisma.procedurePlan.update({
      where: { id },
      data: {
        followUpConsultationId,
        version: { increment: 1 },
      },
      include: {
        patient: true,
        consultation: true,
        surgeon: true,
        followUpConsultation: true,
      },
    });
  }
}
