import { IsString, IsOptional, MaxLength, MinLength, IsEmail } from 'class-validator';

/**
 * Update Insurance Provider DTO
 * 
 * Validation for updating insurance provider information.
 * Note: code and payerId cannot be changed (immutable identifiers).
 */
export class UpdateInsuranceProviderDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  taxId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  state?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  zipCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;
}









