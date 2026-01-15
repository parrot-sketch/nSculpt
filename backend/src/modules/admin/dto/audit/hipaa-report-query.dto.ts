import { IsDateString, IsOptional, IsUUID, IsString } from 'class-validator';

/**
 * HIPAA Access Report Query DTO
 * 
 * Query parameters for generating HIPAA access reports.
 * AC-005: Generate HIPAA Access Report
 */
export class HipaaReportQueryDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  resourceType?: string;
}









