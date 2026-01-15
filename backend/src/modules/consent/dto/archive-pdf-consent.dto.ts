import { IsUUID, IsString, IsOptional } from 'class-validator';

/**
 * DTO for archiving a PDF consent
 * Archiving is a soft delete - document remains but is marked as archived
 */
export class ArchivePDFConsentDto {
  @IsUUID()
  consentId: string;

  @IsString()
  @IsOptional()
  reason?: string; // Reason for archiving
}









