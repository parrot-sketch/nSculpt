import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { AppointmentService } from '../../appointment/services/appointment.service';
import { ConsultationService } from './consultation.service';
import { BookConsultationDto } from '../dto/book-consultation.dto';
import { AvailableSlotsDto } from '../dto/available-slots.dto';
import { AppointmentRepository } from '../../appointment/repositories/appointment.repository';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { RlsValidationService } from '../../../modules/audit/services/rlsValidation.service';
import { IdentityContextService } from '../../../modules/auth/services/identityContext.service';
import { Domain, AppointmentStatus } from '@prisma/client';
import { CreateAppointmentDto } from '../../appointment/dto/create-appointment.dto';
import { CreateConsultationDto } from '../dto/create-consultation.dto';
import { ConsultationEventType } from '../events/consultation.events';

/**
 * Consultation Booking Service
 * 
 * Handles the unified consultation booking workflow:
 * 1. Creates appointment (PENDING_PAYMENT)
 * 2. Links appointment to consultation when payment confirmed
 * 3. Sends notifications to patient and doctor
 * 
 * Supports:
 * - Patient self-booking
 * - Front desk booking on behalf of patient
 */
@Injectable()
export class ConsultationBookingService {
  constructor(
    private readonly appointmentService: AppointmentService,
    private readonly appointmentRepository: AppointmentRepository,
    private readonly consultationService: ConsultationService,
    private readonly domainEventService: DomainEventService,
    private readonly correlationService: CorrelationService,
    private readonly rlsValidation: RlsValidationService,
    private readonly identityContext: IdentityContextService,
  ) { }

  /**
   * Book a consultation
   * Creates an appointment in PENDING_PAYMENT status
   * Consultation will be created when appointment is checked in
   * 
   * @param bookDto - Consultation booking details
   * @param userId - User creating the booking (front desk staff or patient)
   * @param isPatientSelfBooking - Whether this is a patient self-booking
   */
  async bookConsultation(
    bookDto: BookConsultationDto,
    userId: string,
    isPatientSelfBooking: boolean = false,
  ) {
    // Validate patient access (if not self-booking, user must have access to patient)
    if (!isPatientSelfBooking) {
      const hasAccess = await this.rlsValidation.canAccessPatient(
        bookDto.patientId,
        userId,
      );
      if (!hasAccess) {
        throw new ForbiddenException(
          `Access denied to patient ${bookDto.patientId}`,
        );
      }

      // Check if user has permission to book consultations
      if (
        !this.identityContext.hasRole('ADMIN') &&
        !this.identityContext.hasRole('FRONT_DESK')
      ) {
        throw new ForbiddenException(
          'Only ADMIN and FRONT_DESK can book consultations on behalf of patients',
        );
      }
    } else {
      // For patient self-booking, verify the patientId matches the user's patient record
      // This will be handled by RLS guard, but we add defensive check here
      const hasAccess = await this.rlsValidation.canAccessPatient(
        bookDto.patientId,
        userId,
      );
      if (!hasAccess) {
        throw new ForbiddenException(
          'You can only book consultations for yourself',
        );
      }
    }

    // Validate time slot is in the future
    const startTime = new Date(bookDto.scheduledStartTime);
    const endTime = new Date(bookDto.scheduledEndTime);

    if (startTime <= new Date()) {
      throw new BadRequestException(
        'Consultation start time must be in the future',
      );
    }

    if (endTime <= startTime) {
      throw new BadRequestException(
        'Consultation end time must be after start time',
      );
    }

    // Create appointment (this will be in PENDING_PAYMENT status)
    const appointmentDto: CreateAppointmentDto = {
      patientId: bookDto.patientId,
      doctorId: bookDto.doctorId,
      scheduledDate: bookDto.scheduledDate,
      scheduledStartTime: bookDto.scheduledStartTime,
      scheduledEndTime: bookDto.scheduledEndTime,
      estimatedDurationMinutes: bookDto.estimatedDurationMinutes || 30,
      appointmentType: 'CONSULTATION', // Always CONSULTATION for consultation bookings
      reason: bookDto.reasonForVisit || bookDto.chiefComplaint,
      notes: bookDto.notes,
    };

    const appointment = await this.appointmentService.create(
      appointmentDto,
      userId,
    );

    // Get correlation context
    const context = this.correlationService.getContext();

    // Emit domain event for consultation booking
    await this.domainEventService.createEvent({
      eventType: 'Consultation.Booked',
      domain: Domain.CONSULTATION,
      aggregateId: appointment.id,
      aggregateType: 'Appointment',
      payload: {
        appointmentId: appointment.id,
        appointmentNumber: appointment.appointmentNumber,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        scheduledStartTime: appointment.scheduledStartTime.toISOString(),
        scheduledEndTime: appointment.scheduledEndTime.toISOString(),
        consultationFee: appointment.consultationFee.toString(),
        status: appointment.status,
        isPatientSelfBooking,
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    // TODO: Send notifications to patient and doctor
    // This will be implemented with a notification service
    // await this.notificationService.sendConsultationBookedNotification(
    //   appointment,
    //   isPatientSelfBooking,
    // );

    return {
      appointment,
      message: isPatientSelfBooking
        ? 'Consultation booked successfully. Please complete payment to confirm your appointment.'
        : 'Consultation booked successfully. Patient will be notified to complete payment.',
      nextSteps: [
        'Patient must complete payment to confirm appointment',
        'Once payment is confirmed, appointment will be scheduled',
        'Patient and doctor will receive confirmation notifications',
      ],
    };
  }

  /**
   * Get available consultation slots for a doctor on a specific date
   */
  async getAvailableSlots(availableSlotsDto: AvailableSlotsDto) {
    const { doctorId, date, durationMinutes = 30 } = availableSlotsDto;

    const { availableSlots } = await this.appointmentRepository.findAvailableSlots(
      doctorId,
      new Date(date),
      durationMinutes,
    );

    return {
      doctorId,
      date,
      durationMinutes,
      availableSlots,
      totalSlots: availableSlots.length,
    };
  }

  /**
   * Create consultation from confirmed appointment
   * Called when appointment is checked in
   */
  async createConsultationFromAppointment(
    appointmentId: string,
    userId: string,
  ) {
    const appointment = await this.appointmentRepository.findById(appointmentId);

    if (!appointment) {
      throw new NotFoundException(`Appointment ${appointmentId} not found`);
    }

    if (appointment.status !== AppointmentStatus.CHECKED_IN) {
      throw new BadRequestException(
        `Cannot create consultation: Appointment must be CHECKED_IN. Current status: ${appointment.status}`,
      );
    }

    if (appointment.consultationId) {
      throw new ConflictException(
        `Consultation already exists for appointment ${appointmentId}`,
      );
    }

    // Create consultation from appointment
    // Map appointment type to consultation visit type
    let visitType = 'INITIAL';
    if (appointment.appointmentType === 'FOLLOW_UP') {
      visitType = 'FOLLOW_UP';
    } else if (appointment.appointmentType === 'PRE_OP') {
      visitType = 'PRE_OP';
    }

    const consultationDto: CreateConsultationDto = {
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      appointmentId: appointment.id,
      visitType: visitType as 'INITIAL' | 'REVIEW' | 'FOLLOW_UP' | 'PRE_OP',
      reasonForVisit: appointment.reason || undefined,
      chiefComplaint: appointment.reason || undefined,
    };

    const consultation = await this.consultationService.createConsultation(
      consultationDto,
      userId,
    );

    // Link consultation to appointment
    await this.appointmentRepository.complete(appointmentId, consultation.id);

    return consultation;
  }
}

