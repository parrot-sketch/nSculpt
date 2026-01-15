import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { AppointmentRepository } from '../repositories/appointment.repository';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { PrismaClient, Domain, Appointment, AppointmentStatus } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { AppointmentFloorService } from './appointment-floor.service';
import { AppointmentCoreService } from './appointment-core.service';
import { CancelAppointmentDto } from '../dto/cancel-appointment.dto';
import { UpdateAppointmentDto } from '../dto/update-appointment.dto';
import { UpdateAppointmentStatusDto } from '../dto/update-appointment-status.dto';

@Injectable()
export class AppointmentOperationsService {
    private prisma: PrismaClient = getPrismaClient();

    constructor(
        private readonly appointmentRepository: AppointmentRepository,
        private readonly domainEventService: DomainEventService,
        private readonly correlationService: CorrelationService,
        private readonly floorService: AppointmentFloorService,
        private readonly coreService: AppointmentCoreService,
    ) { }

    /**
     * Check in patient
     */
    async checkIn(
        appointmentId: string,
        checkedInBy: string
    ): Promise<Appointment> {
        const appointment = await this.appointmentRepository.checkIn(
            appointmentId,
            checkedInBy,
        );

        try {
            await this.floorService.initializeFloorOperations({
                appointmentId: appointment.id,
                patientId: appointment.patientId,
                doctorId: appointment.doctorId,
                checkedInBy,
            });
        } catch (error) {
            console.error('Failed to initialize floor operations during checkIn:', error);
        }

        const context = this.correlationService.getContext();
        await this.domainEventService.createEvent({
            eventType: 'Appointment.CheckedIn',
            domain: Domain.CONSULTATION,
            aggregateType: 'Appointment',
            aggregateId: appointment.id,
            payload: {
                appointmentNumber: appointment.appointmentNumber,
                checkedInAt: appointment.checkedInAt?.toISOString(),
                status: appointment.status,
            },
            correlationId: context.correlationId || undefined,
            causationId: context.causationId || undefined,
            createdBy: checkedInBy,
            sessionId: context.sessionId || undefined,
            requestId: context.requestId || undefined,
        });

        return appointment;
    }

    /**
     * Complete appointment and create consultation
     */
    async complete(
        appointmentId: string,
        consultationId: string
    ): Promise<Appointment> {
        const appointment = await this.appointmentRepository.complete(
            appointmentId,
            consultationId,
        );

        const context = this.correlationService.getContext();
        await this.domainEventService.createEvent({
            eventType: 'Appointment.Completed',
            domain: Domain.CONSULTATION,
            aggregateType: 'Appointment',
            aggregateId: appointment.id,
            payload: {
                appointmentNumber: appointment.appointmentNumber,
                consultationId,
                status: appointment.status,
            },
            correlationId: context.correlationId || undefined,
            causationId: context.causationId || undefined,
            sessionId: context.sessionId || undefined,
            requestId: context.requestId || undefined,
        });

        return appointment;
    }

    /**
     * Cancel appointment
     */
    async cancel(
        appointmentId: string,
        cancelDto: CancelAppointmentDto,
        userId: string
    ): Promise<Appointment> {
        const appointment = await this.appointmentRepository.cancel(
            appointmentId,
            cancelDto.cancellationReason,
            cancelDto.cancellationNotes,
            userId,
        );

        const needsRefund =
            appointment.status === AppointmentStatus.CANCELLED_AFTER_PAYMENT &&
            cancelDto.refundRequested;

        const context = this.correlationService.getContext();
        await this.domainEventService.createEvent({
            eventType: 'Appointment.Cancelled',
            domain: Domain.CONSULTATION,
            aggregateType: 'Appointment',
            aggregateId: appointment.id,
            payload: {
                appointmentNumber: appointment.appointmentNumber,
                cancellationReason: cancelDto.cancellationReason,
                status: appointment.status,
                needsRefund,
            },
            correlationId: context.correlationId || undefined,
            causationId: context.causationId || undefined,
            createdBy: userId,
            sessionId: context.sessionId || undefined,
            requestId: context.requestId || undefined,
        });

        return appointment;
    }

    /**
     * Reschedule appointment
     */
    async reschedule(
        appointmentId: string,
        updateDto: UpdateAppointmentDto,
        updatedBy: string
    ): Promise<Appointment> {
        const appointment = await this.coreService.findOne(appointmentId);

        if ([AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED, AppointmentStatus.CANCELLED_AFTER_PAYMENT].includes(appointment.status as any)) {
            throw new BadRequestException(`Cannot reschedule appointment with status ${appointment.status}`);
        }

        if (updateDto.scheduledStartTime && updateDto.scheduledEndTime) {
            const startTime = new Date(updateDto.scheduledStartTime);
            const endTime = new Date(updateDto.scheduledEndTime);
            if (startTime <= new Date()) throw new BadRequestException('Start time must be future');
            if (endTime <= startTime) throw new BadRequestException('End time must be after start');
        }

        const updated = await this.prisma.appointment.update({
            where: { id: appointmentId },
            data: {
                scheduledDate: updateDto.scheduledDate ? new Date(updateDto.scheduledDate) : undefined,
                scheduledStartTime: updateDto.scheduledStartTime ? new Date(updateDto.scheduledStartTime) : undefined,
                scheduledEndTime: updateDto.scheduledEndTime ? new Date(updateDto.scheduledEndTime) : undefined,
                estimatedDurationMinutes: updateDto.estimatedDurationMinutes,
                updatedBy,
                status: AppointmentStatus.RESCHEDULED,
                rescheduledAt: new Date(),
                rescheduledBy: updatedBy,
            }
        });

        const context = this.correlationService.getContext();
        await this.domainEventService.createEvent({
            eventType: 'Appointment.Rescheduled',
            domain: Domain.CONSULTATION,
            aggregateType: 'Appointment',
            aggregateId: updated.id,
            payload: {
                appointmentNumber: updated.appointmentNumber,
                previousStartTime: appointment.scheduledStartTime?.toISOString(),
                newStartTime: updated.scheduledStartTime?.toISOString(),
                rescheduledBy: updatedBy,
            },
            correlationId: context.correlationId || undefined,
            causationId: context.causationId || undefined,
            createdBy: updatedBy,
            sessionId: context.sessionId || undefined,
            requestId: context.requestId || undefined,
        });

        return updated;
    }

    /**
     * Update appointment status
     */
    async updateStatus(
        appointmentId: string,
        statusDto: UpdateAppointmentStatusDto,
        updatedBy: string
    ): Promise<Appointment> {
        const appointment = await this.coreService.findOne(appointmentId);

        const updated = await this.prisma.appointment.update({
            where: { id: appointmentId },
            data: {
                status: statusDto.status,
                internalNotes: statusDto.notes
                    ? `${appointment.internalNotes || ''}\n[${new Date().toISOString()}] ${statusDto.notes}`
                    : appointment.internalNotes,
                updatedBy,
            }
        });

        const context = this.correlationService.getContext();
        await this.domainEventService.createEvent({
            eventType: 'Appointment.StatusUpdated',
            domain: Domain.CONSULTATION,
            aggregateType: 'Appointment',
            aggregateId: updated.id,
            payload: {
                appointmentNumber: updated.appointmentNumber,
                previousStatus: appointment.status,
                newStatus: statusDto.status,
                notes: statusDto.notes,
                updatedBy,
            },
            correlationId: context.correlationId || undefined,
            causationId: context.causationId || undefined,
            createdBy: updatedBy,
            sessionId: context.sessionId || undefined,
            requestId: context.requestId || undefined,
        });

        return updated;
    }
}
