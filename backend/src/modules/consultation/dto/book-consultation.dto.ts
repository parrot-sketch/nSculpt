import { IsUUID, IsString, IsOptional, IsEnum, IsDateString, IsInt, Min } from 'class-validator';

/**
 * DTO for booking a consultation
 * Used by both patients (self-booking) and front desk (booking on behalf)
 */
export class BookConsultationDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  doctorId: string;

  @IsDateString()
  scheduledDate: string; // YYYY-MM-DD

  @IsDateString()
  scheduledStartTime: string; // ISO 8601 datetime

  @IsDateString()
  scheduledEndTime: string; // ISO 8601 datetime

  @IsInt()
  @Min(15)
  @IsOptional()
  estimatedDurationMinutes?: number; // Default 30 minutes

  @IsEnum(['INITIAL', 'REVIEW', 'FOLLOW_UP', 'PRE_OP'])
  visitType: string;

  @IsString()
  @IsOptional()
  reasonForVisit?: string;

  @IsString()
  @IsOptional()
  chiefComplaint?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}






