import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

/**
 * Create Department DTO
 * 
 * Validation for creating a new department.
 */
export class CreateDepartmentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}









