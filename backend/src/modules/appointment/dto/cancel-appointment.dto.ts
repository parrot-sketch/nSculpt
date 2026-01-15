import { IsString, IsEnum, IsOptional, MinLength } from 'class-validator';

/**
 * Cancel Appointment DTO
 * 
 * Used to cancel an appointment.
 * Different policies apply based on payment status.
 */
export class CancelAppointmentDto {
  @IsEnum([
    'PATIENT_REQUEST',
    'DOCTOR_UNAVAILABLE',
    'EMERGENCY',
    'WEATHER',
    'OTHER',
  ])
  cancellationReason: string;

  @IsString()
  @IsOptional()
  @MinLength(10, { message: 'Cancellation notes must be at least 10 characters' })
  cancellationNotes?: string;

  @IsString()
  @IsOptional()
  refundRequested?: boolean; // If patient requests refund (if payment was made)
}






