import { Injectable } from '@nestjs/common';
import { PrismaClient, JourneyStage, VisitStatus, QueueStatus, InvoiceStatus } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';

import { AccessControlService } from '../../auth/services/access-control.service';

@Injectable()
export class DashboardQueryService {
    private prisma: PrismaClient;
    private accessControl: AccessControlService;

    constructor() {
        this.prisma = getPrismaClient();
        this.accessControl = new AccessControlService();
    }

    /**
     * Get real-time queue for today
     */
    async getTodayQueue() {
        return this.prisma.queueEntry.findMany({
            where: {
                status: { in: [QueueStatus.WAITING, QueueStatus.IN_CONSULTATION] },
                enteredAt: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0)),
                },
            },
            include: {
                visit: {
                    include: {
                        patient: true,
                    },
                },
            },
            orderBy: [
                { priority: 'desc' },
                { enteredAt: 'asc' },
            ],
        });
    }

    /**
     * Get appointments scheduled for today
     */
    async getTodayAppointments() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return this.prisma.appointment.findMany({
            where: {
                scheduledStartTime: {
                    gte: today,
                    lt: tomorrow,
                },
            },
            include: {
                patient: true,
                doctor: true,
            },
            orderBy: { scheduledStartTime: 'asc' },
        });
    }

    /**
     * Get active visits (patients physically in the clinic)
     */
    async getActiveVisits() {
        return this.prisma.clinicVisit.findMany({
            where: {
                status: { notIn: [VisitStatus.DEPARTED, VisitStatus.CANCELLED] },
            },
            include: {
                patient: true,
                queueEntry: true,
            },
            orderBy: { checkInAt: 'desc' },
        });
    }

    /**
     * Get distribution of patients across the pipeline
     */
    async getPatientsInPipeline(stage?: JourneyStage) {
        return this.prisma.patientJourney.findMany({
            where: stage ? { currentStage: stage } : {},
            include: {
                patient: true,
            },
            orderBy: { lastMovementAt: 'desc' },
        });
    }

    /**
     * Get unpaid or partially paid invoices
     */
    async getUnpaidInvoices() {
        return this.prisma.invoice.findMany({
            where: {
                status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIAL] },
            },
            include: {
                patient: true,
            },
            orderBy: { issuedAt: 'desc' },
        });
    }

    /**
     * Get upcoming follow-ups
     */
    async getUpcomingFollowUps() {
        return this.prisma.followUpPlan.findMany({
            where: {
                status: 'SCHEDULED', // Adjust based on your actual enum
                scheduledDate: {
                    gte: new Date(),
                },
            },
            include: {
                patient: true,
            },
            orderBy: { scheduledDate: 'asc' },
        });
    }
}
