import { IsString, Length } from 'class-validator';

export class MfaLoginDto {
  @IsString()
  tempToken: string; // Short-lived token from initial login

  @IsString()
  @Length(6, 6, { message: 'MFA code must be exactly 6 digits' })
  code: string; // 6-digit TOTP code or 8-character backup code
}
