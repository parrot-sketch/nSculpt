import { IsString, IsEmail, IsOptional } from 'class-validator';

/**
 * Update Patient Self DTO
 * 
 * Restricted fields for patient self-updates.
 * Only allows demographic and contact information.
 * 
 * EXCLUDED (for security):
 * - Clinical fields (bloodType, allergies, chronicConditions)
 * - Restricted fields (restricted, restrictedReason, etc.)
 * - System fields (id, createdAt, lifecycleState, version, etc.)
 * - Doctor assignments (doctorInChargeId)
 */
export class UpdatePatientSelfDto {
  // Demographics
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  middleName?: string;

  // Contact
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
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

  // Additional info
  @IsString()
  @IsOptional()
  occupation?: string;

  // Next of Kin Information
  @IsString()
  @IsOptional()
  nextOfKinName?: string;

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

  // Legacy fields
  @IsString()
  @IsOptional()
  emergencyContactName?: string;

  @IsString()
  @IsOptional()
  emergencyContactPhone?: string;
}
