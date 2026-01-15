import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

/**
 * Update Department DTO
 * 
 * Validation for updating department information.
 * Note: code cannot be changed (immutable identifier).
 */
export class UpdateDepartmentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;
}









