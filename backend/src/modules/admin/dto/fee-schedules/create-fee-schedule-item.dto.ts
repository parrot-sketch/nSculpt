import { IsUUID, IsNumber, IsString, IsOptional, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Create Fee Schedule Item DTO
 * 
 * Validation for adding a billing code + amount to a fee schedule.
 */
export class CreateFeeScheduleItemDto {
  @IsUUID()
  billingCodeId: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  amount: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsDateString()
  @IsOptional()
  effectiveDate?: string;

  @IsDateString()
  @IsOptional()
  expirationDate?: string;
}









