import { IsString, IsOptional, MaxLength, MinLength, IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Create Billing Code DTO
 * 
 * Validation for creating a new billing code (CPT, ICD-10, HCPCS).
 */
export class CreateBillingCodeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code: string;

  @IsEnum(['CPT', 'ICD10', 'HCPCS'])
  codeType: 'CPT' | 'ICD10' | 'HCPCS';

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  description: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(0)
  defaultCharge?: number;
}









