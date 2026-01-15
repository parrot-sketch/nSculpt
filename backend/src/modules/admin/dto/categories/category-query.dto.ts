import { IsOptional, IsString, IsBoolean, IsUUID, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Category Query DTO
 * 
 * Query parameters for listing categories with filters and pagination.
 */
export class CategoryQueryDto {
  @IsString()
  @IsOptional()
  search?: string; // Search by code or name

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  active?: boolean;

  @IsUUID()
  @IsOptional()
  parentId?: string; // Filter by parent (null for root categories)

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









