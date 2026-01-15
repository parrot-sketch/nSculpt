import { IsDateString, IsOptional, IsInt } from 'class-validator';

export class UpdateAppointmentDto {
    @IsDateString()
    @IsOptional()
    scheduledDate?: string;

    @IsDateString()
    @IsOptional()
    scheduledStartTime?: string;

    @IsDateString()
    @IsOptional()
    scheduledEndTime?: string;

    @IsInt()
    @IsOptional()
    estimatedDurationMinutes?: number;
}
