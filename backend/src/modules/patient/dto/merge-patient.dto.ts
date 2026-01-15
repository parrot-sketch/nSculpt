import { IsUUID, IsString, IsOptional, MinLength } from 'class-validator';

/**
 * DTO for merging two patients (duplicate resolution)
 * 
 * This is a sensitive operation that should only be performed by ADMIN users.
 * The source patient (duplicate) will be merged into the target patient (primary).
 */
export class MergePatientDto {
  /**
   * ID of the source patient (duplicate that will be archived)
   * This patient will be marked as merged and archived.
   */
  @IsUUID()
  sourcePatientId: string;

  /**
   * Optional reason for the merge
   * Recommended for audit trail, but not required
   */
  @IsString()
  @IsOptional()
  @MinLength(5, { message: 'Reason must be at least 5 characters if provided' })
  reason?: string;
}









