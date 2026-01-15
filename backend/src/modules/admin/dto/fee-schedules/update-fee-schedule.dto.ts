import { IsString, IsDateString, IsOptional, MaxLength, MinLength } from 'class-validator';

/**
 * Update Fee Schedule DTO
 * 
 * Validation for updating fee schedule information.
 */
export class UpdateFeeScheduleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  expirationDate?: string;
}









