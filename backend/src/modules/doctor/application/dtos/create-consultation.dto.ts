/**
 * Create Consultation DTO
 * 
 * Input for creating a new consultation from a confirmed appointment.
 * 
 * @application-layer
 */

import {
  IsUUID,
  IsEnum,
  IsString,
  IsOptional,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ConsultationType } from '../../domain/entities/consultation.entity';

export class CreateConsultationDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  appointmentId: string;

  @IsEnum(ConsultationType)
  consultationType: ConsultationType;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  chiefComplaint?: string;

  @IsOptional()
  @IsDateString()
  consultationDate?: string;
}


