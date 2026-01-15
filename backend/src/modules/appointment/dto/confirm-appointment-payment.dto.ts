import { IsUUID, IsString, IsOptional } from 'class-validator';

/**
 * Confirm Appointment Payment DTO
 * 
 * Used to confirm payment for an appointment.
 * This changes appointment status from PENDING_PAYMENT to CONFIRMED
 * and blocks the doctor's time slot.
 */
export class ConfirmAppointmentPaymentDto {
  @IsUUID()
  appointmentId: string;

  @IsUUID()
  paymentId: string; // Payment record ID that confirms this appointment

  @IsString()
  @IsOptional()
  notes?: string; // Optional confirmation notes
}






