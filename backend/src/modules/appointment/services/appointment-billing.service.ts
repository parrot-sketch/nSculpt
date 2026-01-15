import { Injectable } from '@nestjs/common';
import { PrismaClient, InvoiceStatus } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { BillingService } from '../../billing/services/billing.service';

@Injectable()
export class AppointmentBillingService {
    private prisma: PrismaClient;

    constructor(private readonly billingService: BillingService) {
        this.prisma = getPrismaClient();
    }


    async syncPayment(appointment: {
        id: string;
        patientId: string;
        consultationFee: number | any; // Handle Decimal from Prisma
    }): Promise<void> {
        const existingInvoices = await this.prisma.invoice.findMany({
            where: { appointmentId: appointment.id },
        });

        let invoiceId: string;
        if (existingInvoices.length === 0) {
            invoiceId = await this.billingService.createInvoice({
                patientId: appointment.patientId,
                totalAmount: Number(appointment.consultationFee),
                appointmentId: appointment.id,
            });
        } else {
            invoiceId = existingInvoices[0].id;
        }

        await this.prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                status: InvoiceStatus.PAID,
                paidAt: new Date(),
            },
        });
    }

    /**
     * Get consultation fee from fee schedule
     */
    async getConsultationFee(appointmentType: string): Promise<number> {
        const defaultFees: Record<string, number> = {
            CONSULTATION: 5000,
            FOLLOW_UP: 3000,
            PRE_OP: 2000,
            POST_OP: 2000,
            EMERGENCY: 10000,
        };

        return defaultFees[appointmentType] || defaultFees.CONSULTATION;
    }

    /**
     * Create a draft invoice for an appointment if it doesn't exist.
     */
    async ensureDraftInvoice(appointment: {
        id: string;
        patientId: string;
        consultationFee: number | any;
    }): Promise<void> {
        const count = await this.prisma.invoice.count({
            where: { appointmentId: appointment.id },
        });

        if (count === 0) {
            await this.billingService.createInvoice({
                patientId: appointment.patientId,
                totalAmount: Number(appointment.consultationFee),
                appointmentId: appointment.id,
            });
        }
    }
}
