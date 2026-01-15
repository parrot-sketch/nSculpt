import { IsEnum, IsString, IsOptional } from 'class-validator';
import { AppointmentStatus } from '@prisma/client';

export class UpdateAppointmentStatusDto {
    @IsEnum(AppointmentStatus)
    status: AppointmentStatus;

    @IsString()
    @IsOptional()
    notes?: string;
}
