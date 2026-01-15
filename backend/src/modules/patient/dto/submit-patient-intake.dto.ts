import { IsString, IsOptional, IsObject, IsArray, IsBoolean } from 'class-validator';

/**
 * DTO for submitting a completed patient intake
 * 
 * Clinical Intent: Patient submits completed intake forms for staff review
 */
export class SubmitPatientIntakeDto {
  @IsBoolean()
  isComplete: boolean; // Patient attests that intake is complete

  @IsString()
  @IsOptional()
  patientAttestation?: string; // Optional patient signature/attestation text
}
