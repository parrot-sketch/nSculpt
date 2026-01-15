import { IsOptional, IsString, IsBoolean, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Billing Code Query DTO
 * 
 * Query parameters for listing billing codes with filters and pagination.
 */
export class BillingCodeQueryDto {
  @IsString()
  @IsOptional()
  search?: string; // Search by code or description

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  active?: boolean;

  @IsEnum(['CPT', 'ICD10', 'HCPCS'])
  @IsOptional()
  codeType?: 'CPT' | 'ICD10' | 'HCPCS';

  @IsString()
  @IsOptional()
  category?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  skip?: number = 0;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  take?: number = 20;
}









