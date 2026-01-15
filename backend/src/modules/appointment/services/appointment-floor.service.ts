import { Injectable } from '@nestjs/common';
import { PrismaClient, VisitStatus, QueueStatus } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';

@Injectable()
export class AppointmentFloorService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = getPrismaClient();
    }

    /**
     * Initialize floor operations for a checked-in patient.
     * Creates a ClinicVisit and a QueueEntry.
     */
    async initializeFloorOperations(data: {
        appointmentId: string;
        patientId: string;
        doctorId: string;
        checkedInBy: string;
    }): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            // 1. Create ClinicVisit
            const visit = await tx.clinicVisit.create({
                data: {
                    patientId: data.patientId,
                    appointmentId: data.appointmentId,
                    status: VisitStatus.CHECKED_IN,
                    providerId: data.doctorId,
                    createdBy: data.checkedInBy,
                },
            });

            // 2. Create QueueEntry
            await tx.queueEntry.create({
                data: {
                    visitId: visit.id,
                    patientId: data.patientId,
                    priority: 0,
                    status: QueueStatus.WAITING,
                },
            });
        });
    }
}
