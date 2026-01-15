import { IsString, IsOptional, IsObject, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for creating/starting a patient intake
 * 
 * Clinical Intent: Patient begins filling out intake forms
 */
export class CreatePatientIntakeDto {
  @IsString()
  @IsOptional()
  notes?: string; // Initial notes or medical history summary

  @IsObject()
  @IsOptional()
  medicalHistory?: Record<string, any>; // Structured medical history data

  @IsArray()
  @IsOptional()
  allergies?: string[]; // List of known allergies

  @IsArray()
  @IsOptional()
  medications?: string[]; // Current medications

  @IsArray()
  @IsOptional()
  chronicConditions?: string[]; // Chronic medical conditions
}
