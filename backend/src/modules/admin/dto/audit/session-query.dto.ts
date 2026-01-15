import { IsOptional, IsString, IsUUID, IsBoolean, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Session Query DTO
 * 
 * Query parameters for listing user sessions with filters and pagination.
 * AC-003: View User Sessions
 */
export class SessionQueryDto {
  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  active?: boolean; // Not revoked and not expired

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  revoked?: boolean;

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









