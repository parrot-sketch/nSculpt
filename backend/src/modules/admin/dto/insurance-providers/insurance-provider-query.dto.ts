import { IsOptional, IsString, IsBoolean, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Insurance Provider Query DTO
 * 
 * Query parameters for listing insurance providers with filters and pagination.
 */
export class InsuranceProviderQueryDto {
  @IsString()
  @IsOptional()
  search?: string; // Search by code, name, or payerId

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  active?: boolean;

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









