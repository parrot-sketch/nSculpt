import { IsString, IsEmail, IsOptional, IsUUID, IsBoolean, MinLength } from 'class-validator';
import { Prisma } from '@prisma/client';

/**
 * Create User DTO
 * 
 * Derived from Prisma.UserCreateInput to ensure type safety.
 * Only includes fields that should be set during user creation.
 * 
 * Security Notes:
 * - Password is set separately via password reset
 * - createdBy/updatedBy set automatically from authenticated admin
 * - id, createdAt, updatedAt are auto-generated
 */
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  firstName: string;

  @IsString()
  @MinLength(1)
  lastName: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  employeeId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  // Note: departmentId is not part of Prisma.UserCreateInput's direct fields
  // (it uses 'department' relation), but we accept it here and map it in the repository
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @IsUUID()
  @IsOptional()
  roleId?: string;

  @IsBoolean()
  @IsOptional()
  isTheaterEligible?: boolean;
}

