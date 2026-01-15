import { IsNumber, IsString, IsOptional, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Update Fee Schedule Item DTO
 * 
 * Validation for updating fee schedule item information.
 */
export class UpdateFeeScheduleItemDto {
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsDateString()
  @IsOptional()
  expirationDate?: string;
}









