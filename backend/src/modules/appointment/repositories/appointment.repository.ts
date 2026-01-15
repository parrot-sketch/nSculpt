import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import {
  PrismaClient,
  Prisma,
  Appointment,
  AppointmentStatus,
  CancellationReason
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { getPrismaClient } from '../../../prisma/client';
import { CreateAppointmentDto } from '../dto/create-appointment.dto';

@Injectable()
export class AppointmentRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Generate unique appointment number
   * Format: APT-YYYY-XXXXX
   */
  private async generateAppointmentNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `APT-${year}-`;

    const lastAppointment = await this.prisma.appointment.findFirst({
      where: {
        appointmentNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        appointmentNumber: 'desc',
      },
    });

    let nextNumber = 1;
    if (lastAppointment) {
      const match = lastAppointment.appointmentNumber.match(/-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    const formattedNumber = nextNumber.toString().padStart(5, '0');
    return `${prefix}${formattedNumber}`;
  }

  /**
   * Check for time slot conflicts
   * Prevents double-booking of doctor's time
   */
  private async checkTimeSlotConflict(
    doctorId: string,
    startTime: Date,
    endTime: Date,
    excludeAppointmentId?: string,
  ): Promise<void> {
    const where: Prisma.AppointmentWhereInput = {
      doctorId,
      status: {
        in: [AppointmentStatus.CONFIRMED, AppointmentStatus.CHECKED_IN], // Only check confirmed appointments
      },
      OR: [
        // Overlap conditions
        {
          AND: [
            { scheduledStartTime: { lte: startTime } },
            { scheduledEndTime: { gt: startTime } },
          ],
        },
        {
          AND: [
            { scheduledStartTime: { lt: endTime } },
            { scheduledEndTime: { gte: endTime } },
          ],
        },
        {
          AND: [
            { scheduledStartTime: { gte: startTime } },
            { scheduledEndTime: { lte: endTime } },
          ],
        },
      ],
    };

    if (excludeAppointmentId) {
      where.id = { not: excludeAppointmentId };
    }

    const conflicting = await this.prisma.appointment.findFirst({
      where,
    });

    if (conflicting) {
      throw new ConflictException(
        `Time slot conflict: Doctor already has an appointment from ${conflicting.scheduledStartTime} to ${conflicting.scheduledEndTime}`,
      );
    }
  }

  async create(data: CreateAppointmentDto & { consultationFee: number; createdBy?: string }) {
    const appointmentNumber = await this.generateAppointmentNumber();

    // Check for time slot conflicts (only for confirmed appointments)
    // PENDING_PAYMENT appointments don't block time yet
    // This will be checked again when payment is confirmed

    const appointmentData: Prisma.AppointmentCreateInput = {
      appointmentNumber,
      patient: { connect: { id: data.patientId } },
      doctor: { connect: { id: data.doctorId } },
      scheduledDate: new Date(data.scheduledDate),
      scheduledStartTime: new Date(data.scheduledStartTime),
      scheduledEndTime: new Date(data.scheduledEndTime),
      estimatedDurationMinutes: data.estimatedDurationMinutes || 30,
      appointmentType: data.appointmentType,
      reason: data.reason,
      notes: data.notes,
      consultationFee: data.consultationFee,
      status: AppointmentStatus.PENDING_PAYMENT, // Starts as pending payment
      createdBy: data.createdBy,
    };

    return await this.prisma.appointment.create({
      data: appointmentData,
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
  }

  async findById(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
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
        encounter: {
          select: {
            id: true,
            status: true,
            locked: true,
          },
        },
        payment: {
          select: {
            id: true,
            paymentNumber: true,
            amount: true,
            status: true,
            paymentDate: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    return appointment;
  }

  async confirmPayment(appointmentId: string, paymentId: string) {
    // Verify appointment exists and is in PENDING_PAYMENT status
    const appointment = await this.findById(appointmentId);

    if (appointment.status !== AppointmentStatus.PENDING_PAYMENT && appointment.status !== AppointmentStatus.PAYMENT_PENDING) {
      throw new ConflictException(
        `Cannot confirm payment: Appointment is not in PENDING_PAYMENT status. Current status: ${appointment.status}`,
      );
    }

    // Verify payment exists and is COMPLETED
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    if (payment.status !== 'COMPLETED') {
      throw new ConflictException(
        `Cannot confirm appointment: Payment is not COMPLETED. Current status: ${payment.status}`,
      );
    }

    // Verify payment amount matches consultation fee
    if (payment.amount < appointment.consultationFee) {
      throw new ConflictException(
        `Payment amount (${payment.amount}) is less than consultation fee (${appointment.consultationFee})`,
      );
    }

    // Check for time slot conflicts NOW (before confirming)
    await this.checkTimeSlotConflict(
      appointment.doctorId,
      appointment.scheduledStartTime,
      appointment.scheduledEndTime,
      appointmentId,
    );

    // Update appointment to CONFIRMED
    return await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: AppointmentStatus.CONFIRMED,
        paymentId: paymentId,
        paymentConfirmedAt: new Date(),
        version: { increment: 1 },
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
        payment: {
          select: {
            id: true,
            paymentNumber: true,
            amount: true,
            status: true,
          },
        },
      },
    });
  }

  async cancel(
    appointmentId: string,
    cancellationReason: string,
    cancellationNotes: string | undefined,
    cancelledBy: string,
  ) {
    const appointment = await this.findById(appointmentId);

    const terminalStatuses: AppointmentStatus[] = [
      AppointmentStatus.COMPLETED,
      AppointmentStatus.CANCELLED,
      AppointmentStatus.CANCELLED_AFTER_PAYMENT
    ];
    if (terminalStatuses.includes(appointment.status)) {
      throw new ConflictException(
        `Cannot cancel appointment: Appointment is already ${appointment.status}`,
      );
    }

    // Determine cancellation status based on payment
    const newStatus =
      appointment.paymentId && appointment.status === AppointmentStatus.CONFIRMED
        ? AppointmentStatus.CANCELLED_AFTER_PAYMENT
        : AppointmentStatus.CANCELLED;

    return await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: newStatus,
        cancelledAt: new Date(),
        cancelledBy: cancelledBy,
        cancellationReason: cancellationReason as CancellationReason,
        cancellationNotes: cancellationNotes,
        version: { increment: 1 },
      },
    });
  }

  async checkIn(appointmentId: string, checkedInBy: string) {
    const appointment = await this.findById(appointmentId);

    if (appointment.status !== AppointmentStatus.CONFIRMED) {
      throw new ConflictException(
        `Cannot check in: Appointment must be CONFIRMED. Current status: ${appointment.status}`,
      );
    }

    return await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: AppointmentStatus.CHECKED_IN,
        checkedInAt: new Date(),
        checkedInBy: checkedInBy,
        version: { increment: 1 },
      },
    });
  }

  async complete(appointmentId: string, consultationId: string) {
    const appointment = await this.findById(appointmentId);

    if (appointment.status !== AppointmentStatus.CHECKED_IN) {
      throw new ConflictException(
        `Cannot complete: Appointment must be CHECKED_IN. Current status: ${appointment.status}`,
      );
    }

    return await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: AppointmentStatus.COMPLETED,
        consultationId: consultationId,
        version: { increment: 1 },
      },
    });
  }

  async findByDoctor(
    doctorId: string,
    startDate?: Date,
    endDate?: Date,
    status?: AppointmentStatus,
  ): Promise<Array<Appointment & { patient: { id: string; patientNumber: string; firstName: string; lastName: string; phone: string | null } }>> {
    const where: Prisma.AppointmentWhereInput = {
      doctorId,
      ...(startDate && { scheduledDate: { gte: startDate } }),
      ...(endDate && { scheduledDate: { lte: endDate } }),
      ...(status && { status: status as AppointmentStatus }),
    };

    return await this.prisma.appointment.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            patientNumber: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
      orderBy: {
        scheduledStartTime: 'asc',
      },
    });
  }

  async findByPatient(
    patientId: string,
    status?: AppointmentStatus
  ): Promise<Array<Appointment & { doctor: { id: string; firstName: string; lastName: string }; payment: { id: string; paymentNumber: string; amount: Decimal; status: string } | null }>> {
    const where: Prisma.AppointmentWhereInput = {
      patientId,
      ...(status && { status: status as AppointmentStatus }),
    };

    return await this.prisma.appointment.findMany({
      where,
      include: {
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        payment: {
          select: {
            id: true,
            paymentNumber: true,
            amount: true,
            status: true,
          },
        },
      },
      orderBy: {
        scheduledStartTime: 'desc',
      },
    });
  }

  async findAvailableSlots(doctorId: string, date: Date, durationMinutes: number = 30) {
    // 1. Get all confirmed appointments for this doctor on this date
    const appointments = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        scheduledDate: date,
        status: {
          in: [AppointmentStatus.CONFIRMED, AppointmentStatus.CHECKED_IN],
        },
      },
      orderBy: {
        scheduledStartTime: 'asc',
      },
    });

    // 2. Define working hours (e.g., 08:00 to 17:00)
    const workStartHour = 8;
    const workEndHour = 17;

    const availableSlots: { start: string; end: string }[] = [];

    // Set start time to 08:00 on the selected date
    const currentSlotStart = new Date(date);
    currentSlotStart.setHours(workStartHour, 0, 0, 0);

    const workEnd = new Date(date);
    workEnd.setHours(workEndHour, 0, 0, 0);

    // 3. Generate 30-min slots and check for conflicts
    while (currentSlotStart < workEnd) {
      const currentSlotEnd = new Date(currentSlotStart.getTime() + durationMinutes * 60000);

      // Check if this slot overlaps with any appointment
      const isBooked = appointments.some(apt => {
        const aptStart = new Date(apt.scheduledStartTime);
        const aptEnd = new Date(apt.scheduledEndTime);

        // Overlap logic: (StartA < EndB) and (EndA > StartB)
        return currentSlotStart < aptEnd && currentSlotEnd > aptStart;
      });

      if (!isBooked) {
        availableSlots.push({
          start: currentSlotStart.toISOString(),
          end: currentSlotEnd.toISOString(),
        });
      }

      // Move to next slot
      currentSlotStart.setTime(currentSlotEnd.getTime());
    }

    return { availableSlots };
  }

  async findAll(
    skip: number = 0,
    take: number = 20,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      status?: AppointmentStatus;
      doctorId?: string;
      patientId?: string;
    },
  ) {
    const where: Prisma.AppointmentWhereInput = {
      ...(filters?.startDate && { scheduledDate: { gte: filters.startDate } }),
      ...(filters?.endDate && { scheduledDate: { lte: filters.endDate } }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.doctorId && { doctorId: filters.doctorId }),
      ...(filters?.patientId && { patientId: filters.patientId }),
    };

    const [data, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        skip,
        take,
        include: {
          patient: {
            select: {
              id: true,
              patientNumber: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
            },
          },
          doctor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          encounter: {
            select: {
              id: true,
              status: true,
              locked: true,
            },
          },
          payment: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: {
          scheduledStartTime: 'asc',
        },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return { data, total };
  }
}

