import { IsString, MinLength, MaxLength } from 'class-validator';

/**
 * DTO for validating an invitation token
 */
export class ValidateInvitationDto {
  @IsString()
  @MinLength(64, { message: 'Invalid invitation token' })
  @MaxLength(64, { message: 'Invalid invitation token' })
  token: string;
}
