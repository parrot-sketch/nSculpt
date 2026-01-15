import { IsString, IsUUID, IsOptional, IsInt, IsDateString, Min } from 'class-validator';

export class UpdateFollowUpPlanDto {
  @IsString()
  @IsOptional()
  followUpType?: string;

  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  intervalDays?: number;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsUUID()
  @IsOptional()
  appointmentId?: string;
}
