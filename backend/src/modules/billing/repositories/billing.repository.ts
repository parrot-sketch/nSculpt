import { Injectable } from '@nestjs/common';
import { PrismaClient, BillStatus } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { CreateInvoiceDto, BillLineItemDto } from '../dto/create-invoice.dto';
import { UpdateInvoiceDto } from '../dto/update-invoice.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BillingRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  async createBill(data: CreateInvoiceDto) {
    // Calculate totals
    const subtotal = data.lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const tax = data.tax || 0;
    const discount = data.discount || 0;
    const totalAmount = subtotal + tax - discount;

    const billNumber = `BILL-${Date.now()}-${uuidv4().substring(0, 8)}`;

    return await this.prisma.bill.create({
      data: {
        billNumber,
        patientId: data.patientId,
        insurancePolicyId: data.insurancePolicyId,
        billDate: new Date(data.billDate),
        dueDate: new Date(data.dueDate),
        subtotal,
        tax,
        discount,
        totalAmount,
        balance: totalAmount,
        status: BillStatus.DRAFT,
        notes: data.notes,
      },
    });
  }

  async createLineItem(data: {
    billId: string;
    billingCodeId: string;
    description: string;
    quantity: number;
    unitPrice: number;
    serviceDate: Date;
    triggeringEventId: string;
    caseId?: string;
    recordId?: string;
    usageId?: string;
    procedureCode?: string;
    procedureName?: string;
    notes?: string;
  }) {
    const lineTotal = data.quantity * data.unitPrice;

    return await this.prisma.billLineItem.create({
      data: {
        billId: data.billId,
        billingCodeId: data.billingCodeId,
        description: data.description,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        lineTotal,
        serviceDate: data.serviceDate,
        triggeringEventId: data.triggeringEventId,
        caseId: data.caseId,
        recordId: data.recordId,
        usageId: data.usageId,
        procedureCode: data.procedureCode,
        procedureName: data.procedureName,
        notes: data.notes,
      },
    });
  }

  async findBillById(id: string) {
    return await this.prisma.bill.findUnique({
      where: { id },
      include: {
        lineItems: {
          include: {
            billingCode: true,
          },
        },
        policy: true,
        adjustments: true,
        paymentAllocations: true,
      },
    });
  }

  async updateBill(id: string, data: UpdateInvoiceDto) {
    const updateData: any = { ...data };
    if ((data as any).billDate) {
      updateData.billDate = new Date((data as any).billDate);
    }
    if ((data as any).dueDate) {
      updateData.dueDate = new Date((data as any).dueDate);
    }
    if (data.status) {
      updateData.status = data.status as BillStatus;
    }
    return await this.prisma.bill.update({
      where: { id },
      data: updateData,
    });
  }

  async findAllBills(skip?: number, take?: number) {
    return await this.prisma.bill.findMany({
      skip,
      take,
      orderBy: { billDate: 'desc' },
      include: {
        lineItems: true,
      },
    });
  }

  async findAllFiltered(skip?: number, take?: number, userId?: string) {
    if (!userId) {
      return [];
    }

    // Find patients user has access to via surgical cases
    const cases = await this.prisma.surgicalCase.findMany({
      where: {
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
      select: {
        patientId: true,
      },
      distinct: ['patientId'],
    });

    const patientIds = cases.map((c) => c.patientId);

    if (patientIds.length === 0) {
      return [];
    }

    return await this.prisma.bill.findMany({
      where: {
        patientId: { in: patientIds },
      },
      skip,
      take,
      orderBy: { billDate: 'desc' },
      include: {
        lineItems: true,
      },
    });
  }
}

