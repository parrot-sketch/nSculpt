import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaClient, Appointment, AppointmentStatus } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';

@Injectable()
export class AppointmentBookingRepository {
    private readonly prisma: PrismaClient;

    constructor() {
        this.prisma = getPrismaClient();
    }

    /**
     * Validate doctor availability at requested time
     * Checks for overlapping appointments
     */
    async validateDoctorAvailability(
        doctorId: string,
        startTime: Date,
        endTime: Date,
        excludeAppointmentId?: string
    ): Promise<boolean> {
        const overlapping = await this.prisma.appointment.findFirst({
            where: {
                doctorId,
                id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
                status: {
                    in: [
                        AppointmentStatus.CONFIRMED,
                        AppointmentStatus.CHECKED_IN,
                        AppointmentStatus.PENDING_PAYMENT,
                    ],
                },
                OR: [
                    // New appointment starts during existing appointment
                    {
                        AND: [
                            { scheduledStartTime: { lte: startTime } },
                            { scheduledEndTime: { gt: startTime } },
                        ],
                    },
                    // New appointment ends during existing appointment
                    {
                        AND: [
                            { scheduledStartTime: { lt: endTime } },
                            { scheduledEndTime: { gte: endTime } },
                        ],
                    },
                    // New appointment completely contains existing appointment
                    {
                        AND: [
                            { scheduledStartTime: { gte: startTime } },
                            { scheduledEndTime: { lte: endTime } },
                        ],
                    },
                ],
            },
        });

        if (overlapping) {
            throw new ConflictException(
                `Doctor is not available at this time. Conflicting appointment: ${overlapping.appointmentNumber}`
            );
        }

        return true;
    }

    /**
     * Get today's appointments
     */
    async getTodayAppointments(date: Date): Promise<Appointment[]> {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return await this.prisma.appointment.findMany({
            where: {
                scheduledDate: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
                status: {
                    notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.CANCELLED_AFTER_PAYMENT],
                },
            },
            include: {
                patient: {
                    select: {
                        id: true,
                        patientNumber: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    },
                },
                doctor: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                scheduledStartTime: 'asc',
            },
        });
    }

    /**
     * Get upcoming appointments
     */
    async getUpcomingAppointments(days: number = 7): Promise<Appointment[]> {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);

        return await this.prisma.appointment.findMany({
            where: {
                scheduledStartTime: {
                    gte: now,
                    lte: futureDate,
                },
                status: {
                    notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.CANCELLED_AFTER_PAYMENT],
                },
            },
            include: {
                patient: {
                    select: {
                        id: true,
                        patientNumber: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    },
                },
                doctor: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                scheduledStartTime: 'asc',
            },
        });
    }

    /**
     * Get unconfirmed appointments (pending payment)
     */
    async getUnconfirmedAppointments(): Promise<Appointment[]> {
        return await this.prisma.appointment.findMany({
            where: {
                status: AppointmentStatus.PENDING_PAYMENT,
                scheduledStartTime: {
                    gte: new Date(),
                },
            },
            include: {
                patient: {
                    select: {
                        id: true,
                        patientNumber: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    },
                },
                doctor: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                scheduledStartTime: 'asc',
            },
        });
    }

    /**
     * Get appointments requiring scheduling (from procedure and follow-up plans)
     */
    async getAppointmentsRequiringScheduling(): Promise<{
        procedurePlans: any[];
        followUpPlans: any[];
    }> {
        // Get approved procedure plans without scheduled appointments
        const procedurePlans = await this.prisma.procedurePlan.findMany({
            where: {
                status: 'APPROVED',
                // Plan is approved but not yet scheduled
                // Note: The schema 'ProcedurePlanStatus' enum includes 'SCHEDULED', so we filter for APPROVED
                // which implies it's ready but not yet scheduled.
            },
            include: {
                patient: {
                    select: {
                        id: true,
                        patientNumber: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    },
                },
                consultation: {
                    select: {
                        id: true,
                        consultationNumber: true,
                        doctor: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Get follow-up plans without scheduled appointments
        const followUpPlans = await this.prisma.followUpPlan.findMany({
            where: {
                status: 'PENDING',
                // No appointment scheduled yet
                appointmentId: null,
            },
            include: {
                patient: {
                    select: {
                        id: true,
                        patientNumber: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    },
                },
                consultation: {
                    select: {
                        id: true,
                        consultationNumber: true,
                        doctor: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return { procedurePlans, followUpPlans };
    }

    /**
     * Get missed appointments (no-show)
     */
    async getMissedAppointments(date: Date): Promise<Appointment[]> {
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return await this.prisma.appointment.findMany({
            where: {
                scheduledStartTime: {
                    lte: endOfDay,
                },
                status: {
                    in: [AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING_PAYMENT],
                },
            },
            include: {
                patient: {
                    select: {
                        id: true,
                        patientNumber: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    },
                },
                doctor: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                scheduledStartTime: 'desc',
            },
        });
    }

    /**
     * Create appointment status history record
     */
    async createStatusHistory(
        appointmentId: string,
        fromStatus: string | null,
        toStatus: string,
        changedBy: string,
        reason?: string
    ): Promise<void> {
        await this.prisma.appointmentStatusHistory.create({
            data: {
                appointmentId,
                fromStatus,
                toStatus,
                changedBy,
                reason,
            },
        });
    }
}
