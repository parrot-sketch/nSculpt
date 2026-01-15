import {
    Injectable, // Refactored to sub-service
    NotFoundException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { Domain, Appointment, AppointmentStatus, JourneyStage } from '@prisma/client';
import { PatientLifecycleState } from '../../patient/domain/patient-lifecycle-state.enum';
import { getPrismaClient } from '../../../prisma/client';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { PatientLifecycleService } from '../../patient/domain/services/patient-lifecycle.service';
import { AppointmentCoreService } from './appointment-core.service';
import { RequestAppointmentDto } from '../dto/request-appointment.dto';
import { UpdateAppointmentDto } from '../dto/update-appointment.dto';
import { AppointmentBillingService } from './appointment-billing.service';

@Injectable()
export class AppointmentCoordinationService {
    private prisma = getPrismaClient();

    constructor(
        private readonly coreService: AppointmentCoreService,
        private readonly domainEventService: DomainEventService,
        private readonly correlationService: CorrelationService,
        private readonly patientLifecycleService: PatientLifecycleService,
        private readonly billingService: AppointmentBillingService,
    ) { }

    /**
     * Step 1: Patient Initiates Request
     */
    async createRequest(
        patientId: string,
        dto: RequestAppointmentDto,
        userId: string
    ): Promise<Appointment> {
        const appointmentNumber = await this.coreService.generateAppointmentNumber(this.prisma);

        const consultationFee = await this.billingService.getConsultationFee(dto.appointmentType);
        const appointment = await this.prisma.appointment.create({
            data: {
                appointmentNumber,
                patient: { connect: { id: patientId } },
                doctor: { connect: { id: dto.doctorId } },
                appointmentType: dto.appointmentType,
                reason: dto.reason,
                serviceCode: dto.serviceCode,
                status: AppointmentStatus.REQUESTED,
                consultationFee,
                createdBy: userId,
                scheduledDate: null,
                scheduledStartTime: null,
                scheduledEndTime: null,
            } as any,
        });

        // Sync Patient Journey: -> CONSULTATION_REQUESTED
        await this.patientLifecycleService.transitionPatient(
            patientId,
            PatientLifecycleState.CONSULTATION_REQUESTED,
            { userId, role: 'PATIENT' },
            { appointmentId: appointment.id, reason: 'Patient initiated appointment request' }
        );

        // Emit event
        const context = this.correlationService.getContext();
        await this.domainEventService.createEvent({
            eventType: 'Appointment.RequestSubmitted',
            domain: Domain.CONSULTATION,
            aggregateType: 'Appointment',
            aggregateId: appointment.id,
            payload: {
                appointmentNumber: appointment.appointmentNumber,
                patientId,
                doctorId: dto.doctorId,
                status: AppointmentStatus.REQUESTED,
            },
            createdBy: userId,
            correlationId: context.correlationId || undefined,
        });

        return appointment;
    }

    /**
     * Step 2: FrontDesk Assigns Schedule
     */
    async assignSchedule(
        id: string,
        updateDto: UpdateAppointmentDto,
        userId: string
    ): Promise<Appointment> {
        const appointment = await this.coreService.findOne(id);

        const startTime = new Date(updateDto.scheduledStartTime!);
        const endTime = new Date(updateDto.scheduledEndTime!);

        // Validate times
        if (startTime <= new Date()) {
            throw new BadRequestException('Start time must be in the future');
        }

        // Availability Check
        const overlapping = await this.prisma.appointment.findFirst({
            where: {
                doctorId: appointment.doctorId,
                id: { not: id },
                status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED, AppointmentStatus.CHECKED_IN] },
                OR: [
                    { AND: [{ scheduledStartTime: { lte: startTime } }, { scheduledEndTime: { gt: startTime } }] },
                    { AND: [{ scheduledStartTime: { lt: endTime } }, { scheduledEndTime: { gte: endTime } }] },
                ]
            }
        });

        if (overlapping) {
            throw new ConflictException(`Doctor is already booked for ${overlapping.appointmentNumber}`);
        }

        const updated = await this.prisma.appointment.update({
            where: { id },
            data: {
                scheduledDate: new Date(updateDto.scheduledDate!),
                scheduledStartTime: startTime,
                scheduledEndTime: endTime,
                estimatedDurationMinutes: updateDto.estimatedDurationMinutes || 30,
                status: AppointmentStatus.SCHEDULED as any,
                updatedBy: userId,
            }
        });

        // Transitions Journey -> APPOINTMENT_SCHEDULED
        await this.patientLifecycleService.transitionPatient(
            appointment.patientId,
            PatientLifecycleState.APPOINTMENT_SCHEDULED,
            { userId, role: 'FRONT_DESK' },
            { appointmentId: id, reason: 'FrontDesk assigned time slot' }
        );

        const context = this.correlationService.getContext();
        await this.domainEventService.createEvent({
            eventType: 'Appointment.Scheduled',
            domain: Domain.CONSULTATION,
            aggregateType: 'Appointment',
            aggregateId: id,
            payload: {
                appointmentNumber: updated.appointmentNumber,
                scheduledStartTime: startTime.toISOString(),
                status: AppointmentStatus.SCHEDULED,
            },
            createdBy: userId,
            correlationId: context.correlationId || undefined,
        });

        return updated;
    }

    /**
     * Step 3: Doctor Confirms Schedule
     */
    async confirmByDoctor(id: string, userId: string): Promise<Appointment> {
        const appointment = await this.coreService.findOne(id);
        if (appointment.status !== AppointmentStatus.SCHEDULED) {
            throw new BadRequestException('Only scheduled appointments can be confirmed by doctor');
        }

        const updated = await this.prisma.appointment.update({
            where: { id },
            data: {
                status: AppointmentStatus.CONFIRMED,
                updatedBy: userId,
            }
        });

        // Transitions Journey -> CONSULTATION_APPROVED
        await this.patientLifecycleService.transitionPatient(
            appointment.patientId,
            PatientLifecycleState.CONSULTATION_APPROVED,
            { userId, role: 'DOCTOR' },
            { appointmentId: id, reason: 'Doctor confirmed the schedule' }
        );

        const context = this.correlationService.getContext();
        await this.domainEventService.createEvent({
            eventType: 'Appointment.ConfirmedByDoctor',
            domain: Domain.CONSULTATION,
            aggregateType: 'Appointment',
            aggregateId: id,
            payload: { status: AppointmentStatus.CONFIRMED },
            createdBy: userId,
            correlationId: context.correlationId || undefined,
        });

        return updated;
    }

    /**
     * Step 3 (Alt): Doctor Requests Reschedule
     */
    async requestReschedule(id: string, notes: string, userId: string): Promise<Appointment> {
        await this.coreService.findOne(id);

        const updated = await this.prisma.appointment.update({
            where: { id },
            data: {
                status: AppointmentStatus.NEEDS_RESCHEDULE,
                internalNotes: notes,
                updatedBy: userId,
            }
        });

        const context = this.correlationService.getContext();
        await this.domainEventService.createEvent({
            eventType: 'Appointment.RescheduleRequested',
            domain: Domain.CONSULTATION,
            aggregateType: 'Appointment',
            aggregateId: id,
            payload: { notes, status: AppointmentStatus.NEEDS_RESCHEDULE },
            createdBy: userId,
            correlationId: context.correlationId || undefined,
        });

        return updated;
    }
}
