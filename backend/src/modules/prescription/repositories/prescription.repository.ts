import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient, PrescriptionStatus } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { CreatePrescriptionDto } from '../dto/create-prescription.dto';
import { DispensePrescriptionDto } from '../dto/dispense-prescription.dto';
import { RecordAdministrationDto } from '../dto/record-administration.dto';

@Injectable()
export class PrescriptionRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  async create(
    data: CreatePrescriptionDto & {
      patientId: string;
      prescribedById: string;
    },
  ): Promise<any> {
    return await this.prisma.prescription.create({
      data: {
        patientId: data.patientId,
        consultationId: data.consultationId,
        prescribedById: data.prescribedById,
        medicationName: data.medicationName,
        medicationType: data.medicationType,
        dosage: data.dosage,
        frequency: data.frequency,
        quantity: data.quantity,
        inventoryItemId: data.inventoryItemId,
        instructions: data.instructions,
        duration: data.duration,
        refills: data.refills || 0,
        refillsRemaining: data.refills || 0,
        status: PrescriptionStatus.PRESCRIBED,
      },
      include: {
        patient: true,
        consultation: true,
        prescribedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        inventoryItem: true,
      },
    });
  }

  async findById(id: string): Promise<any> {
    return await this.prisma.prescription.findUnique({
      where: { id },
      include: {
        patient: true,
        consultation: true,
        prescribedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        dispensedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        inventoryItem: true,
        dispensations: {
          include: {
            inventoryTransaction: true,
            inventoryUsage: true,
          },
        },
        administrations: {
          include: {
            patient: true,
            consultation: true,
          },
          orderBy: { administeredAt: 'desc' },
        },
      },
    });
  }

  async findByConsultation(consultationId: string): Promise<any[]> {
    return await this.prisma.prescription.findMany({
      where: { consultationId },
      include: {
        patient: true,
        consultation: true,
        prescribedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        inventoryItem: true,
      },
      orderBy: { prescribedAt: 'desc' },
    });
  }

  async updateStatus(
    id: string,
    status: PrescriptionStatus,
    data?: {
      dispensedById?: string;
      quantityDispensed?: number;
      dispensedAt?: Date;
    },
  ): Promise<any> {
    return await this.prisma.prescription.update({
      where: { id },
      data: {
        status,
        ...(data?.dispensedById && {
          dispensedById: data.dispensedById,
        }),
        ...(data?.quantityDispensed !== undefined && {
          quantityDispensed: {
            increment: data.quantityDispensed,
          },
        }),
        ...(data?.dispensedAt && { dispensedAt: data.dispensedAt }),
      },
      include: {
        patient: true,
        consultation: true,
        prescribedBy: true,
        dispensedBy: true,
        inventoryItem: true,
      },
    });
  }

  async createDispensation(data: {
    prescriptionId: string;
    quantityDispensed: number;
    inventoryTransactionId?: string;
    inventoryUsageId?: string;
    dispensedBy: string;
    notes?: string;
  }): Promise<any> {
    return await this.prisma.prescriptionDispensation.create({
      data: {
        prescriptionId: data.prescriptionId,
        quantityDispensed: data.quantityDispensed,
        inventoryTransactionId: data.inventoryTransactionId,
        inventoryUsageId: data.inventoryUsageId,
        dispensedBy: data.dispensedBy,
        notes: data.notes,
      },
      include: {
        prescription: true,
        inventoryTransaction: true,
        inventoryUsage: true,
      },
    });
  }

  async createAdministration(data: {
    prescriptionId: string;
    consultationId: string;
    patientId: string;
    administeredBy: string;
    dosageGiven: string;
    route: string;
    response?: string;
    notes?: string;
  }): Promise<any> {
    return await this.prisma.medicationAdministration.create({
      data: {
        prescriptionId: data.prescriptionId,
        consultationId: data.consultationId,
        patientId: data.patientId,
        administeredBy: data.administeredBy,
        dosageGiven: data.dosageGiven,
        route: data.route,
        response: data.response,
        notes: data.notes,
      },
      include: {
        prescription: true,
        consultation: true,
        patient: true,
      },
    });
  }
}

