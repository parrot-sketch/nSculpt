/**
 * Complete Consultation DTO
 * 
 * Input for completing a consultation with final diagnosis and follow-up requirements.
 * 
 * @application-layer
 */

import {
  IsString,
  IsBoolean,
  IsOptional,
  IsDateString,
  MaxLength,
  ValidateIf,
  IsInt,
  Min,
} from 'class-validator';

export class CompleteConsultationDto {
  @IsString()
  @MaxLength(2000)
  diagnosis: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  followUpRequired?: boolean;

  @ValidateIf((o) => o.followUpRequired === true)
  @IsDateString()
  followUpDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;
}


