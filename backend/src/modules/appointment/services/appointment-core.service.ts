import { Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentRepository } from '../repositories/appointment.repository';
import { Appointment, AppointmentStatus } from '@prisma/client';

@Injectable()
export class AppointmentCoreService {
    constructor(
        private readonly appointmentRepository: AppointmentRepository,
    ) { }

    /**
     * Find appointment by ID
     */
    async findOne(id: string): Promise<Appointment> {
        const appointment = await this.appointmentRepository.findById(id);
        if (!appointment) {
            throw new NotFoundException(`Appointment with ID ${id} not found`);
        }
        return appointment;
    }

    /**
     * Find appointments by doctor
     */
    async findByDoctor(
        doctorId: string,
        startDate?: Date,
        endDate?: Date,
        status?: AppointmentStatus,
    ): Promise<Appointment[]> {
        return await this.appointmentRepository.findByDoctor(
            doctorId,
            startDate,
            endDate,
            status,
        );
    }

    /**
     * Find appointments by patient
     */
    async findByPatient(
        patientId: string,
        status?: AppointmentStatus
    ): Promise<Appointment[]> {
        return await this.appointmentRepository.findByPatient(patientId, status);
    }

    /**
     * Find available time slots for a doctor
     */
    async findAvailableSlots(doctorId: string, date: Date, durationMinutes: number = 30) {
        return await this.appointmentRepository.findAvailableSlots(
            doctorId,
            date,
            durationMinutes,
        );
    }

    /**
     * Find all appointments with pagination and filters
     */
    async findAll(
        skip: number = 0,
        take: number = 20,
        startDate?: Date,
        endDate?: Date,
        status?: AppointmentStatus,
        doctorId?: string,
        patientId?: string,
    ) {
        return await this.appointmentRepository.findAll(skip, take, {
            startDate,
            endDate,
            status,
            doctorId,
            patientId,
        });
    }

    /**
     * Generate a unique appointment number
     */
    async generateAppointmentNumber(prisma: any): Promise<string> {
        const year = new Date().getFullYear();
        const count = await prisma.appointment.count({
            where: {
                appointmentNumber: {
                    startsWith: `APT-${year}-`,
                },
            },
        });

        return `APT-${year}-${String(count + 1).padStart(5, '0')}`;
    }
}
