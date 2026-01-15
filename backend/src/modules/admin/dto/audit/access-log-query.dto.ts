import { IsOptional, IsString, IsUUID, IsBoolean, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Access Log Query DTO
 * 
 * Query parameters for listing data access logs with filters and pagination.
 * AC-001: View Data Access Logs
 */
export class AccessLogQueryDto {
  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  resourceType?: string;

  @IsUUID()
  @IsOptional()
  resourceId?: string;

  @IsString()
  @IsOptional()
  action?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  accessedPHI?: boolean;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  success?: boolean;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  skip?: number = 0;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  take?: number = 50;
}









