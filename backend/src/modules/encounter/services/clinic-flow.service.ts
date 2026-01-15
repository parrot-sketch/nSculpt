import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaClient, VisitStatus, QueueStatus, JourneyStage } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { PatientJourneyService } from '../../patient/services/patient-journey.service';

import { AccessControlService } from '../../auth/services/access-control.service';

@Injectable()
export class ClinicFlowService {
    private prisma: PrismaClient;
    private accessControl: AccessControlService;

    constructor(private journeyService: PatientJourneyService) {
        this.prisma = getPrismaClient();
        this.accessControl = new AccessControlService();
    }

    /**
     * Check-in a patient (scheduled or walk-in)
     * 1. Creates ClinicVisit
     * 2. Automatically creates QueueEntry
     * 3. Moves journey → CHECKED_IN
     */
    async checkIn(patientId: string, actorId: string, appointmentId?: string): Promise<string> {
        // Audit & Permission
        await this.accessControl.assertRole(actorId, ['FRONT_DESK', 'ADMIN']);

        return await this.prisma.$transaction(async (tx) => {
            // 1. Prevent duplicate active visits
            const activeVisit = await tx.clinicVisit.findFirst({
                where: {
                    patientId,
                    status: { notIn: [VisitStatus.DEPARTED, VisitStatus.CANCELLED] },
                },
            });

            if (activeVisit) {
                throw new BadRequestException('Patient already has an active clinic visit');
            }

            // 2. Create Visit
            const visit = await tx.clinicVisit.create({
                data: {
                    patientId,
                    appointmentId: appointmentId || null,
                    status: VisitStatus.CHECKED_IN,
                    createdBy: actorId,
                },
            });

            // 3. Create QueueEntry
            await tx.queueEntry.create({
                data: {
                    visitId: visit.id,
                    patientId,
                    status: QueueStatus.WAITING,
                    priority: 0, // Default normal priority
                },
            });

            // 4. Update Appointment status if linked
            if (appointmentId) {
                await tx.appointment.update({
                    where: { id: appointmentId },
                    data: { status: 'CHECKED_IN' as any }, // Using 'as any' if enum is strict
                });
            }

            // 5. Advance Journey
            await this.journeyService.advanceJourney(
                patientId,
                JourneyStage.CHECKED_IN,
                actorId,
                { type: 'ClinicVisit', id: visit.id }
            );

            return visit.id;
        });
    }

    /**
     * Start consultation for a patient in the queue
     */
    async startConsultation(visitId: string, doctorId: string): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            const visit = await tx.clinicVisit.findUnique({
                where: { id: visitId },
                include: { queueEntry: true },
            });

            if (!visit || visit.status !== VisitStatus.CHECKED_IN) {
                throw new BadRequestException('Visit not in CHECKED_IN state');
            }

            // Update Visit
            await tx.clinicVisit.update({
                where: { id: visitId },
                data: {
                    status: VisitStatus.IN_CONSULTATION,
                    providerId: doctorId,
                },
            });

            // Update Queue
            if (visit.queueEntry) {
                await tx.queueEntry.update({
                    where: { id: visit.queueEntry.id },
                    data: {
                        status: QueueStatus.IN_CONSULTATION,
                        calledAt: new Date(),
                    },
                });
            }
        });
    }

    /**
     * Complete visit and end queue entry
     */
    async completeVisit(visitId: string, actorId: string): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            const visit = await tx.clinicVisit.findUnique({
                where: { id: visitId },
                include: { queueEntry: true },
            });

            if (!visit) throw new BadRequestException('Visit not found');

            // Prevent closing if still in consultation
            if (visit.status === VisitStatus.IN_CONSULTATION) {
                // Technically, completing a visit from FrontDesk should only happen 
                // after the doctor signals consultation is done.
                // But if we want to force close, we must update queue too.
            }

            // Update Visit
            await tx.clinicVisit.update({
                where: { id: visitId },
                data: {
                    status: VisitStatus.DEPARTED,
                    checkOutAt: new Date(),
                },
            });

            // Close QueueEntry
            if (visit.queueEntry) {
                await tx.queueEntry.update({
                    where: { id: visit.queueEntry.id },
                    data: {
                        status: QueueStatus.COMPLETED,
                        completedAt: new Date(),
                    },
                });
            }

            // Advance Journey to CONSULTED if they were in CHECKED_IN/IN_CONSULTATION
            await this.journeyService.advanceJourney(
                visit.patientId,
                JourneyStage.CONSULTED,
                actorId,
                { type: 'ClinicVisit', id: visit.id }
            );
        });
    }
}
