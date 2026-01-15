import { IsString, IsOptional, IsNumber, IsObject } from 'class-validator';

export class UpdateConsultationDto {
  @IsString()
  @IsOptional()
  reasonForVisit?: string;

  @IsString()
  @IsOptional()
  chiefComplaint?: string;

  @IsString()
  @IsOptional()
  clinicalSummary?: string;

  @IsObject()
  @IsOptional()
  diagnoses?: Record<string, any>;

  @IsNumber()
  @IsOptional()
  version?: number; // For optimistic locking
}









