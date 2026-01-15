import { IsUUID, IsDateString, IsInt, Min, IsOptional } from 'class-validator';

/**
 * DTO for checking available consultation slots
 */
export class AvailableSlotsDto {
  @IsUUID()
  doctorId: string;

  @IsDateString()
  date: string; // YYYY-MM-DD

  @IsInt()
  @Min(15)
  @IsOptional()
  durationMinutes?: number; // Default 30 minutes
}






