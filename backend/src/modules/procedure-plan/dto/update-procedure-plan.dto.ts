import { IsString, IsOptional, IsEnum, IsInt, IsBoolean, IsDateString, Min } from 'class-validator';
import { ProcedurePlanType, ProcedurePlanStatus } from '../types/procedure-plan-types';

export class UpdateProcedurePlanDto {
  @IsString()
  @IsOptional()
  procedureName?: string;

  @IsString()
  @IsOptional()
  procedureCode?: string;

  @IsString()
  @IsOptional()
  procedureDescription?: string;

  @IsEnum(ProcedurePlanType)
  @IsOptional()
  planType?: ProcedurePlanType;

  @IsInt()
  @Min(1)
  @IsOptional()
  sessionCount?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  currentSession?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  sessionIntervalDays?: number;

  @IsString()
  @IsOptional()
  sessionDetails?: string;

  @IsDateString()
  @IsOptional()
  plannedDate?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  estimatedDurationMinutes?: number;

  @IsString()
  @IsOptional()
  complexity?: string;

  @IsBoolean()
  @IsOptional()
  followUpRequired?: boolean;

  @IsInt()
  @Min(1)
  @IsOptional()
  followUpIntervalDays?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  preoperativeNotes?: string;
}
