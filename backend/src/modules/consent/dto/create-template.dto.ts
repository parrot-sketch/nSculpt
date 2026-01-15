import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ConsentTemplateType {
  GENERAL = 'GENERAL',
  PROCEDURE_SPECIFIC = 'PROCEDURE_SPECIFIC',
}

export class FillInFieldDefinitionDto {
  @IsString()
  fieldCode: string;

  @IsString()
  label: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  fieldType?: string; // TEXT, NUMBER, DATE, etc.

  @IsBoolean()
  @IsOptional()
  required?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;

  @IsUUID()
  @IsOptional()
  sectionId?: string;

  @IsUUID()
  @IsOptional()
  clauseId?: string;
}

export class ClauseDefinitionDto {
  @IsString()
  clauseCode: string;

  @IsString()
  content: string;

  @IsString()
  @IsOptional()
  plainLanguageContent?: string;

  @IsInt()
  @Min(0)
  order: number;

  @IsUUID()
  sectionId: string;
}

export class SectionDefinitionDto {
  @IsString()
  sectionCode: string;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  plainLanguageContent?: string;

  @IsBoolean()
  @IsOptional()
  requiresUnderstandingCheck?: boolean;

  @IsString()
  @IsOptional()
  understandingCheckPrompt?: string;

  @IsInt()
  @Min(0)
  order: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClauseDefinitionDto)
  @IsOptional()
  clauses?: ClauseDefinitionDto[];
}

export class PageDefinitionDto {
  @IsInt()
  @Min(1)
  pageNumber: number;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsArray()
  @IsOptional()
  sectionIds?: string[]; // Sections on this page
}

export class RequiredPartyDefinitionDto {
  @IsString()
  partyType: string; // PATIENT, SURGEON, ANESTHESIOLOGIST, WITNESS, etc.

  @IsBoolean()
  required: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}

export class CreateConsentTemplateDto {
  @IsString()
  templateCode: string; // e.g., "GENERAL_CONSENT_V1"

  @IsString()
  name: string; // e.g., "General Surgery Consent"

  @IsEnum(ConsentTemplateType)
  templateType: ConsentTemplateType;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  procedureCode?: string; // CPT code if procedure-specific

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  applicableCPTCodes?: string[]; // Multiple CPT codes

  // Original document reference
  @IsString()
  @IsOptional()
  originalDocumentPath?: string; // Path to uploaded PDF

  @IsString()
  @IsOptional()
  originalDocumentHash?: string; // SHA-256 hash

  // Structure
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PageDefinitionDto)
  pages: PageDefinitionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionDefinitionDto)
  sections: SectionDefinitionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequiredPartyDefinitionDto)
  requiredParties: RequiredPartyDefinitionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FillInFieldDefinitionDto)
  @IsOptional()
  fillInFields?: FillInFieldDefinitionDto[];

  // Metadata
  @IsString()
  @IsOptional()
  language?: string; // Default: 'en'

  @IsBoolean()
  @IsOptional()
  isActive?: boolean; // Default: true
}

