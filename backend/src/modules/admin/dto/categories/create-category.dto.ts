import { IsString, IsUUID, IsOptional, MaxLength, MinLength } from 'class-validator';

/**
 * Create Inventory Category DTO
 * 
 * Validation for creating a new inventory category.
 * Supports hierarchical categories via parentId.
 */
export class CreateCategoryDto {
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

  @IsUUID()
  @IsOptional()
  parentId?: string; // For hierarchical categories
}









