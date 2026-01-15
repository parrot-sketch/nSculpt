import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

/**
 * Update Inventory Category DTO
 * 
 * Validation for updating category information.
 * Note: code and parentId cannot be changed (would break hierarchy).
 */
export class UpdateCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;
}









