import { Injectable } from '@nestjs/common';
import { Appointment, AppointmentStatus } from '@prisma/client';
import { CreateAppointmentDto } from '../dto/create-appointment.dto';
import { RequestAppointmentDto } from '../dto/request-appointment.dto';
import { ConfirmAppointmentPaymentDto } from '../dto/confirm-appointment-payment.dto';
import { CancelAppointmentDto } from '../dto/cancel-appointment.dto';
import { UpdateAppointmentDto } from '../dto/update-appointment.dto';
import { UpdateAppointmentStatusDto } from '../dto/update-appointment-status.dto';

import { AppointmentCoreService } from './appointment-core.service';
import { AppointmentCoordinationService } from './appointment-coordination.service';
import { AppointmentOperationsService } from './appointment-operations.service';
import { AppointmentBookingService } from './appointment-booking.service';

@Injectable()
export class AppointmentService {
  constructor(
    private readonly coreService: AppointmentCoreService,
    private readonly coordinationService: AppointmentCoordinationService,
    private readonly operationsService: AppointmentOperationsService,
    private readonly bookingService: AppointmentBookingService,
  ) { }

  // --- Core Retrieval ---
  async findOne(id: string): Promise<Appointment> {
    return this.coreService.findOne(id);
  }

  async findAll(skip?: number, take?: number, startDate?: Date, endDate?: Date, status?: AppointmentStatus, doctorId?: string, patientId?: string) {
    return this.coreService.findAll(skip, take, startDate, endDate, status, doctorId, patientId);
  }

  async findByDoctor(doctorId: string, startDate?: Date, endDate?: Date, status?: AppointmentStatus): Promise<Appointment[]> {
    return this.coreService.findByDoctor(doctorId, startDate, endDate, status);
  }

  async findByPatient(patientId: string, status?: AppointmentStatus): Promise<Appointment[]> {
    return this.coreService.findByPatient(patientId, status);
  }

  async findAvailableSlots(doctorId: string, date: Date, durationMinutes?: number) {
    return this.coreService.findAvailableSlots(doctorId, date, durationMinutes);
  }

  // --- Coordination Workflow ---
  async createRequest(patientId: string, dto: RequestAppointmentDto, userId: string): Promise<Appointment> {
    return this.coordinationService.createRequest(patientId, dto, userId);
  }

  async assignSchedule(id: string, updateDto: UpdateAppointmentDto, userId: string): Promise<Appointment> {
    return this.coordinationService.assignSchedule(id, updateDto, userId);
  }

  async confirmByDoctor(id: string, userId: string): Promise<Appointment> {
    return this.coordinationService.confirmByDoctor(id, userId);
  }

  async requestReschedule(id: string, notes: string, userId: string): Promise<Appointment> {
    return this.coordinationService.requestReschedule(id, notes, userId);
  }

  // --- Lifecycle Operations ---
  async cancel(appointmentId: string, cancelDto: CancelAppointmentDto, userId: string): Promise<Appointment> {
    return this.operationsService.cancel(appointmentId, cancelDto, userId);
  }

  async checkIn(appointmentId: string, checkedInBy: string): Promise<Appointment> {
    return this.operationsService.checkIn(appointmentId, checkedInBy);
  }

  async complete(appointmentId: string, consultationId: string): Promise<Appointment> {
    return this.operationsService.complete(appointmentId, consultationId);
  }

  async reschedule(appointmentId: string, updateDto: UpdateAppointmentDto, updatedBy: string): Promise<Appointment> {
    return this.operationsService.reschedule(appointmentId, updateDto, updatedBy);
  }

  async updateStatus(appointmentId: string, statusDto: UpdateAppointmentStatusDto, updatedBy: string): Promise<Appointment> {
    return this.operationsService.updateStatus(appointmentId, statusDto, updatedBy);
  }

  // --- Booking & Payment (Consolidated in BookingService) ---
  async create(createDto: CreateAppointmentDto, createdBy?: string): Promise<Appointment> {
    return this.bookingService.create(createDto, createdBy);
  }

  async confirmPayment(confirmDto: ConfirmAppointmentPaymentDto, userId: string): Promise<Appointment> {
    return this.bookingService.confirmPayment(confirmDto, userId);
  }
}
