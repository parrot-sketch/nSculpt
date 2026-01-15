import { IsString, IsUUID, IsOptional, IsInt, Min } from 'class-validator';

export class CreateFollowUpPlanDto {
  @IsUUID()
  consultationId: string;

  @IsUUID()
  doctorId: string;

  @IsString()
  followUpType: string; // REVIEW, POST_OP, SERIES_SESSION, GENERAL

  @IsInt()
  @Min(1)
  @IsOptional()
  intervalDays?: number;

  @IsString()
  @IsOptional()
  reason?: string;
}
