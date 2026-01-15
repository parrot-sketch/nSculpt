import { IsUUID, IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class CreatePageAcknowledgementDto {
  @IsUUID()
  instanceId: string;

  @IsUUID()
  pageId: string;

  @IsString()
  @IsOptional()
  initialsData?: string; // Base64 signature

  @IsInt()
  @IsOptional()
  @Min(0)
  timeSpentSeconds?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(100)
  scrollDepth?: number; // 0-100 percentage

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  userAgent?: string;

  @IsString()
  @IsOptional()
  deviceType?: string;
}









