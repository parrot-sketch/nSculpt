import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { AppointmentService } from '../services/appointment.service';
import { AppointmentBookingService } from '../services/appointment-booking.service';
import { PatientService } from '../../patient/services/patient.service';
import { CreateAppointmentDto } from '../dto/create-appointment.dto';
import { ConfirmAppointmentPaymentDto } from '../dto/confirm-appointment-payment.dto';
import { CancelAppointmentDto } from '../dto/cancel-appointment.dto';
import { UpdateAppointmentDto } from '../dto/update-appointment.dto';
import { UpdateAppointmentStatusDto } from '../dto/update-appointment-status.dto';
import { CompleteAppointmentDto } from '../dto/complete-appointment.dto';
import {
  BookAppointmentForNewPatientDto,
  BookAppointmentForExistingPatientDto,
  ScheduleFromProcedurePlanDto,
  ScheduleFromFollowUpPlanDto,
  RescheduleAppointmentDto,
  CancelAppointmentBookingDto,
} from '../dto/book-appointment.dto';
import { RequestAppointmentDto } from '../dto/request-appointment.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../auth/services/identityContext.service';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RlsGuard } from '../../../common/guards/rls.guard';
import { Appointment, AppointmentStatus } from '@prisma/client';

@Controller('appointments')
@UseGuards(RolesGuard, RlsGuard, PermissionsGuard)
export class AppointmentController {
  constructor(
    private readonly appointmentService: AppointmentService,
    private readonly bookingService: AppointmentBookingService,
    private readonly patientService: PatientService,
  ) { }

  /**
   * Create appointment request
   * 
   * POST /appointments
   * 
   * Creates appointment in PENDING_PAYMENT status.
   * Front desk staff can create appointments.
   */
  @Post()
  @Roles('FRONT_DESK', 'ADMIN', 'DOCTOR')
  @Permissions('appointment:create')
  async create(
    @Body() createDto: CreateAppointmentDto,
    @CurrentUser() user: UserIdentity,
  ): Promise<Appointment> {
    return await this.appointmentService.create(createDto, user.id);
  }

  /**
   * Confirm appointment payment
   * 
   * POST /appointments/:id/confirm-payment
   * 
   * Confirms payment and changes status to CONFIRMED.
   * Only front desk and billing staff can confirm payments.
   */
  @Post(':id/confirm-payment')
  @Roles('FRONT_DESK', 'BILLING', 'ADMIN')
  @Permissions('appointment:confirm-payment')
  async confirmPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() confirmDto: ConfirmAppointmentPaymentDto,
    @CurrentUser() user: UserIdentity,
  ): Promise<Appointment> {
    return await this.appointmentService.confirmPayment(confirmDto, user.id);
  }

  /**
   * Cancel appointment
   * 
   * POST /appointments/:id/cancel
   * 
   * Cancels appointment with appropriate policy based on payment status.
   */
  @Post(':id/cancel')
  @Roles('FRONT_DESK', 'ADMIN', 'PATIENT')
  @Permissions('appointment:cancel')
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() cancelDto: CancelAppointmentDto,
    @CurrentUser() user: UserIdentity,
  ): Promise<Appointment> {
    return await this.appointmentService.cancel(id, cancelDto, user.id);
  }

  /**
   * Check in patient
   * 
   * POST /appointments/:id/check-in
   * 
   * Called when patient arrives at front desk.
   */
  @Post(':id/check-in')
  @Roles('FRONT_DESK', 'ADMIN')
  @Permissions('appointment:check-in')
  async checkIn(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserIdentity,
  ): Promise<Appointment> {
    return await this.appointmentService.checkIn(id, user.id);
  }

  /**
   * Get appointment by ID
   * 
   * GET /appointments/:id
   */
  @Get(':id')
  @Roles('FRONT_DESK', 'DOCTOR', 'ADMIN', 'PATIENT')
  @Permissions('appointment:read')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Appointment> {
    return await this.appointmentService.findOne(id);
  }

  /**
   * Reschedule appointment
   * 
   * PATCH /appointments/:id
   * 
   * Updates appointment date and time.
   */
  @Patch(':id')
  @Roles('FRONT_DESK', 'ADMIN')
  @Permissions('appointment:update')
  async reschedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateAppointmentDto,
    @CurrentUser() user: UserIdentity,
  ): Promise<Appointment> {
    return await this.appointmentService.reschedule(id, updateDto, user.id);
  }

  /**
   * Update appointment status
   * 
   * PATCH /appointments/:id/status
   * 
   * Updates appointment status (e.g., mark as no-show).
   */
  @Patch(':id/status')
  @Roles('FRONT_DESK', 'ADMIN', 'DOCTOR')
  @Permissions('appointment:update')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() statusDto: UpdateAppointmentStatusDto,
    @CurrentUser() user: UserIdentity,
  ): Promise<Appointment> {
    return await this.appointmentService.updateStatus(id, statusDto, user.id);
  }

  /**
   * Complete appointment
   * 
   * POST /appointments/:id/complete
   * 
   * Marks appointment as completed and links to consultation.
   */
  @Post(':id/complete')
  @Roles('DOCTOR', 'ADMIN')
  @Permissions('appointment:update')
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() completeDto: CompleteAppointmentDto,
    @CurrentUser() user: UserIdentity,
  ): Promise<Appointment> {
    return await this.appointmentService.complete(id, completeDto.consultationId);
  }

  /**
   * ============================================
   * CLINICAL COORDINATION ENDPOINTS
   * ============================================
   */

  /**
   * Step 1: Patient Initiates Request
   * POST /appointments/request
   */
  @Post('request')
  @Roles('PATIENT', 'FRONT_DESK', 'ADMIN')
  @Permissions('appointment:create')
  async requestAppointment(
    @Body() requestDto: RequestAppointmentDto,
    @CurrentUser() user: UserIdentity,
  ): Promise<Appointment> {
    let patientId = (requestDto as any).patientId;

    // If patient is requesting for themselves, resolve their patient ID from their user account
    if (user.roles.includes('PATIENT')) {
      const patient = await this.patientService.getPatientByUserId(user.id);
      if (!patient) {
        throw new BadRequestException('Patient record not found for this user');
      }
      patientId = patient.id;
    }

    if (!patientId) {
      throw new BadRequestException('Patient ID is required');
    }

    return await this.appointmentService.createRequest(patientId, requestDto, user.id);
  }

  /**
   * Step 2: FrontDesk Assigns Schedule
   * PATCH /appointments/:id/schedule
   */
  @Patch(':id/schedule')
  @Roles('FRONT_DESK', 'ADMIN')
  @Permissions('appointment:update')
  async assignSchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateAppointmentDto,
    @CurrentUser() user: UserIdentity,
  ): Promise<Appointment> {
    return await this.appointmentService.assignSchedule(id, updateDto, user.id);
  }

  /**
   * Step 3: Doctor Confirms Schedule
   * POST /appointments/:id/confirm
   */
  @Post(':id/confirm')
  @Roles('DOCTOR', 'SURGEON', 'ADMIN')
  @Permissions('appointment:update')
  async confirmByDoctor(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserIdentity,
  ): Promise<Appointment> {
    return await this.appointmentService.confirmByDoctor(id, user.id);
  }

  /**
   * Step 3 (Alt): Doctor Requests Reschedule
   * POST /appointments/:id/request-reschedule
   */
  @Post(':id/request-reschedule')
  @Roles('DOCTOR', 'SURGEON', 'ADMIN')
  @Permissions('appointment:update')
  async requestReschedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('notes') notes: string,
    @CurrentUser() user: UserIdentity,
  ): Promise<Appointment> {
    return await this.appointmentService.requestReschedule(id, notes, user.id);
  }

  /**
   * ============================================
   * BOOKING ENDPOINTS (Front Desk)
   * ============================================
   */

  /**
   * Book appointment for new patient
   * POST /appointments/book/new-patient
   */
  @Post('book/new-patient')
  @Roles('FRONT_DESK', 'ADMIN')
  @Permissions('appointment:create')
  async bookForNewPatient(
    @Body() bookDto: BookAppointmentForNewPatientDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return await this.bookingService.createAppointmentForNewPatient(bookDto, user.id);
  }

  /**
   * Book appointment for existing patient
   * POST /appointments/book/existing-patient
   */
  @Post('book/existing-patient')
  @Roles('FRONT_DESK', 'ADMIN')
  @Permissions('appointment:create')
  async bookForExistingPatient(
    @Body() bookDto: BookAppointmentForExistingPatientDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return await this.bookingService.createAppointmentForExistingPatient(bookDto, user.id);
  }

  /**
   * Schedule appointment from procedure plan
   * POST /appointments/book/from-procedure-plan
   */
  @Post('book/from-procedure-plan')
  @Roles('FRONT_DESK', 'ADMIN')
  @Permissions('appointment:create')
  async scheduleFromProcedurePlan(
    @Body() scheduleDto: ScheduleFromProcedurePlanDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return await this.bookingService.scheduleFromProcedurePlan(scheduleDto, user.id);
  }

  /**
   * Schedule appointment from follow-up plan
   * POST /appointments/book/from-follow-up-plan
   */
  @Post('book/from-follow-up-plan')
  @Roles('FRONT_DESK', 'ADMIN')
  @Permissions('appointment:create')
  async scheduleFromFollowUpPlan(
    @Body() scheduleDto: ScheduleFromFollowUpPlanDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return await this.bookingService.scheduleFromFollowUpPlan(scheduleDto, user.id);
  }

  /**
   * Reschedule appointment (enhanced version)
   * POST /appointments/:id/reschedule
   */
  @Post(':id/reschedule')
  @Roles('FRONT_DESK', 'ADMIN')
  @Permissions('appointment:update')
  async rescheduleBooking(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() rescheduleDto: RescheduleAppointmentDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return await this.bookingService.rescheduleAppointment(id, rescheduleDto, user.id);
  }

  /**
   * Cancel appointment (enhanced version)
   * POST /appointments/:id/cancel-booking
   */
  @Post(':id/cancel-booking')
  @Roles('FRONT_DESK', 'ADMIN')
  @Permissions('appointment:update')
  async cancelBooking(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() cancelDto: CancelAppointmentBookingDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return await this.bookingService.cancelAppointment(id, cancelDto, user.id);
  }

  /**
   * ============================================
   * DASHBOARD QUERIES
   * ============================================
   */

  /**
   * Get today's appointments
   * GET /appointments/dashboard/today
   */
  @Get('dashboard/today')
  @Roles('FRONT_DESK', 'ADMIN', 'DOCTOR', 'SURGEON')
  @Permissions('appointment:read')
  async getTodayAppointments(@Query('date') date?: string) {
    const queryDate = date ? new Date(date) : new Date();
    return await this.bookingService.getTodayAppointments(queryDate);
  }

  /**
   * Get upcoming appointments
   * GET /appointments/dashboard/upcoming
   */
  @Get('dashboard/upcoming')
  @Roles('FRONT_DESK', 'ADMIN', 'DOCTOR', 'SURGEON')
  @Permissions('appointment:read')
  async getUpcomingAppointments(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 7;
    return await this.bookingService.getUpcomingAppointments(daysNum);
  }

  /**
   * Get unconfirmed appointments
   * GET /appointments/dashboard/unconfirmed
   */
  @Get('dashboard/unconfirmed')
  @Roles('FRONT_DESK', 'ADMIN')
  @Permissions('appointment:read')
  async getUnconfirmedAppointments() {
    return await this.bookingService.getUnconfirmedAppointments();
  }

  /**
   * Get appointments requiring scheduling
   * GET /appointments/dashboard/requiring-scheduling
   */
  @Get('dashboard/requiring-scheduling')
  @Roles('FRONT_DESK', 'ADMIN')
  @Permissions('appointment:read')
  async getAppointmentsRequiringScheduling() {
    return await this.bookingService.getAppointmentsRequiringScheduling();
  }

  /**
   * Get missed appointments
   * GET /appointments/dashboard/missed
   */
  @Get('dashboard/missed')
  @Roles('FRONT_DESK', 'ADMIN')
  @Permissions('appointment:read')
  async getMissedAppointments(@Query('date') date?: string) {
    const queryDate = date ? new Date(date) : new Date();
    return await this.bookingService.getMissedAppointments(queryDate);
  }


  /**
   * Get appointments by doctor
   * 
   * GET /appointments/doctor/:doctorId
   */
  @Get('doctor/:doctorId')
  @Roles('DOCTOR', 'FRONT_DESK', 'ADMIN')
  @Permissions('appointment:read')
  async findByDoctor(
    @Param('doctorId', ParseUUIDPipe) doctorId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
  ): Promise<Appointment[]> {
    const statusEnum = status
      ? (this.validateAppointmentStatus(status) as AppointmentStatus)
      : undefined;

    return await this.appointmentService.findByDoctor(
      doctorId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      statusEnum,
    );
  }

  private validateAppointmentStatus(status: string): AppointmentStatus {
    const validStatuses = Object.values(AppointmentStatus);
    if (!validStatuses.includes(status as AppointmentStatus)) {
      throw new BadRequestException(`Invalid appointment status: ${status}`);
    }
    return status as AppointmentStatus;
  }

  /**
   * Get appointments by patient
   * 
   * GET /appointments/patient/:patientId
   */
  @Get('patient/:patientId')
  @Roles('PATIENT', 'FRONT_DESK', 'DOCTOR', 'ADMIN')
  @Permissions('appointment:read')
  async findByPatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('status') status?: string,
  ): Promise<Appointment[]> {
    const statusEnum = status
      ? (this.validateAppointmentStatus(status) as AppointmentStatus)
      : undefined;

    return await this.appointmentService.findByPatient(patientId, statusEnum);
  }

  /**
   * Get available time slots
   * 
   * GET /appointments/available-slots/:doctorId
   */
  @Get('available-slots/:doctorId')
  @Roles('FRONT_DESK', 'ADMIN', 'PATIENT')
  @Permissions('appointment:read')
  async findAvailableSlots(
    @Param('doctorId', ParseUUIDPipe) doctorId: string,
    @Query('date') date: string,
    @Query('duration') duration?: string,
  ) {
    return await this.appointmentService.findAvailableSlots(
      doctorId,
      new Date(date),
      duration ? parseInt(duration, 10) : 30,
    );
  }

  /**
   * List all appointments with filters
   * 
   * GET /appointments
   */
  @Get()
  @Roles('FRONT_DESK', 'ADMIN', 'DOCTOR', 'NURSE')
  @Permissions('appointment:read')
  async findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('doctorId') doctorId?: string,
    @Query('patientId') patientId?: string,
  ) {
    const statusEnum = status
      ? (this.validateAppointmentStatus(status) as AppointmentStatus)
      : undefined;

    return await this.appointmentService.findAll(
      skip ? parseInt(skip, 10) : 0,
      take ? parseInt(take, 10) : 20,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      statusEnum,
      doctorId,
      patientId,
    );
  }
}

