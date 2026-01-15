import { PartialType } from '@nestjs/mapped-types';
import { IsInt, IsOptional, Min } from 'class-validator';
import { CreatePatientDto } from './create-patient.dto';

export class UpdatePatientDto extends PartialType(CreatePatientDto) {
  /**
   * Version number for optimistic locking
   * Client must send current version to prevent lost updates
   * If version mismatch, update will fail with 409 Conflict
   */
  @IsInt()
  @Min(1)
  @IsOptional()
  version?: number;
}




