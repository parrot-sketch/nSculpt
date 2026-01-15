import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { DomainEvent, NotificationPriority } from '@prisma/client';
import { Subscription } from 'rxjs';
import { DomainEventService } from '../../../services/domainEvent.service';
import { NotificationService } from '../../notification/services/notification.service';
import { getPrismaClient } from '../../../prisma/client';

@Injectable()
export class AppointmentNotificationListener implements OnModuleInit, OnModuleDestroy {
    private subscription?: Subscription;
    private prisma = getPrismaClient();

    constructor(
        private readonly domainEventService: DomainEventService,
        private readonly notificationService: NotificationService,
    ) { }

    onModuleInit() {
        this.subscription = this.domainEventService.event$.subscribe((event) => {
            this.handleEvent(event).catch((err) => {
                console.error('Error handling domain event in AppointmentNotificationListener:', err);
            });
        });
    }

    onModuleDestroy() {
        this.subscription?.unsubscribe();
    }

    private async handleEvent(event: DomainEvent) {
        switch (event.eventType) {
            case 'Appointment.RequestSubmitted':
                await this.handleRequestSubmitted(event);
                break;
            case 'Appointment.Scheduled':
                await this.handleScheduled(event);
                break;
            case 'Appointment.ConfirmedByDoctor':
                await this.handleConfirmedByDoctor(event);
                break;
            default:
                // Not an appointment event we care about
                break;
        }
    }

    private async handleRequestSubmitted(event: DomainEvent) {
        const { appointmentNumber, patientId, doctorId } = event.payload as any;

        // Notify all Front Desk staff
        const frontDeskUsers = await this.findUsersByRole('FRONT_DESK');

        for (const user of frontDeskUsers) {
            await this.notificationService.notifyFrontDesk(
                user.id,
                'New Appointment Request',
                `A new appointment request (${appointmentNumber}) has been submitted and needs scheduling.`,
                NotificationPriority.MEDIUM,
                `/frontdesk/appointments/${event.aggregateId}`,
                { appointmentId: event.aggregateId, patientId }
            );
        }
    }

    private async handleScheduled(event: DomainEvent) {
        const { appointmentNumber, scheduledStartTime } = event.payload as any;

        // The doctor is the aggregate root's doctor, but we need the userId
        const appointment = await this.prisma.appointment.findUnique({
            where: { id: event.aggregateId },
            select: { doctorId: true },
        });

        if (appointment?.doctorId) {
            await this.notificationService.notifyDoctor(
                appointment.doctorId,
                'Appointment Scheduled',
                `Appointment ${appointmentNumber} has been scheduled for ${new Date(scheduledStartTime).toLocaleString()}. Please confirm or reschedule.`,
                NotificationPriority.HIGH,
                `/doctor/appointments/${event.aggregateId}`,
                { appointmentId: event.aggregateId }
            );
        }
    }

    private async handleConfirmedByDoctor(event: DomainEvent) {
        const appointment = await this.prisma.appointment.findUnique({
            where: { id: event.aggregateId },
            include: {
                patient: {
                    select: {
                        id: true,
                        userId: true, // Only if patient has a user account
                    }
                }
            }
        });

        if (appointment) {
            // Notify Patient if they have a user account
            if (appointment.patient.userId) {
                await this.notificationService.notifyPatient(
                    appointment.patient.userId,
                    'Appointment Confirmed',
                    `Your appointment request has been confirmed by the doctor.`,
                    NotificationPriority.MEDIUM,
                    `/patient/appointments/${event.aggregateId}`,
                    { appointmentId: event.aggregateId }
                );
            }

            // Notify Front Desk
            const frontDeskUsers = await this.findUsersByRole('FRONT_DESK');
            for (const user of frontDeskUsers) {
                await this.notificationService.notifyFrontDesk(
                    user.id,
                    'Appointment Confirmed',
                    `Doctor has confirmed appointment ${appointment.appointmentNumber}.`,
                    NotificationPriority.LOW,
                    `/frontdesk/appointments/${event.aggregateId}`,
                    { appointmentId: event.aggregateId }
                );
            }
        }
    }

    private async findUsersByRole(roleCode: string) {
        return this.prisma.user.findMany({
            where: {
                roleAssignments: {
                    some: {
                        role: { code: roleCode },
                        isActive: true,
                    }
                },
                isActive: true,
            },
            select: { id: true },
        });
    }
}
