import { IsUUID, IsString, IsEnum, IsOptional } from 'class-validator';

export enum ConsentPartyType {
  PATIENT = 'PATIENT',
  GUARDIAN = 'GUARDIAN',
  SURGEON = 'SURGEON',
  ANESTHESIOLOGIST = 'ANESTHESIOLOGIST',
  WITNESS = 'WITNESS',
  ADMIN = 'ADMIN',
}

export enum SignatureMethod {
  DIGITAL = 'DIGITAL',
  ELECTRONIC = 'ELECTRONIC',
  PHYSICAL = 'PHYSICAL',
}

export class SignConsentDto {
  @IsUUID()
  instanceId: string;

  @IsEnum(ConsentPartyType)
  partyType: ConsentPartyType;

  @IsEnum(SignatureMethod)
  signatureMethod: SignatureMethod;

  @IsString()
  @IsOptional()
  signatureData?: string; // Base64 signature image

  @IsString()
  @IsOptional()
  deviceType?: string;

  @IsString()
  @IsOptional()
  guardianRelationship?: string; // For guardian signatures

  @IsUUID()
  @IsOptional()
  guardianConsentFor?: string; // Patient ID if guardian signing for minor

  @IsString()
  @IsOptional()
  notes?: string;
}









