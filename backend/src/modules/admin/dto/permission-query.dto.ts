import { IsOptional, IsString, IsEnum } from 'class-validator';
import { Domain } from '@prisma/client';

/**
 * Permission Query DTO
 * 
 * Used for filtering permissions when listing.
 */
export class PermissionQueryDto {
  @IsOptional()
  @IsEnum(Domain)
  domain?: Domain; // Filter by domain (e.g., Domain.MEDICAL_RECORDS)

  @IsOptional()
  @IsString()
  resource?: string; // Filter by resource (e.g., "MedicalRecord")

  @IsOptional()
  @IsString()
  action?: string; // Filter by action (e.g., "read", "write")

  @IsOptional()
  @IsString()
  search?: string; // Search by code, name, or description
}










