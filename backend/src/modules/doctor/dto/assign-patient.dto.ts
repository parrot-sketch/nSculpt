import { IsUUID, IsOptional, IsString } from 'class-validator';

export class AssignPatientDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  @IsOptional()
  doctorId?: string; // If not provided, assigns to current doctor

  @IsString()
  @IsOptional()
  reason?: string; // Reason for assignment (e.g., "Initial consultation", "Surgical case")
}

export class UnassignPatientDto {
  @IsUUID()
  patientId: string;

  @IsString()
  @IsOptional()
  reason?: string; // Reason for unassignment
}






