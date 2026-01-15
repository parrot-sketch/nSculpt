import { IsDateString, IsOptional, IsUUID } from 'class-validator';

/**
 * User Activity Report Query DTO
 * 
 * Query parameters for generating user activity reports.
 * DR-002: View User Activity Report
 */
export class UserActivityQueryDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsUUID()
  @IsOptional()
  userId?: string;
}









