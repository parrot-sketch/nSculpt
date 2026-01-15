import { IsString, IsUUID, IsOptional, IsDateString, IsObject, IsArray } from 'class-validator';

export class CreateConsentDto {
  @IsUUID()
  templateId: string;

  @IsUUID()
  patientId: string;

  @IsUUID()
  @IsOptional()
  consultationId?: string;

  @IsUUID()
  @IsOptional()
  procedurePlanId?: string;

  @IsUUID()
  @IsOptional()
  relatedCaseId?: string;

  @IsUUID()
  @IsOptional()
  relatedRecordId?: string;

  @IsUUID()
  presentedBy: string;

  @IsString()
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  // Optional: Pre-populate fill-in values when creating instance
  @IsArray()
  @IsOptional()
  fillInValues?: Array<{
    fieldCode: string;
    value: string;
  }>;
}




