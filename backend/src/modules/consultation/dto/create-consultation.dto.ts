import { IsString, IsUUID, IsOptional, IsEnum } from 'class-validator';

export class CreateConsultationDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  @IsOptional()
  doctorId?: string;

  @IsUUID()
  @IsOptional()
  appointmentId?: string; // Link to appointment if created from appointment

  @IsString()
  @IsEnum(['INITIAL', 'REVIEW', 'FOLLOW_UP', 'PRE_OP'])
  visitType: string;

  @IsString()
  @IsOptional()
  reasonForVisit?: string;

  @IsString()
  @IsOptional()
  chiefComplaint?: string;
}




