import { IsString, IsOptional } from 'class-validator';

export class RecordAdministrationDto {
  @IsString()
  dosageGiven: string;

  @IsString()
  route: string; // ORAL, IV, IM, etc.

  @IsString()
  @IsOptional()
  response?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}









