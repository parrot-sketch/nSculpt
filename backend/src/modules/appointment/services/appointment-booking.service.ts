import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaClient, AppointmentStatus, Domain } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { AppointmentBookingRepository } from '../repositories/appointment-booking.repository';
import { AppointmentRepository } from '../repositories/appointment.repository';
import { PatientLifecycleService } from '../../patient/domain/services/patient-lifecycle.service';
import { PatientLifecycleState } from '../../patient/domain/patient-lifecycle-state.enum';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { AppointmentBillingService } from './appointment-billing.service';
import { AppointmentCoreService } from './appointment-core.service';
import {
    CreateAppointmentDto,
} from '../dto/create-appointment.dto';
import {
    ConfirmAppointmentPaymentDto,
} from '../dto/confirm-appointment-payment.dto';
import {
    BookAppointmentForNewPatientDto,
    BookAppointmentForExistingPatientDto,
    ScheduleFromProcedurePlanDto,
    ScheduleFromFollowUpPlanDto,
    RescheduleAppointmentDto,
    CancelAppointmentBookingDto,
} from '../dto/book-appointment.dto';

/**
 * Appointment Booking Service
 * 
 * Production-grade service for Front Desk appointment booking.
 * Integrates with patient lifecycle system and maintains audit trails.
 * 
 * Core Principle:
 * - Appointment = Time Container (operational)
 * - Consultation = Clinical Encounter (clinical meaning)
 * - Front Desk creates structure, NOT clinical meaning
 */
@Injectable()
export class AppointmentBookingService {
    private readonly prisma: PrismaClient;

    constructor(
        private readonly bookingRepository: AppointmentBookingRepository,
        private readonly appointmentRepository: AppointmentRepository,
        private readonly patientLifecycleService: PatientLifecycleService,
        private readonly domainEventService: DomainEventService,
        private readonly correlationService: CorrelationService,
        private readonly billingService: AppointmentBillingService,
        private readonly coreService: AppointmentCoreService,
    ) {
        this.prisma = getPrismaClient();
    }
    /**
     * Create appointment request (Simplistic flow)
     */
    async create(
        createDto: CreateAppointmentDto,
        createdBy?: string
    ): Promise<any> {
        const startTime = new Date(createDto.scheduledStartTime);
        const endTime = new Date(createDto.scheduledEndTime);

        this.validateAppointmentTimes(startTime, endTime);

        const consultationFee = await this.billingService.getConsultationFee(
            createDto.appointmentType
        );

        const appointment = await this.appointmentRepository.create({
            ...createDto,
            consultationFee,
            createdBy,
        });

        try {
            await this.billingService.ensureDraftInvoice({
                id: appointment.id,
                patientId: appointment.patientId,
                consultationFee: appointment.consultationFee,
            });
        } catch (error) {
            console.error('Failed to create draft invoice during appointment request:', error);
        }

        const context = this.correlationService.getContext();
        await this.domainEventService.createEvent({
            eventType: 'Appointment.Requested',
            domain: Domain.CONSULTATION,
            aggregateType: 'Appointment',
            aggregateId: appointment.id,
            payload: {
                appointmentNumber: appointment.appointmentNumber,
                patientId: appointment.patientId,
                doctorId: appointment.doctorId,
                scheduledStartTime: appointment.scheduledStartTime?.toISOString(),
                consultationFee: appointment.consultationFee.toString(),
                status: appointment.status,
            },
            correlationId: context.correlationId || undefined,
            causationId: context.causationId || undefined,
            createdBy: createdBy,
            sessionId: context.sessionId || undefined,
            requestId: context.requestId || undefined,
        });

        return appointment;
    }

    /**
     * Confirm appointment payment
     */
    async confirmPayment(
        confirmDto: ConfirmAppointmentPaymentDto,
        userId: string
    ): Promise<any> {
        const appointment = await this.appointmentRepository.confirmPayment(
            confirmDto.appointmentId,
            confirmDto.paymentId,
        );

        try {
            await this.billingService.syncPayment({
                id: appointment.id,
                patientId: appointment.patientId,
                consultationFee: appointment.consultationFee,
            });
        } catch (error) {
            console.error('Failed to sync billing during confirmPayment:', error);
        }

        const context = this.correlationService.getContext();
        await this.domainEventService.createEvent({
            eventType: 'Appointment.Confirmed',
            domain: Domain.CONSULTATION,
            aggregateType: 'Appointment',
            aggregateId: appointment.id,
            payload: {
                appointmentNumber: appointment.appointmentNumber,
                paymentId: confirmDto.paymentId,
                paymentConfirmedAt: appointment.paymentConfirmedAt?.toISOString(),
                status: appointment.status,
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
     * Create appointment for new patient (walk-in/lead)
     * 
     * Flow:
     * 1. Create patient in REGISTERED state
     * 2. Create appointment
     * 3. Transition: REGISTERED → APPOINTMENT_SCHEDULED
     * 
     * @param dto Booking data with patient info
     * @param frontdeskUserId User creating the appointment
     * @returns Created patient and appointment
     */
    async createAppointmentForNewPatient(
        dto: BookAppointmentForNewPatientDto,
        frontdeskUserId: string,
    ): Promise<{ patient: any; appointment: any }> {
        const startTime = new Date(dto.scheduledStartTime);
        const endTime = new Date(dto.scheduledEndTime);

        // Validate times
        this.validateAppointmentTimes(startTime, endTime);

        // Validate doctor availability
        await this.bookingRepository.validateDoctorAvailability(
            dto.doctorId,
            startTime,
            endTime,
        );

        // Get consultation fee
        const consultationFee = await this.getConsultationFee(dto.appointmentType);

        // Atomic transaction: Create patient + appointment + journey transition
        const result = await this.prisma.$transaction(async (tx) => {
            // 1. Create patient
            const patientNumber = await this.generatePatientNumber(tx);
            const fileNumber = await this.generateFileNumber(tx);

            const patient = await tx.patient.create({
                data: {
                    patientNumber,
                    fileNumber,
                    firstName: dto.patientData.firstName,
                    lastName: dto.patientData.lastName,
                    email: dto.patientData.email,
                    phone: dto.patientData.phone,
                    dateOfBirth: dto.patientData.dateOfBirth
                        ? new Date(dto.patientData.dateOfBirth)
                        : null,
                    gender: dto.patientData.gender,
                    address: dto.patientData.address,
                    lifecycleState: PatientLifecycleState.REGISTERED,
                    createdByUser: { connect: { id: frontdeskUserId } },
                },
            });

            // 2. Generate appointment number
            const appointmentNumber = await this.generateAppointmentNumber(tx);

            // 3. Create appointment
            const appointment = await tx.appointment.create({
                data: {
                    appointmentNumber,
                    patientId: patient.id,
                    doctorId: dto.doctorId,
                    scheduledDate: new Date(dto.scheduledDate),
                    scheduledStartTime: startTime,
                    scheduledEndTime: endTime,
                    estimatedDurationMinutes: dto.estimatedDurationMinutes || 30,
                    appointmentType: dto.appointmentType,
                    reason: dto.reason,
                    notes: dto.notes,
                    status: AppointmentStatus.PENDING_PAYMENT,
                    consultationFee,
                    createdBy: frontdeskUserId,
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
            });

            // 4. Create status history
            await tx.appointmentStatusHistory.create({
                data: {
                    appointmentId: appointment.id,
                    fromStatus: null,
                    toStatus: AppointmentStatus.PENDING_PAYMENT,
                    changedBy: frontdeskUserId,
                    reason: 'Initial appointment creation for new patient',
                },
            });

            return { patient, appointment };
        });

        // 5. Transition patient journey: REGISTERED → APPOINTMENT_SCHEDULED
        // This happens outside transaction to avoid deadlocks
        await this.patientLifecycleService.transitionPatient(
            result.patient.id,
            PatientLifecycleState.APPOINTMENT_SCHEDULED,
            {
                userId: frontdeskUserId,
                role: 'FRONT_DESK',
            },
            {
                appointmentId: result.appointment.id,
                reason: 'First appointment scheduled for new patient',
            },
        );

        // 6. Emit domain event
        const context = this.correlationService.getContext();
        await this.domainEventService.createEvent({
            eventType: 'Appointment.BookedForNewPatient',
            domain: Domain.CONSULTATION,
            aggregateType: 'Appointment',
            aggregateId: result.appointment.id,
            payload: {
                appointmentNumber: result.appointment.appointmentNumber,
                patientId: result.patient.id,
                patientNumber: result.patient.patientNumber,
                doctorId: dto.doctorId,
                scheduledStartTime: startTime.toISOString(),
                appointmentType: dto.appointmentType,
            },
            correlationId: context.correlationId || undefined,
            causationId: context.causationId || undefined,
            createdBy: frontdeskUserId,
            sessionId: context.sessionId || undefined,
            requestId: context.requestId || undefined,
        });

        return result;
    }

    /**
     * Create appointment for existing patient
     * 
     * Flow:
     * 1. Validate patient exists
     * 2. Create appointment
     * 3. Transition journey based on current state:
     *    - If REGISTERED/VERIFIED → APPOINTMENT_SCHEDULED
     *    - If FOLLOW_UP/MAINTENANCE → stay in current state
     * 
     * @param dto Booking data
     * @param frontdeskUserId User creating the appointment
     * @returns Created appointment
     */
    async createAppointmentForExistingPatient(
        dto: BookAppointmentForExistingPatientDto,
        frontdeskUserId: string,
    ): Promise<any> {
        const startTime = new Date(dto.scheduledStartTime);
        const endTime = new Date(dto.scheduledEndTime);

        // Validate times
        this.validateAppointmentTimes(startTime, endTime);

        // Validate doctor availability
        await this.bookingRepository.validateDoctorAvailability(
            dto.doctorId,
            startTime,
            endTime,
        );

        // Validate patient exists
        const patient = await this.prisma.patient.findUnique({
            where: { id: dto.patientId },
            select: { id: true, lifecycleState: true, patientNumber: true },
        });

        if (!patient) {
            throw new NotFoundException(`Patient with ID ${dto.patientId} not found`);
        }

        // Get consultation fee
        const consultationFee = await this.getConsultationFee(dto.appointmentType);

        // Create appointment
        const appointmentNumber = await this.generateAppointmentNumber(this.prisma);

        const appointment = await this.prisma.appointment.create({
            data: {
                appointmentNumber,
                patientId: dto.patientId,
                doctorId: dto.doctorId,
                scheduledDate: new Date(dto.scheduledDate),
                scheduledStartTime: startTime,
                scheduledEndTime: endTime,
                estimatedDurationMinutes: dto.estimatedDurationMinutes || 30,
                appointmentType: dto.appointmentType,
                reason: dto.reason,
                notes: dto.notes,
                status: AppointmentStatus.PENDING_PAYMENT,
                consultationFee,
                createdBy: frontdeskUserId,
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
        });

        // Create status history
        await this.bookingRepository.createStatusHistory(
            appointment.id,
            null,
            AppointmentStatus.PENDING_PAYMENT,
            frontdeskUserId,
            'Appointment created for existing patient',
        );

        // Transition patient journey if needed
        const currentState = patient.lifecycleState as PatientLifecycleState;

        // Only transition if patient is in early stages
        if (
            currentState === PatientLifecycleState.REGISTERED ||
            currentState === PatientLifecycleState.VERIFIED
        ) {
            await this.patientLifecycleService.transitionPatient(
                dto.patientId,
                PatientLifecycleState.APPOINTMENT_SCHEDULED,
                {
                    userId: frontdeskUserId,
                    role: 'FRONT_DESK',
                },
                {
                    appointmentId: appointment.id,
                    reason: 'Appointment scheduled for existing patient',
                },
            );
        }

        // Emit domain event
        const context = this.correlationService.getContext();
        await this.domainEventService.createEvent({
            eventType: 'Appointment.BookedForExistingPatient',
            domain: Domain.CONSULTATION,
            aggregateType: 'Appointment',
            aggregateId: appointment.id,
            payload: {
                appointmentNumber: appointment.appointmentNumber,
                patientId: dto.patientId,
                patientNumber: patient.patientNumber,
                doctorId: dto.doctorId,
                scheduledStartTime: startTime.toISOString(),
                appointmentType: dto.appointmentType,
            },
            correlationId: context.correlationId || undefined,
            causationId: context.causationId || undefined,
            createdBy: frontdeskUserId,
            sessionId: context.sessionId || undefined,
            requestId: context.requestId || undefined,
        });

        return appointment;
    }

    /**
     * Schedule appointment from procedure plan
     * 
     * Flow:
     * 1. Validate procedure plan exists and is approved
     * 2. Create appointment linked to procedure plan
     * 3. Transition: PROCEDURE_PLANNED → SURGERY_SCHEDULED
     * 
     * @param dto Scheduling data
     * @param frontdeskUserId User scheduling the appointment
     * @returns Created appointment
     */
    async scheduleFromProcedurePlan(
        dto: ScheduleFromProcedurePlanDto,
        frontdeskUserId: string,
    ): Promise<any> {
        const startTime = new Date(dto.scheduledStartTime);
        const endTime = new Date(dto.scheduledEndTime);

        // Validate times
        this.validateAppointmentTimes(startTime, endTime);

        // Validate procedure plan exists and is approved
        const procedurePlan = await this.prisma.procedurePlan.findUnique({
            where: { id: dto.procedurePlanId },
            include: {
                patient: true,
                consultation: {
                    include: {
                        doctor: true,
                    },
                },
            },
        });

        if (!procedurePlan) {
            throw new NotFoundException(
                `Procedure plan with ID ${dto.procedurePlanId} not found`,
            );
        }

        if (procedurePlan.status !== 'APPROVED') {
            throw new BadRequestException(
                `Procedure plan must be approved before scheduling. Current status: ${procedurePlan.status}`,
            );
        }

        const doctorId = procedurePlan.consultation.doctorId;

        // Validate doctor availability
        await this.bookingRepository.validateDoctorAvailability(
            doctorId,
            startTime,
            endTime,
        );

        // Get procedure fee (higher than consultation)
        const consultationFee = await this.getConsultationFee('PROCEDURE');

        // Create appointment
        const appointmentNumber = await this.generateAppointmentNumber(this.prisma);

        const appointment = await this.prisma.appointment.create({
            data: {
                appointmentNumber,
                patientId: procedurePlan.patientId,
                doctorId,
                scheduledDate: new Date(dto.scheduledDate),
                scheduledStartTime: startTime,
                scheduledEndTime: endTime,
                estimatedDurationMinutes: dto.estimatedDurationMinutes || 60,
                appointmentType: 'PROCEDURE',
                reason: `Procedure: ${procedurePlan.procedureName}`,
                notes: dto.notes,
                status: AppointmentStatus.PENDING_PAYMENT,
                consultationFee,
                createdBy: frontdeskUserId,
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
        });

        // Link appointment to procedure plan
        await this.prisma.procedurePlan.update({
            where: { id: dto.procedurePlanId },
            data: {
                status: 'SCHEDULED',
            },
        });

        // Create status history
        await this.bookingRepository.createStatusHistory(
            appointment.id,
            null,
            AppointmentStatus.PENDING_PAYMENT,
            frontdeskUserId,
            `Scheduled from procedure plan: ${procedurePlan.procedureName}`,
        );

        // Transition patient journey: PROCEDURE_PLANNED → SURGERY_SCHEDULED
        await this.patientLifecycleService.transitionPatient(
            procedurePlan.patientId,
            PatientLifecycleState.SURGERY_SCHEDULED,
            {
                userId: frontdeskUserId,
                role: 'FRONT_DESK',
            },
            {
                appointmentId: appointment.id,
                procedurePlanId: dto.procedurePlanId,
                reason: `Surgery scheduled: ${procedurePlan.procedureName}`,
            },
        );

        // Emit domain event
        const context = this.correlationService.getContext();
        await this.domainEventService.createEvent({
            eventType: 'Appointment.ScheduledFromProcedurePlan',
            domain: Domain.CONSULTATION,
            aggregateType: 'Appointment',
            aggregateId: appointment.id,
            payload: {
                appointmentNumber: appointment.appointmentNumber,
                patientId: procedurePlan.patientId,
                procedurePlanId: dto.procedurePlanId,
                procedureName: procedurePlan.procedureName,
                scheduledStartTime: startTime.toISOString(),
            },
            correlationId: context.correlationId || undefined,
            causationId: context.causationId || undefined,
            createdBy: frontdeskUserId,
            sessionId: context.sessionId || undefined,
            requestId: context.requestId || undefined,
        });

        return appointment;
    }

    /**
     * Schedule appointment from follow-up plan
     * 
     * Flow:
     * 1. Validate follow-up plan exists
     * 2. Create appointment linked to follow-up plan
     * 3. Transition: → FOLLOW_UP (if not already)
     * 
     * @param dto Scheduling data
     * @param frontdeskUserId User scheduling the appointment
     * @returns Created appointment
     */
    async scheduleFromFollowUpPlan(
        dto: ScheduleFromFollowUpPlanDto,
        frontdeskUserId: string,
    ): Promise<any> {
        const startTime = new Date(dto.scheduledStartTime);
        const endTime = new Date(dto.scheduledEndTime);

        // Validate times
        this.validateAppointmentTimes(startTime, endTime);

        // Validate follow-up plan exists
        const followUpPlan = await this.prisma.followUpPlan.findUnique({
            where: { id: dto.followUpPlanId },
            include: {
                patient: true,
                consultation: {
                    include: {
                        doctor: true,
                    },
                },
            },
        });

        if (!followUpPlan) {
            throw new NotFoundException(
                `Follow-up plan with ID ${dto.followUpPlanId} not found`,
            );
        }

        const doctorId = followUpPlan.consultation.doctorId;

        // Validate doctor availability
        await this.bookingRepository.validateDoctorAvailability(
            doctorId,
            startTime,
            endTime,
        );

        // Get follow-up fee
        const consultationFee = await this.getConsultationFee('FOLLOW_UP');

        // Create appointment
        const appointmentNumber = await this.generateAppointmentNumber(this.prisma);

        const appointment = await this.prisma.appointment.create({
            data: {
                appointmentNumber,
                patientId: followUpPlan.patientId,
                doctorId,
                scheduledDate: new Date(dto.scheduledDate),
                scheduledStartTime: startTime,
                scheduledEndTime: endTime,
                estimatedDurationMinutes: dto.estimatedDurationMinutes || 30,
                appointmentType: 'FOLLOW_UP',
                reason: `Follow-up: ${followUpPlan.followUpType}`,
                notes: dto.notes,
                status: AppointmentStatus.PENDING_PAYMENT,
                consultationFee,
                createdBy: frontdeskUserId,
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
        });

        // Create status history
        await this.bookingRepository.createStatusHistory(
            appointment.id,
            null,
            AppointmentStatus.PENDING_PAYMENT,
            frontdeskUserId,
            `Scheduled from follow-up plan: ${followUpPlan.followUpType}`,
        );

        // Transition patient journey to FOLLOW_UP if not already
        const currentState = followUpPlan.patient.lifecycleState as PatientLifecycleState;
        if (currentState !== PatientLifecycleState.FOLLOW_UP) {
            await this.patientLifecycleService.transitionPatient(
                followUpPlan.patientId,
                PatientLifecycleState.FOLLOW_UP,
                {
                    userId: frontdeskUserId,
                    role: 'FRONT_DESK',
                },
                {
                    appointmentId: appointment.id,
                    followUpPlanId: dto.followUpPlanId,
                    reason: `Follow-up scheduled: ${followUpPlan.followUpType}`,
                },
            );
        }

        // Emit domain event
        const context = this.correlationService.getContext();
        await this.domainEventService.createEvent({
            eventType: 'Appointment.ScheduledFromFollowUpPlan',
            domain: Domain.CONSULTATION,
            aggregateType: 'Appointment',
            aggregateId: appointment.id,
            payload: {
                appointmentNumber: appointment.appointmentNumber,
                patientId: followUpPlan.patientId,
                followUpPlanId: dto.followUpPlanId,
                followUpType: followUpPlan.followUpType,
                scheduledStartTime: startTime.toISOString(),
            },
            correlationId: context.correlationId || undefined,
            causationId: context.causationId || undefined,
            createdBy: frontdeskUserId,
            sessionId: context.sessionId || undefined,
            requestId: context.requestId || undefined,
        });

        return appointment;
    }

    /**
     * Reschedule appointment
     * 
     * @param appointmentId Appointment to reschedule
     * @param dto Reschedule data
     * @param userId User rescheduling
     * @returns Updated appointment
     */
    async rescheduleAppointment(
        appointmentId: string,
        dto: RescheduleAppointmentDto,
        userId: string,
    ): Promise<any> {
        const startTime = new Date(dto.scheduledStartTime);
        const endTime = new Date(dto.scheduledEndTime);

        // Validate times
        this.validateAppointmentTimes(startTime, endTime);

        // Get existing appointment
        const existing = await this.appointmentRepository.findById(appointmentId);

        // Validate can be rescheduled
        if (
            existing.status === AppointmentStatus.COMPLETED ||
            existing.status === AppointmentStatus.CANCELLED ||
            existing.status === AppointmentStatus.CANCELLED_AFTER_PAYMENT
        ) {
            throw new BadRequestException(
                `Cannot reschedule appointment with status ${existing.status}`,
            );
        }

        // Validate doctor availability (exclude current appointment)
        await this.bookingRepository.validateDoctorAvailability(
            existing.doctorId,
            startTime,
            endTime,
            appointmentId,
        );

        // Update appointment
        const updated = await this.prisma.appointment.update({
            where: { id: appointmentId },
            data: {
                scheduledDate: new Date(dto.scheduledDate),
                scheduledStartTime: startTime,
                scheduledEndTime: endTime,
                status: AppointmentStatus.RESCHEDULED,
                rescheduledAt: new Date(),
                rescheduledBy: userId,
                internalNotes: `${existing.internalNotes || ''}\n[${new Date().toISOString()}] Rescheduled: ${dto.reason}`,
                updatedBy: userId,
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
        });

        // Create status history
        await this.bookingRepository.createStatusHistory(
            appointmentId,
            existing.status,
            AppointmentStatus.RESCHEDULED,
            userId,
            dto.reason,
        );

        // Emit domain event
        const context = this.correlationService.getContext();
        await this.domainEventService.createEvent({
            eventType: 'Appointment.Rescheduled',
            domain: Domain.CONSULTATION,
            aggregateType: 'Appointment',
            aggregateId: appointmentId,
            payload: {
                appointmentNumber: updated.appointmentNumber,
                previousStartTime: existing.scheduledStartTime.toISOString(),
                newStartTime: startTime.toISOString(),
                reason: dto.reason,
            },
            correlationId: context.correlationId || undefined,
            causationId: context.causationId || undefined,
            createdBy: userId,
            sessionId: context.sessionId || undefined,
            requestId: context.requestId || undefined,
        });

        return updated;
    }

    /**
     * Cancel appointment
     * 
     * @param appointmentId Appointment to cancel
     * @param dto Cancellation data
     * @param userId User cancelling
     * @returns Updated appointment
     */
    async cancelAppointment(
        appointmentId: string,
        dto: CancelAppointmentBookingDto,
        userId: string,
    ): Promise<any> {
        // Get existing appointment
        const existing = await this.appointmentRepository.findById(appointmentId);

        // Determine cancellation status based on payment
        const newStatus =
            existing.paymentConfirmedAt
                ? AppointmentStatus.CANCELLED_AFTER_PAYMENT
                : AppointmentStatus.CANCELLED;

        // Update appointment (never delete)
        const updated = await this.prisma.appointment.update({
            where: { id: appointmentId },
            data: {
                status: newStatus,
                cancelledAt: new Date(),
                cancelledBy: userId,
                cancellationReason: dto.reason as any,
                cancellationNotes: dto.notes,
                updatedBy: userId,
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
        });

        // Create status history
        await this.bookingRepository.createStatusHistory(
            appointmentId,
            existing.status,
            newStatus,
            userId,
            dto.reason,
        );

        // Emit domain event
        const context = this.correlationService.getContext();
        await this.domainEventService.createEvent({
            eventType: 'Appointment.Cancelled',
            domain: Domain.CONSULTATION,
            aggregateType: 'Appointment',
            aggregateId: appointmentId,
            payload: {
                appointmentNumber: updated.appointmentNumber,
                reason: dto.reason,
                paymentConfirmed: !!existing.paymentConfirmedAt,
            },
            correlationId: context.correlationId || undefined,
            causationId: context.causationId || undefined,
            createdBy: userId,
            sessionId: context.sessionId || undefined,
            requestId: context.requestId || undefined,
        });

        return updated;
    }

    /**
     * Dashboard Queries
     */

    async getTodayAppointments(date: Date = new Date()) {
        return await this.bookingRepository.getTodayAppointments(date);
    }

    async getUpcomingAppointments(days: number = 7) {
        return await this.bookingRepository.getUpcomingAppointments(days);
    }

    async getUnconfirmedAppointments() {
        return await this.bookingRepository.getUnconfirmedAppointments();
    }

    async getAppointmentsRequiringScheduling() {
        return await this.bookingRepository.getAppointmentsRequiringScheduling();
    }

    async getMissedAppointments(date: Date = new Date()) {
        return await this.bookingRepository.getMissedAppointments(date);
    }

    /**
     * Private helper methods
     */

    private validateAppointmentTimes(startTime: Date, endTime: Date): void {
        const now = new Date();

        if (startTime <= now) {
            throw new BadRequestException('Appointment start time must be in the future');
        }

        if (endTime <= startTime) {
            throw new BadRequestException('Appointment end time must be after start time');
        }
    }

    private async getConsultationFee(appointmentType: string): Promise<number> {
        // TODO: Query from fee schedule
        const defaultFees: Record<string, number> = {
            CONSULTATION: 5000,
            FOLLOW_UP: 3000,
            PRE_OP: 2000,
            POST_OP: 2000,
            PROCEDURE: 15000,
            EMERGENCY: 10000,
        };

        return defaultFees[appointmentType] || defaultFees.CONSULTATION;
    }

    private async generateAppointmentNumber(tx: any): Promise<string> {
        const year = new Date().getFullYear();
        const count = await tx.appointment.count({
            where: {
                appointmentNumber: {
                    startsWith: `APT-${year}-`,
                },
            },
        });

        return `APT-${year}-${String(count + 1).padStart(5, '0')}`;
    }

    private async generatePatientNumber(tx: any): Promise<string> {
        const year = new Date().getFullYear();
        const count = await tx.patient.count({
            where: {
                patientNumber: {
                    startsWith: `MRN-${year}-`,
                },
            },
        });

        return `MRN-${year}-${String(count + 1).padStart(5, '0')}`;
    }

    private async generateFileNumber(tx: any): Promise<string> {
        const year = new Date().getFullYear();
        const count = await tx.patient.count({
            where: {
                fileNumber: {
                    startsWith: `FILE-${year}-`,
                },
            },
        });

        return `FILE-${year}-${String(count + 1).padStart(5, '0')}`;
    }
}
