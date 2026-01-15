import {
  IsString,
  IsEmail,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  Max,
  MinLength,
  Matches,
} from 'class-validator';

/**
 * Patient Self-Registration DTO
 * 
 * Used for patient self-registration workflow (privacy-first).
 * Patient enters their own information, reducing privacy exposure.
 * 
 * After registration:
 * 1. Patient record is created
 * 2. Patient user account is created (for portal access)
 * 3. Confirmation email is sent
 * 4. Patient can log in to portal
 */
export class SelfRegisterPatientDto {
  // Personal Information
  @IsString()
  @MinLength(2)
  firstName: string;

  @IsString()
  @MinLength(2)
  lastName: string;

  @IsString()
  @IsOptional()
  middleName?: string;

  @IsDateString()
  dateOfBirth: string; // Required field

  @IsString()
  @IsOptional()
  gender?: string;

  // Contact Information
  @IsEmail()
  email: string; // Required for account creation

  @IsString()
  @IsOptional()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be in international format',
  })
  phone?: string;

  @IsString()
  @IsOptional()
  whatsapp?: string;

  // Address
  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  zipCode?: string;

  @IsString()
  @IsOptional()
  country?: string;

  // Account Credentials (for patient portal)
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  // Optional Medical Information (can be updated later)
  @IsString()
  @IsOptional()
  bloodType?: string;

  @IsString()
  @IsOptional()
  allergies?: string;

  @IsString()
  @IsOptional()
  chronicConditions?: string;

  // Emergency Contact / Next of Kin
  @IsString()
  @IsOptional()
  nextOfKinFirstName?: string;

  @IsString()
  @IsOptional()
  nextOfKinLastName?: string;

  @IsString()
  @IsOptional()
  nextOfKinRelationship?: string;

  @IsString()
  @IsOptional()
  nextOfKinContact?: string;
}






