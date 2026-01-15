import { IsString, IsOptional, MaxLength, MinLength, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Update Billing Code DTO
 * 
 * Validation for updating billing code information.
 * Note: code and codeType cannot be changed (immutable identifiers).
 */
export class UpdateBillingCodeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  @IsOptional()
  description?: string;

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









