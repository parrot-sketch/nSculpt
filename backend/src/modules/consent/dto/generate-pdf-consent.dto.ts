import {
  IsUUID,
  IsString,
  IsOptional,
  IsObject,
} from 'class-validator';

/**
 * DTO for generating a patient-specific consent from a PDF template
 * Triggered from Consultation page - preloads patient + consultation data
 */
export class GeneratePDFConsentDto {
  @IsUUID()
  templateId: string;

  @IsUUID()
  patientId: string;

  @IsUUID()
  @IsOptional()
  consultationId?: string;

  /**
   * Placeholder values to merge into PDF template
   * Key-value pairs where key is placeholder name (e.g., "PATIENT_NAME")
   * and value is the actual value to insert
   */
  @IsObject()
  @IsOptional()
  placeholderValues?: Record<string, string>;
}









