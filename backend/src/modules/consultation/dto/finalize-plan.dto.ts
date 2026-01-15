import { IsString, IsOptional, IsObject, IsEnum, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ConsultationOutcome } from '../types/consultation-outcome';
import { ProcedurePlanType } from '../../procedure-plan/types/procedure-plan-types';

export class CreateProcedurePlanDto {
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
  sessionIntervalDays?: number;

  @IsString()
  @IsOptional()
  sessionDetails?: string;

  @IsOptional()
  followUpRequired?: boolean;

  @IsOptional()
  followUpIntervalDays?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateFollowUpPlanDto {
  @IsString()
  followUpType: string; // REVIEW, POST_OP, SERIES_SESSION, GENERAL

  @IsOptional()
  intervalDays?: number;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class FinalizePlanDto {
  @IsEnum(ConsultationOutcome)
  outcome: ConsultationOutcome;

  @IsString()
  @IsOptional()
  clinicalSummary?: string;

  @IsObject()
  @IsOptional()
  diagnoses?: Record<string, any>;

  @ValidateNested()
  @Type(() => CreateProcedurePlanDto)
  @IsOptional()
  procedurePlan?: CreateProcedurePlanDto;

  @ValidateNested()
  @Type(() => CreateFollowUpPlanDto)
  @IsOptional()
  followUpPlan?: CreateFollowUpPlanDto;
}
