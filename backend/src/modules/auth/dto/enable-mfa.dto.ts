import { IsString, IsOptional } from 'class-validator';

export class EnableMfaDto {
  @IsString()
  @IsOptional()
  reason?: string; // Optional reason for audit log
}
