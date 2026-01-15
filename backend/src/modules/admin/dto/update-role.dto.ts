import { PartialType } from '@nestjs/mapped-types';
import { CreateRoleDto } from './create-role.dto';
import { IsString, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';

/**
 * Update Role DTO
 * 
 * All fields optional for partial updates.
 * Note: Role code cannot be changed after creation (enforced in service).
 */
export class UpdateRoleDto extends PartialType(CreateRoleDto) {
  // Override code to make it optional but still validate if provided
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message: 'Role code must be uppercase letters, numbers, and underscores only',
  })
  @IsOptional()
  code?: string;
}










