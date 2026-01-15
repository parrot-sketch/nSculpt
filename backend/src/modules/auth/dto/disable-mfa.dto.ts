import { IsString, Length, IsOptional } from 'class-validator';

export class DisableMfaDto {
  @IsString()
  @Length(6, 6, { message: 'MFA code must be exactly 6 digits' })
  code: string; // 6-digit TOTP code (required for verification)

  @IsString()
  @IsOptional()
  reason?: string; // Optional reason for audit log
}
