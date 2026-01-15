import {
  IsString,
  IsUUID,
  IsDateString,
  IsInt,
  IsOptional,
  IsEnum,
  Min,
  Max,
} from 'class-validator';

/**
 * Create Appointment DTO
 * 
 * Used for booking consultation appointments.
 * Appointment is created in PENDING_PAYMENT status.
 * Payment confirmation triggers status change to CONFIRMED.
 */
export class CreateAppointmentDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  doctorId: string;

  @IsDateString()
  scheduledDate: string; // Date only (YYYY-MM-DD)

  @IsDateString()
  scheduledStartTime: string; // Full datetime (ISO 8601)

  @IsDateString()
  scheduledEndTime: string; // Full datetime (ISO 8601)

  @IsInt()
  @Min(15)
  @Max(240)
  @IsOptional()
  estimatedDurationMinutes?: number; // Default 30 minutes

  @IsString()
  @IsEnum(['CONSULTATION', 'FOLLOW_UP', 'PRE_OP', 'POST_OP', 'EMERGENCY'])
  appointmentType: string;

  @IsString()
  @IsOptional()
  reason?: string; // Patient's reason for appointment

  @IsString()
  @IsOptional()
  notes?: string; // Internal notes
}






