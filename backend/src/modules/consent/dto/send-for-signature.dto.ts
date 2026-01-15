import { IsUUID, IsOptional, IsString, IsInt, Min } from 'class-validator';

/**
 * DTO for moving a consent to the signing stage
 * When admin/doctor confirms, status changes to READY_FOR_SIGNATURE
 */
export class SendForSignatureDto {
  @IsUUID()
  consentId: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  version?: number; // For optimistic locking

  @IsString()
  @IsOptional()
  notes?: string; // Optional notes about sending for signature
}

