import { IsOptional, IsString, IsBoolean, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Department Query DTO
 * 
 * Query parameters for listing departments with filters and pagination.
 */
export class DepartmentQueryDto {
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









