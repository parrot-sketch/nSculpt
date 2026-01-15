import { IsUUID } from 'class-validator';

/**
 * Assign Permission to Role DTO
 * 
 * Used when admin assigns a permission to a role.
 */
export class AssignPermissionDto {
  @IsUUID()
  permissionId: string;
}










