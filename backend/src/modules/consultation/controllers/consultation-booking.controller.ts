import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ConsultationBookingService } from '../services/consultation-booking.service';
import { BookConsultationDto } from '../dto/book-consultation.dto';
import { AvailableSlotsDto } from '../dto/available-slots.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RlsGuard } from '../../../common/guards/rls.guard';
import { PermissionsGuard } from '../../../modules/auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../../modules/auth/decorators/permissions.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../../modules/auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../../modules/auth/services/identityContext.service';

/**
 * Consultation Booking Controller
 * 
 * Handles consultation booking for:
 * - Patients (self-booking)
 * - Front desk (booking on behalf of patients)
 */
@Controller('consultations')
@UseGuards(RolesGuard, RlsGuard, PermissionsGuard)
@UseInterceptors(DataAccessLogInterceptor)
export class ConsultationBookingController {
  constructor(
    private readonly consultationBookingService: ConsultationBookingService,
  ) { }

  /**
   * Book a consultation (Front Desk)
   * 
   * POST /api/v1/consultations/book
   * 
   * Front desk staff can book consultations on behalf of patients.
   * Creates an appointment in PENDING_PAYMENT status.
   */
  @Post('book')
  @Roles('ADMIN', 'FRONT_DESK')
  @Permissions('consultations:*:write')
  async bookConsultation(
    @Body() bookDto: BookConsultationDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.consultationBookingService.bookConsultation(
      bookDto,
      user.id,
      false, // Not patient self-booking
    );
  }

  /**
   * Get available consultation slots for a doctor
   * 
   * GET /api/v1/consultations/available-slots
   * 
   * Returns available time slots for booking a consultation.
   */
  @Get('available-slots')
  @Roles('ADMIN', 'FRONT_DESK', 'PATIENT', 'DOCTOR', 'SURGEON')
  @Permissions('consultations:*:read')
  async getAvailableSlots(
    @Query('doctorId') doctorId: string,
    @Query('date') date: string,
    @Query('durationMinutes') durationMinutes?: number,
  ) {
    const dto: AvailableSlotsDto = {
      doctorId,
      date,
      durationMinutes: durationMinutes ? parseInt(durationMinutes.toString(), 10) : undefined,
    };
    return this.consultationBookingService.getAvailableSlots(dto);
  }

  /**
   * Create consultation from appointment
   * 
   * POST /api/v1/consultations/from-appointment/:appointmentId
   * 
   * Called when appointment is checked in to create the consultation record.
   * This is typically called automatically by the appointment check-in process.
   */
  @Post('from-appointment/:appointmentId')
  @Roles('ADMIN', 'FRONT_DESK')
  @Permissions('consultations:*:write')
  async createConsultationFromAppointment(
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.consultationBookingService.createConsultationFromAppointment(
      appointmentId,
      user.id,
    );
  }
}

/**
 * Public Consultation Booking Controller
 * 
 * Handles patient self-booking (public endpoint)
 */
@Controller('public/consultations')
@UseGuards(RolesGuard, RlsGuard, PermissionsGuard)
@UseInterceptors(DataAccessLogInterceptor)
export class PublicConsultationBookingController {
  constructor(
    private readonly consultationBookingService: ConsultationBookingService,
  ) { }

  /**
   * Book a consultation (Patient Self-Booking)
   * 
   * POST /api/v1/public/consultations/book
   * 
   * Patients can book consultations for themselves.
   * Creates an appointment in PENDING_PAYMENT status.
   */
  @Post('book')
  @Roles('PATIENT')
  @Permissions('consultations:*:write')
  async bookConsultation(
    @Body() bookDto: BookConsultationDto,
    @CurrentUser() user: UserIdentity,
  ) {
    // RLS guard will verify that the patientId matches the user's patient record
    // The patientId in the request must belong to the authenticated patient user
    // This is enforced by RLS validation in the service layer

    return this.consultationBookingService.bookConsultation(
      bookDto,
      user.id,
      true, // Patient self-booking
    );
  }

  /**
   * Get available consultation slots (Public)
   * 
   * GET /api/v1/public/consultations/available-slots
   * 
   * Public endpoint for patients to check doctor availability.
   */
  @Get('available-slots')
  @Roles('PATIENT')
  @Permissions('consultations:*:read')
  async getAvailableSlots(
    @Query('doctorId') doctorId: string,
    @Query('date') date: string,
    @Query('durationMinutes') durationMinutes?: number,
  ) {
    const dto: AvailableSlotsDto = {
      doctorId,
      date,
      durationMinutes: durationMinutes ? parseInt(durationMinutes.toString(), 10) : undefined,
    };
    return this.consultationBookingService.getAvailableSlots(dto);
  }
}

