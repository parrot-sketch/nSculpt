import { IsOptional, IsString, IsBoolean, IsUUID, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Fee Schedule Query DTO
 * 
 * Query parameters for listing fee schedules with filters and pagination.
 */
export class FeeScheduleQueryDto {
  @IsString()
  @IsOptional()
  search?: string; // Search by name

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  active?: boolean;

  @IsEnum(['STANDARD', 'INSURANCE', 'CASH_PAY', 'SELF_PAY'])
  @IsOptional()
  scheduleType?: 'STANDARD' | 'INSURANCE' | 'CASH_PAY' | 'SELF_PAY';

  @IsUUID()
  @IsOptional()
  insuranceProviderId?: string;

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









