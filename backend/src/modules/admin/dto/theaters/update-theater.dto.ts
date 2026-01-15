import { IsString, IsInt, IsOptional, Min, MaxLength, MinLength } from 'class-validator';

/**
 * Update Operating Theater DTO
 * 
 * Validation for updating theater information.
 * Note: code and departmentId cannot be changed.
 */
export class UpdateTheaterDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;
}









