import { PartialType } from '@nestjs/mapped-types';
import { IsString, IsOptional, IsObject, IsArray, IsInt, Min } from 'class-validator';
import { CreatePatientIntakeDto } from './create-patient-intake.dto';

/**
 * DTO for updating/saving a patient intake draft
 * 
 * Clinical Intent: Patient saves progress on intake forms
 */
export class UpdatePatientIntakeDto extends PartialType(CreatePatientIntakeDto) {
  /**
   * Version number for optimistic locking
   * Client must send current version to prevent lost updates
   */
  @IsInt()
  @Min(1)
  @IsOptional()
  version?: number;
}
