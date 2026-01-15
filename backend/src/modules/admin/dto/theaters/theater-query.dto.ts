import { IsOptional, IsString, IsBoolean, IsUUID, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Theater Query DTO
 * 
 * Query parameters for listing theaters with filters and pagination.
 */
export class TheaterQueryDto {
  @IsString()
  @IsOptional()
  search?: string; // Search by code or name

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  active?: boolean;

  @IsUUID()
  @IsOptional()
  departmentId?: string;

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









