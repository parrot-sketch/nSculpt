import { IsOptional, IsString, IsEnum } from 'class-validator';
import { Domain } from '@prisma/client';

/**
 * Permission Usage Report Query DTO
 * 
 * Query parameters for generating permission usage reports.
 * DR-003: View Permission Usage Report
 */
export class PermissionUsageQueryDto {
  @IsEnum(Domain)
  @IsOptional()
  domain?: Domain;

  @IsString()
  @IsOptional()
  permissionId?: string;
}









