import { IsString, IsUUID, IsOptional, IsInt, IsDateString, Min, Max } from 'class-validator';

export class CreateCaseDto {
  @IsString()
  caseNumber: string;

  @IsUUID()
  patientId: string;

  @IsUUID()
  procedurePlanId: string; // REQUIRED: Surgery must be based on approved procedure plan

  @IsString()
  procedureName: string; // Denormalized from ProcedurePlan (for queries)

  @IsString()
  @IsOptional()
  procedureCode?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(10)
  priority?: number;

  @IsInt()
  @IsOptional()
  estimatedDurationMinutes?: number;

  @IsDateString()
  scheduledStartAt: string;

  @IsDateString()
  scheduledEndAt: string;

  @IsUUID()
  @IsOptional()
  primarySurgeonId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}







