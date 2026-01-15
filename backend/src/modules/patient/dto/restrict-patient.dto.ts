import { IsString, MinLength } from 'class-validator';

/**
 * DTO for restricting a patient (marking as privacy-sensitive)
 * 
 * This is a sensitive operation that should only be performed by ADMIN users.
 * Restricting a patient marks them as privacy-sensitive (VIP, celebrity, etc.).
 */
export class RestrictPatientDto {
  /**
   * Reason for restriction (required for audit trail)
   * Must be at least 10 characters to ensure meaningful documentation
   */
  @IsString()
  @MinLength(10, {
    message: 'Reason must be at least 10 characters to ensure meaningful documentation for audit purposes',
  })
  reason: string;
}









