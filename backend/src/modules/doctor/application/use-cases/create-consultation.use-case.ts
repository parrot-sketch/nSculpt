/**
 * Create Consultation Use Case
 * 
 * Application layer use case for creating a new consultation from a confirmed appointment.
 * Orchestrates domain logic and coordinates with infrastructure.
 * 
 * @application-layer
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Consultation, ConsultationType } from '../../domain/entities/consultation.entity';
import { ConsultationNumber } from '../../domain/value-objects/consultation-number.vo';
import { ConsultationStateMachineService } from '../../domain/services/consultation-state-machine.service';
import { CreateConsultationDto } from '../dtos/create-consultation.dto';
import { ConsultationResponseDto } from '../dtos/consultation-response.dto';
import { ConsultationRepository } from '../../infrastructure/repositories/consultation.repository';

@Injectable()
export class CreateConsultationUseCase {
  private readonly logger = new Logger(CreateConsultationUseCase.name);

  constructor(
    private readonly consultationRepository: ConsultationRepository,
    private readonly stateMachine: ConsultationStateMachineService,
  ) {}

  async execute(
    dto: CreateConsultationDto,
    doctorId: string,
    userId: string,
  ): Promise<ConsultationResponseDto> {
    this.logger.log(
      `Creating consultation for patient ${dto.patientId} from appointment ${dto.appointmentId}`,
    );

    // 1. Validate appointment exists and is confirmed
    const appointment = await this.consultationRepository.findAppointmentById(
      dto.appointmentId,
    );
    if (!appointment) {
      throw new NotFoundException(
        `Appointment with ID ${dto.appointmentId} not found`,
      );
    }

    // 2. Check if consultation already exists for this appointment
    const existingConsultation =
      await this.consultationRepository.findByAppointmentId(dto.appointmentId);
    if (existingConsultation) {
      throw new BadRequestException(
        `Consultation already exists for appointment ${dto.appointmentId}`,
      );
    }

    // 3. Validate appointment is confirmed (business rule)
    if (appointment.status !== 'CONFIRMED') {
      throw new BadRequestException(
        `Cannot create consultation from appointment with status ${appointment.status}. Appointment must be CONFIRMED.`,
      );
    }

    // 4. Validate appointment belongs to correct patient and doctor
    if (appointment.patientId !== dto.patientId) {
      throw new BadRequestException(
        'Appointment patient ID does not match consultation patient ID',
      );
    }

    if (appointment.doctorId !== doctorId) {
      throw new BadRequestException(
        'Appointment doctor ID does not match consultation doctor ID',
      );
    }

    // 5. Generate consultation number
    const consultationNumberStr =
      await this.consultationRepository.generateNextConsultationNumber();
    const consultationNumber =
      ConsultationNumber.fromString(consultationNumberStr);

    // 6. Determine consultation date (use appointment date or provided date)
    const consultationDate = dto.consultationDate
      ? new Date(dto.consultationDate)
      : appointment.scheduledStartTime || new Date();

    // 7. Create domain entity
    const consultation = Consultation.create({
      consultationNumber: consultationNumber.toString(),
      patientId: dto.patientId,
      doctorId,
      appointmentId: dto.appointmentId,
      consultationType: dto.consultationType,
      consultationDate,
      chiefComplaint: dto.chiefComplaint,
      createdBy: userId,
    });

    // 8. Persist consultation
    const savedConsultation = await this.consultationRepository.create(
      consultation,
    );

    this.logger.log(
      `Consultation ${savedConsultation.id} created successfully with number ${consultationNumber.toString()}`,
    );

    // 9. Map to response DTO
    return ConsultationResponseDto.fromEntity(savedConsultation);
  }
}
