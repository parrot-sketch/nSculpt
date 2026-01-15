import { IsString, IsUUID, IsDateString, IsOptional, IsInt, ValidateNested, IsEmail, IsPhoneNumber } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for creating a new patient during appointment booking
 */
export class NewPatientDataDto {
    @IsString()
    firstName: string;

    @IsString()
    lastName: string;

    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsDateString()
    @IsOptional()
    dateOfBirth?: string;

    @IsString()
    @IsOptional()
    gender?: string;

    @IsString()
    @IsOptional()
    address?: string;
}

/**
 * DTO for booking appointment for a new patient
 */
export class BookAppointmentForNewPatientDto {
    @ValidateNested()
    @Type(() => NewPatientDataDto)
    patientData: NewPatientDataDto;

    @IsUUID()
    doctorId: string;

    @IsDateString()
    scheduledDate: string;

    @IsDateString()
    scheduledStartTime: string;

    @IsDateString()
    scheduledEndTime: string;

    @IsInt()
    @IsOptional()
    estimatedDurationMinutes?: number;

    @IsString()
    appointmentType: string; // CONSULTATION, FOLLOW_UP, PRE_OP, POST_OP, EMERGENCY

    @IsString()
    @IsOptional()
    reason?: string;

    @IsString()
    @IsOptional()
    notes?: string;
}

/**
 * DTO for booking appointment for existing patient
 */
export class BookAppointmentForExistingPatientDto {
    @IsUUID()
    patientId: string;

    @IsUUID()
    doctorId: string;

    @IsDateString()
    scheduledDate: string;

    @IsDateString()
    scheduledStartTime: string;

    @IsDateString()
    scheduledEndTime: string;

    @IsInt()
    @IsOptional()
    estimatedDurationMinutes?: number;

    @IsString()
    appointmentType: string;

    @IsString()
    @IsOptional()
    reason?: string;

    @IsString()
    @IsOptional()
    notes?: string;
}

/**
 * DTO for scheduling appointment from procedure plan
 */
export class ScheduleFromProcedurePlanDto {
    @IsUUID()
    procedurePlanId: string;

    @IsDateString()
    scheduledDate: string;

    @IsDateString()
    scheduledStartTime: string;

    @IsDateString()
    scheduledEndTime: string;

    @IsInt()
    @IsOptional()
    estimatedDurationMinutes?: number;

    @IsString()
    @IsOptional()
    notes?: string;
}

/**
 * DTO for scheduling appointment from follow-up plan
 */
export class ScheduleFromFollowUpPlanDto {
    @IsUUID()
    followUpPlanId: string;

    @IsDateString()
    scheduledDate: string;

    @IsDateString()
    scheduledStartTime: string;

    @IsDateString()
    scheduledEndTime: string;

    @IsInt()
    @IsOptional()
    estimatedDurationMinutes?: number;

    @IsString()
    @IsOptional()
    notes?: string;
}

/**
 * DTO for rescheduling appointment
 */
export class RescheduleAppointmentDto {
    @IsDateString()
    scheduledDate: string;

    @IsDateString()
    scheduledStartTime: string;

    @IsDateString()
    scheduledEndTime: string;

    @IsString()
    reason: string;

    @IsString()
    @IsOptional()
    notes?: string;
}

/**
 * DTO for cancelling appointment
 */
export class CancelAppointmentBookingDto {
    @IsString()
    reason: string;

    @IsString()
    @IsOptional()
    notes?: string;
}
