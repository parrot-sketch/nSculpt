import { IsOptional, IsString, IsBoolean, IsInt, Min, Max, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * User Query DTO
 * 
 * Used for filtering and paginating user lists.
 */
export class UserQueryDto {
  @IsOptional()
  @IsString()
  search?: string; // Search by email, firstName, lastName, employeeId

  @IsOptional()
  @IsString()
  roleCode?: string; // Filter by role code (e.g., "ADMIN", "DOCTOR")

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean; // Filter by active status

  @IsOptional()
  @IsUUID()
  departmentId?: string; // Filter by department

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  skip?: number = 0;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  take?: number = 20;
}

