import { IsOptional, IsString, IsBoolean, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Vendor Query DTO
 * 
 * Query parameters for listing vendors with filters and pagination.
 */
export class VendorQueryDto {
  @IsString()
  @IsOptional()
  search?: string; // Search by code or name

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









