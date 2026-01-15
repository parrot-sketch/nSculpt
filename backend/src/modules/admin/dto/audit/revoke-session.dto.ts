import { IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * Revoke Session DTO
 * 
 * Validation for revoking a user session.
 * AC-004: Revoke User Session
 */
export class RevokeSessionDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  reason?: string;
}









