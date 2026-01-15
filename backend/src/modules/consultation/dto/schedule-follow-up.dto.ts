import { IsString, IsOptional, IsDateString } from 'class-validator';

export class ScheduleFollowUpDto {
  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}









