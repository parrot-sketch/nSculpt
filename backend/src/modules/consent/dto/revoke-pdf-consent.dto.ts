import { IsUUID, IsString, IsOptional } from 'class-validator';

/**
 * DTO for revoking a PDF consent
 * Once revoked, consent cannot be used but remains in audit trail
 */
export class RevokePDFConsentDto {
  @IsUUID()
  consentId: string;

  @IsString()
  @IsOptional()
  reason?: string; // Reason for revocation
}









