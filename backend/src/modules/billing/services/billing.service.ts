import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { BillingRepository } from '../repositories/billing.repository';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { IdentityContextService } from '../../../modules/auth/services/identityContext.service';
import { RlsValidationService } from '../../../modules/audit/services/rlsValidation.service';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { UpdateInvoiceDto } from '../dto/update-invoice.dto';
import { BillingEventType } from '../events/billing.events';
import { getPrismaClient } from '../../../prisma/client';
import { InvoiceStatus, PaymentStatus, Domain } from '@prisma/client';

@Injectable()
export class BillingService {
  constructor(
    private readonly billingRepository: BillingRepository,
    private readonly domainEventService: DomainEventService,
    private readonly correlationService: CorrelationService,
    private readonly identityContext: IdentityContextService,
    private readonly rlsValidation: RlsValidationService,
  ) { }

  async create(createInvoiceDto: CreateInvoiceDto, userId: string) {
    // Create bill (Legacy model)
    const bill = await this.billingRepository.createBill(createInvoiceDto);
    const context = this.correlationService.getContext();

    // Emit bill created event
    const billEvent = await this.domainEventService.createEvent({
      eventType: BillingEventType.BILL_CREATED,
      domain: Domain.BILLING,
      aggregateId: bill.id,
      aggregateType: 'Bill',
      payload: {
        billId: bill.id,
        billNumber: bill.billNumber,
        patientId: bill.patientId,
        totalAmount: Number(bill.totalAmount),
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    // Create line items
    for (const lineItem of createInvoiceDto.lineItems) {
      const lineItemEvent = await this.domainEventService.createEvent({
        eventType: BillingEventType.BILL_LINE_ITEM_CREATED,
        domain: Domain.BILLING,
        aggregateId: bill.id,
        aggregateType: 'BillLineItem',
        payload: {
          billId: bill.id,
          billingCodeId: lineItem.billingCodeId,
          quantity: lineItem.quantity,
          unitPrice: lineItem.unitPrice,
        },
        correlationId: context.correlationId || undefined,
        causationId: billEvent.id,
        createdBy: userId,
        sessionId: context.sessionId || undefined,
        requestId: context.requestId || undefined,
      });

      await this.billingRepository.createLineItem({
        billId: bill.id,
        billingCodeId: lineItem.billingCodeId,
        description: lineItem.description,
        quantity: lineItem.quantity,
        unitPrice: lineItem.unitPrice,
        serviceDate: new Date(lineItem.serviceDate),
        triggeringEventId: lineItemEvent.id,
        caseId: lineItem.caseId,
        recordId: lineItem.recordId,
      });
    }

    return this.billingRepository.findBillById(bill.id);
  }

  async findOne(id: string, userId?: string) {
    const bill = await this.billingRepository.findBillById(id);
    if (!bill) {
      throw new NotFoundException(`Bill with ID ${id} not found`);
    }

    if (userId) {
      const hasAccess = await this.rlsValidation.canAccessBill(id, userId);
      if (!hasAccess) {
        throw new ForbiddenException(`Access denied to bill ${id}`);
      }
    }

    return bill;
  }

  async update(id: string, updateInvoiceDto: UpdateInvoiceDto, userId: string) {
    await this.findOne(id, userId);
    const updatedBill = await this.billingRepository.updateBill(id, updateInvoiceDto);
    const context = this.correlationService.getContext();

    if (updateInvoiceDto.status) {
      await this.domainEventService.createEvent({
        eventType: BillingEventType.BILL_STATUS_CHANGED,
        domain: Domain.BILLING,
        aggregateId: id,
        aggregateType: 'Bill',
        payload: {
          billId: id,
          status: updateInvoiceDto.status,
        },
        correlationId: context.correlationId || undefined,
        causationId: context.causationId || undefined,
        createdBy: userId,
        sessionId: context.sessionId || undefined,
        requestId: context.requestId || undefined,
      });
    }

    return updatedBill;
  }

  async findAll(skip?: number, take?: number, userId?: string) {
    if (!userId) return [];
    if (this.identityContext.hasRole('ADMIN') || this.identityContext.hasRole('BILLING')) {
      return this.billingRepository.findAllBills(skip, take);
    }
    return this.billingRepository.findAllFiltered(skip, take, userId);
  }

  /**
   * New Invoice Domain Methods
   */
  async createInvoice(data: {
    patientId: string;
    totalAmount: number;
    visitId?: string;
    appointmentId?: string;
    procedurePlanId?: string;
    followUpPlanId?: string;
  }): Promise<string> {
    const prisma = getPrismaClient();
    if (!data.visitId && !data.procedurePlanId && !data.followUpPlanId && !data.appointmentId) {
      throw new BadRequestException('Invoice must be linked to a Visit, Appointment, ProcedurePlan, or FollowUpPlan');
    }

    return await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber: `INV-${Date.now()}`,
          patientId: data.patientId,
          visitId: data.visitId,
          appointmentId: data.appointmentId,
          procedurePlanId: data.procedurePlanId,
          followUpPlanId: data.followUpPlanId,
          totalAmount: data.totalAmount,
          netAmount: data.totalAmount,
          status: InvoiceStatus.ISSUED,
        },
      });
      return invoice.id;
    });
  }

  async recordPayment(invoiceId: string, gatewayPayload: {
    gatewayName: string;
    transactionId: string;
    amount: number;
    status: PaymentStatus;
  }): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.$transaction(async (tx) => {
      const existingLog = await tx.paymentGatewayLog.findUnique({
        where: { transactionId: gatewayPayload.transactionId },
      });

      if (existingLog) throw new BadRequestException('Transaction ID already recorded');

      await tx.paymentGatewayLog.create({
        data: {
          invoiceId,
          gatewayName: gatewayPayload.gatewayName,
          transactionId: gatewayPayload.transactionId,
          amount: gatewayPayload.amount,
          status: gatewayPayload.status,
        },
      });

      if (gatewayPayload.status === PaymentStatus.COMPLETED) {
        const invoice = await tx.invoice.findUnique({
          where: { id: invoiceId },
          include: { paymentLogs: true },
        });

        if (!invoice) throw new BadRequestException('Invoice not found');

        const totalPaid = invoice.paymentLogs
          .filter(log => log.status === PaymentStatus.COMPLETED)
          .reduce((sum, log) => sum + Number(log.amount), 0);

        let newStatus: InvoiceStatus = InvoiceStatus.PARTIAL;
        if (totalPaid >= Number(invoice.netAmount)) {
          newStatus = InvoiceStatus.PAID;
        }

        await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            status: newStatus,
            paidAt: newStatus === InvoiceStatus.PAID ? new Date() : undefined,
          },
        });
      }
    });
  }

  async refundPayment(logId: string, actorId: string): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.$transaction(async (tx) => {
      const log = await tx.paymentGatewayLog.findUnique({
        where: { id: logId },
      });

      if (!log || log.status !== PaymentStatus.COMPLETED) {
        throw new BadRequestException('Only completed payments can be refunded');
      }

      await tx.paymentGatewayLog.update({
        where: { id: logId },
        data: { status: PaymentStatus.REFUNDED },
      });

      await tx.invoice.update({
        where: { id: log.invoiceId },
        data: { status: InvoiceStatus.REFUNDED },
      });
    });
  }
}
