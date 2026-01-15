import { IsString, IsOptional, IsBoolean } from 'class-validator';

/**
 * DTO for verifying a patient intake
 * 
 * Clinical Intent: Nurse/Admin reviews and verifies intake forms
 */
export class VerifyPatientIntakeDto {
  @IsString()
  reason: string; // Required reason for verification (clinical requirement)

  @IsBoolean()
  @IsOptional()
  approved?: boolean; // Default true, but can be set to false if issues found

  @IsString()
  @IsOptional()
  verificationNotes?: string; // Notes from staff review
}
