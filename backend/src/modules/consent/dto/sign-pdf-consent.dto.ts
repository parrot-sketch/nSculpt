import {
  IsUUID,
  IsString,
  IsEnum,
  IsOptional,
  IsUrl,
} from 'class-validator';

/**
 * Signer types for PDF consent signatures
 */
export enum PDFSignerType {
  PATIENT = 'PATIENT',
  GUARDIAN = 'GUARDIAN',
  DOCTOR = 'DOCTOR',
  NURSE_WITNESS = 'NURSE_WITNESS',
  ADMIN = 'ADMIN',
}

/**
 * DTO for signing a PDF consent
 * Supports multiple signers (patient, witness, doctor, etc.)
 */
export class SignPDFConsentDto {
  @IsUUID()
  consentId: string;

  @IsEnum(PDFSignerType)
  signerType: PDFSignerType;

  @IsString()
  signerName: string; // Full name of signer

  @IsUUID()
  @IsOptional()
  signerId?: string; // User ID if signer is a system user

  @IsString()
  @IsOptional()
  @IsUrl()
  signatureUrl?: string; // URL to signature image/data

  @IsString()
  @IsOptional()
  ipAddress?: string; // IPv4 or IPv6

  @IsString()
  @IsOptional()
  deviceInfo?: string; // Device information if available

  @IsOptional()
  overrideFlag?: boolean; // Admin override flag

  @IsString()
  @IsOptional()
  overrideReason?: string; // Admin override reason
}

