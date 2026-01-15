import { IsUUID, IsDateString, IsOptional } from 'class-validator';

/**
 * Assign Role to User DTO
 * 
 * Used when admin assigns a role to a user.
 * Supports time-bound role assignments.
 */
export class AssignRoleDto {
  @IsUUID()
  roleId: string;

  @IsDateString()
  @IsOptional()
  validFrom?: string; // ISO date string, defaults to now

  @IsDateString()
  @IsOptional()
  validUntil?: string; // ISO date string, optional (no expiry)
}










