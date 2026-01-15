import { IsString, IsUUID, IsOptional, IsInt, Min, MaxLength, MinLength } from 'class-validator';

/**
 * Create Operating Theater DTO
 * 
 * Validation for creating a new operating theater.
 */
export class CreateTheaterDto {
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
  departmentId: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;
}









