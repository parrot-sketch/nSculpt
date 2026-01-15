import { IsString, IsEnum } from 'class-validator';
import { ConsultationStatus } from '../types/consultation-status';

export class OverrideStateDto {
  @IsEnum(ConsultationStatus)
  newStatus: ConsultationStatus;

  @IsString()
  reason: string; // Required for audit when overriding state machine
}




