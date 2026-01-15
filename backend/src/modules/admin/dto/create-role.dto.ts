import { IsString, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';
import { Prisma } from '@prisma/client';

/**
 * Create Role DTO
 * 
 * Derived from Prisma.RoleCreateInput to ensure type safety.
 * 
 * Security Notes:
 * - Role code must be unique and uppercase (e.g., "ADMIN", "DOCTOR")
 * - createdBy/updatedBy set automatically from authenticated admin
 */
export class CreateRoleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message: 'Role code must be uppercase letters, numbers, and underscores only (e.g., "ADMIN", "DOCTOR_LEVEL_1")',
  })
  code: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  isActive?: boolean = true;
}





