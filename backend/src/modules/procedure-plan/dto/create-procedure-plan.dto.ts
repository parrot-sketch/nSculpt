import { IsString, IsUUID, IsOptional, IsEnum, IsInt, IsBoolean, Min } from 'class-validator';
import { ProcedurePlanType } from '../types/procedure-plan-types';

export class CreateProcedurePlanDto {
  @IsUUID()
  consultationId: string;

  @IsUUID()
  surgeonId: string;

  @IsString()
  procedureName: string;

  @IsString()
  @IsOptional()
  procedureCode?: string;

  @IsString()
  @IsOptional()
  procedureDescription?: string;

  @IsEnum(ProcedurePlanType)
  planType: ProcedurePlanType;

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
