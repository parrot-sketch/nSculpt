import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsUrl,
} from 'class-validator';

/**
 * DTO for creating a PDF-based consent template
 * Admin uploads PDF and defines placeholders for merging
 */
export class CreatePDFTemplateDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  fileUrl?: string; // URL to uploaded PDF file

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  placeholders?: string[]; // List of placeholder field codes: ["PATIENT_NAME", "DATE", "PROCEDURE_NAME", etc.]

  @IsBoolean()
  @IsOptional()
  active?: boolean; // Default: true
}









