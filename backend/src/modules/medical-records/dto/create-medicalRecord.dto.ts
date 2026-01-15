import { IsString, IsUUID, IsOptional, IsDateString } from 'class-validator';
import { MedicalRecordCreateInput } from '@/types/prisma-helpers';

/**
 * Create Medical Record DTO
 * 
 * This DTO is derived from Prisma's MedicalRecordCreateInput type,
 * ensuring type safety and consistency with the database schema.
 * 
 * Fields are manually selected from Prisma type to:
 * 1. Exclude auto-generated fields (id, createdAt, etc.)
 * 2. Exclude relations that should be set via separate endpoints
 * 3. Add validation decorators for runtime validation
 * 
 * Note: dateOfBirth is accepted as string (ISO date) but converted to Date
 * in the repository layer to match Prisma's expected type.
 */
export class CreateMedicalRecordDto {
  @IsString()
  recordNumber: string;

  @IsUUID()
  patientId: string;

  /**
   * ISO date string (e.g., "2024-01-01")
   * Will be converted to Date in repository
   */
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  bloodType?: string;
}



