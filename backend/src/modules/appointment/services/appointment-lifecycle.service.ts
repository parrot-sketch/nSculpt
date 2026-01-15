import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaClient, AppointmentStatus } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';

import { AccessControlService } from '../../auth/services/access-control.service';

@Injectable()
export class AppointmentLifecycleService {
    private prisma: PrismaClient;
    private accessControl: AccessControlService;

    constructor() {
        this.prisma = getPrismaClient();
        this.accessControl = new AccessControlService();
    }

    /**
     * Change appointment status with validation and history
     */
    async changeStatus(
        appointmentId: string,
        newStatus: AppointmentStatus,
        actorId: string,
        reason?: string
    ): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            const appointment = await tx.appointment.findUnique({
                where: { id: appointmentId },
            });

            if (!appointment) throw new BadRequestException('Appointment not found');

            const currentStatus = appointment.status as AppointmentStatus;

            // 1. Prevent same stage
            if (currentStatus === newStatus) return;

            // 2. Enforce rules
            // CANCELLED -> ANY (except maybe archived, but here we block CONFIRMED)
            if ((currentStatus === AppointmentStatus.CANCELLED || currentStatus === AppointmentStatus.CANCELLED_AFTER_PAYMENT) &&
                newStatus === AppointmentStatus.CONFIRMED) {
                throw new BadRequestException('Cannot confirm a cancelled appointment');
            }

            // COMPLETED -> RESCHEDULED
            if (currentStatus === AppointmentStatus.COMPLETED && newStatus === AppointmentStatus.RESCHEDULED) {
                throw new BadRequestException('Cannot reschedule a completed appointment');
            }

            // 3. Update Status
            await tx.appointment.update({
                where: { id: appointmentId },
                data: { status: newStatus },
            });

            // 4. Record History
            await tx.appointmentStatusHistory.create({
                data: {
                    appointmentId: appointmentId,
                    fromStatus: currentStatus,
                    toStatus: newStatus,
                    changedBy: actorId,
                    reason: reason || `Status changed to ${newStatus}`,
                },
            });
        });
    }
}
