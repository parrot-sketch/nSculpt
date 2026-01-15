import { IsString, IsOptional, IsUUID } from 'class-validator';

export class ReferConsultationDto {
  @IsString()
  referralReason: string;

  @IsUUID()
  @IsOptional()
  referredToDoctorId?: string;

  @IsString()
  @IsOptional()
  referralNotes?: string;
}









