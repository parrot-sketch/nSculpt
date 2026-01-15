/**
 * Update Consultation DTO
 * 
 * Input for updating clinical findings during active consultation.
 * 
 * @application-layer
 */

import { IsString, IsOptional, MaxLength, IsInt, Min } from 'class-validator';

export class UpdateConsultationDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  chiefComplaint?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  diagnosis?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;
}


