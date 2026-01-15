import { IsString, IsOptional, IsDateString, IsInt, Min, Max } from 'class-validator';

export class AuditLogQueryDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  resourceType?: string;

  @IsString()
  @IsOptional()
  resourceId?: string;


  @IsString()
  @IsOptional()
  action?: string;

  @IsString()
  @IsOptional()
  sessionId?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  skip?: number;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  take?: number;
}
