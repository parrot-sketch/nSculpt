import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

/**
 * DTO for accepting a patient invitation
 * 
 * Used when patient clicks invitation link and sets their password.
 */
export class AcceptInvitationDto {
  @IsString()
  @MinLength(64, { message: 'Invalid invitation token' })
  @MaxLength(64, { message: 'Invalid invitation token' })
  token: string;

  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  @MaxLength(128, { message: 'Password must be at most 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  password: string;
}
