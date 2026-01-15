import { IsString, IsEmail, IsOptional, IsDateString, IsUUID, IsInt, Min, Max, IsBoolean, MinLength } from 'class-validator';

export class CreatePatientDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  @IsOptional()
  middleName?: string;

  @IsDateString()
  dateOfBirth: string; // Required field

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(150)
  age?: number; // Optional, can be calculated from DOB

  @IsString()
  @IsOptional()
  gender?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string; // Tel

  @IsString()
  @IsOptional()
  whatsapp?: string; // WhatsApp number

  @IsString()
  @IsOptional()
  occupation?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string; // Defaults to Nairobi

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  zipCode?: string;

  @IsString()
  @IsOptional()
  country?: string; // Defaults to Kenya

  // Next of Kin Information
  @IsString()
  @IsOptional()
  nextOfKinName?: string; // Full name or firstName + lastName

  @IsString()
  @IsOptional()
  nextOfKinFirstName?: string;

  @IsString()
  @IsOptional()
  nextOfKinLastName?: string;

  @IsString()
  @IsOptional()
  nextOfKinRelationship?: string; // Relation to next of kin

  @IsString()
  @IsOptional()
  nextOfKinContact?: string; // Contact for next of kin

  // Doctor in Charge (assigned, not provided by patient)
  @IsUUID()
  @IsOptional()
  doctorInChargeId?: string;

  // Medical information
  @IsString()
  @IsOptional()
  bloodType?: string; // A+, B-, O+, etc.

  @IsString()
  @IsOptional()
  allergies?: string; // Comma-separated or JSON

  @IsString()
  @IsOptional()
  chronicConditions?: string; // Comma-separated or JSON

  // Legacy fields for backward compatibility
  @IsString()
  @IsOptional()
  emergencyContactName?: string;

  @IsString()
  @IsOptional()
  emergencyContactPhone?: string;

  // User Account Creation (for FrontDesk workflow)
  @IsBoolean()
  @IsOptional()
  createUserAccount?: boolean; // Flag to create user account

  @IsString()
  @IsOptional()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password?: string; // Password for user account (required if createUserAccount is true)
}
