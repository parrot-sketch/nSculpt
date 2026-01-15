import {
    IsString,
    IsUUID,
    IsOptional,
    IsEnum,
} from 'class-validator';

/**
 * Request Appointment DTO
 * 
 * Used for patients to initiate an appointment request.
 * Does NOT include date or time slots.
 */
export class RequestAppointmentDto {
    @IsUUID()
    doctorId: string;

    @IsString()
    @IsEnum(['CONSULTATION', 'FOLLOW_UP', 'PRE_OP', 'POST_OP', 'EMERGENCY'])
    appointmentType: string;

    @IsString()
    @IsOptional()
    reason?: string; // Patient's reason for appointment

    @IsString()
    @IsOptional()
    serviceCode?: string; // The primary clinical service area in focus
}
