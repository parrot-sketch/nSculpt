import { IsString, IsUUID, IsOptional, IsEnum, IsDateString, MaxLength, MinLength } from 'class-validator';

/**
 * Create Fee Schedule DTO
 * 
 * Validation for creating a new fee schedule.
 */
export class CreateFeeScheduleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['STANDARD', 'INSURANCE', 'CASH_PAY', 'SELF_PAY'])
  scheduleType: 'STANDARD' | 'INSURANCE' | 'CASH_PAY' | 'SELF_PAY';

  @IsUUID()
  @IsOptional()
  insuranceProviderId?: string; // Required if scheduleType is INSURANCE

  @IsDateString()
  effectiveDate: string;

  @IsDateString()
  @IsOptional()
  expirationDate?: string;
}









