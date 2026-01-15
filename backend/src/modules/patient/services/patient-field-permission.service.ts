import { Injectable, ForbiddenException } from '@nestjs/common';
import { IdentityContextService } from '../../../modules/auth/services/identityContext.service';

/**
 * Patient Field Permission Service
 * 
 * Enforces field-level permissions for patient updates based on user roles.
 * 
 * Field Categories:
 * - Demographics: Name, DOB, contact info, address (Front Desk can edit)
 * - Clinical: Blood type, allergies, risk flags (Nurses/Doctors can edit)
 * - Restricted: Restricted flag and reason (Admin only)
 * - Documents: Document attachments (Front Desk can attach, Nurses/Doctors can view)
 * 
 * Role Permissions:
 * - FRONT_DESK: Can edit demographics only
 * - NURSE/DOCTOR: Can edit clinical fields only
 * - ADMIN: Can edit everything (override)
 */
@Injectable()
export class PatientFieldPermissionService {
  constructor(private readonly identityContext: IdentityContextService) {}

  /**
   * Demographics fields that Front Desk can edit
   * These are non-clinical identity and contact fields
   * 
   * Note: DTO uses 'address' but model uses 'addressLine1'
   * Both are included here to handle both cases
   */
  private readonly DEMOGRAPHIC_FIELDS = [
    'firstName',
    'lastName',
    'middleName',
    'dateOfBirth',
    'gender', // Gender is demographic, not clinical
    'email',
    'phone',
    'phoneSecondary',
    'address', // DTO field name (maps to addressLine1 in repository)
    'addressLine1', // Model field name
    'addressLine2',
    'city',
    'state',
    'zipCode',
    'country',
  ] as const;

  /**
   * Clinical fields that Nurses/Doctors can edit
   * These require clinical knowledge and should not be modified by Front Desk
   */
  private readonly CLINICAL_FIELDS = [
    'bloodType', // Clinical information
    // Note: allergies and riskFlags are in separate tables (PatientAllergy, PatientRiskFlag)
    // They are handled via separate endpoints, not through patient update
  ] as const;

  /**
   * Restricted/Privacy fields that only Admin can modify
   * These control patient privacy and access restrictions
   */
  private readonly RESTRICTED_FIELDS = [
    'restricted',
    'restrictedReason',
    'restrictedBy',
    'restrictedAt',
  ] as const;

  /**
   * System/audit fields that should never be modified via update
   * These are managed by the system automatically
   */
  private readonly SYSTEM_FIELDS = [
    'id',
    'mrn', // MRN is immutable
    'createdAt',
    'createdBy',
    'updatedAt',
    'updatedBy',
    'version', // Version is managed by optimistic locking
    'archived',
    'archivedAt',
    'archivedBy',
    'archivedReason',
    'deceased',
    'deceasedAt',
    'deceasedBy',
    'mergedInto',
    'mergedAt',
    'mergedBy',
  ] as const;

  /**
   * Check if user can edit demographic fields
   * 
   * Allowed roles:
   * - FRONT_DESK: Can edit demographics
   * - ADMIN: Can edit everything (override)
   * 
   * @returns true if user can edit demographic fields
   */
  canEditDemographics(): boolean {
    // Admin can edit everything
    if (this.identityContext.hasRole('ADMIN')) {
      return true;
    }

    // Front Desk can edit demographics
    if (this.identityContext.hasRole('FRONT_DESK')) {
      return true;
    }

    // Nurses and Doctors cannot edit demographics (they edit clinical fields)
    return false;
  }

  /**
   * Check if user can edit clinical fields
   * 
   * Allowed roles:
   * - NURSE: Can edit clinical fields
   * - DOCTOR: Can edit clinical fields
   * - ADMIN: Can edit everything (override)
   * 
   * @returns true if user can edit clinical fields
   */
  canEditClinicalData(): boolean {
    // Admin can edit everything
    if (this.identityContext.hasRole('ADMIN')) {
      return true;
    }

    // Nurses and Doctors can edit clinical fields
    if (this.identityContext.hasAnyRole(['NURSE', 'DOCTOR'])) {
      return true;
    }

    // Front Desk cannot edit clinical fields
    return false;
  }

  /**
   * Check if user can attach documents
   * 
   * Allowed roles:
   * - FRONT_DESK: Can attach documents (ID cards, insurance cards)
   * - ADMIN: Can attach documents (override)
   * 
   * Note: This is for document attachment, not document content editing.
   * Clinical staff can view documents but typically don't attach them.
   * 
   * @returns true if user can attach documents
   */
  canAttachDocuments(): boolean {
    // Admin can do everything
    if (this.identityContext.hasRole('ADMIN')) {
      return true;
    }

    // Front Desk can attach documents (they handle registration)
    if (this.identityContext.hasRole('FRONT_DESK')) {
      return true;
    }

    // Nurses and Doctors typically don't attach documents
    return false;
  }

  /**
   * Check if user can restrict/unrestrict a patient
   * 
   * Allowed roles:
   * - ADMIN: Only role that can restrict patients
   * 
   * Restricting a patient marks them as privacy-sensitive (VIP, celebrity, etc.)
   * This is a sensitive operation that should only be done by administrators.
   * 
   * @returns true if user can restrict patients
   */
  canRestrictPatient(): boolean {
    // Only Admin can restrict patients
    return this.identityContext.hasRole('ADMIN');
  }

  /**
   * Get list of fields that changed in the update DTO
   * 
   * @param updateDto The update DTO containing changed fields
   * @returns Object with categorized changed fields
   */
  getChangedFields(updateDto: Record<string, any>): {
    demographic: string[];
    clinical: string[];
    restricted: string[];
    system: string[];
    unknown: string[];
  } {
    const changed: {
      demographic: string[];
      clinical: string[];
      restricted: string[];
      system: string[];
      unknown: string[];
    } = {
      demographic: [],
      clinical: [],
      restricted: [],
      system: [],
      unknown: [],
    };

    // Iterate through all fields in the update DTO
    for (const field of Object.keys(updateDto)) {
      // Skip undefined/null values (not actually changed)
      if (updateDto[field] === undefined || updateDto[field] === null) {
        continue;
      }

      // Categorize the field
      if (this.DEMOGRAPHIC_FIELDS.includes(field as any)) {
        changed.demographic.push(field);
      } else if (this.CLINICAL_FIELDS.includes(field as any)) {
        changed.clinical.push(field);
      } else if (this.RESTRICTED_FIELDS.includes(field as any)) {
        changed.restricted.push(field);
      } else if (this.SYSTEM_FIELDS.includes(field as any)) {
        changed.system.push(field);
      } else {
        // Unknown field - log for debugging but don't block
        // This allows for future fields to be added without breaking
        changed.unknown.push(field);
      }
    }

    return changed;
  }

  /**
   * Validate that user has permission to edit all changed fields
   * 
   * @param updateDto The update DTO containing changed fields
   * @throws ForbiddenException if user lacks permission for any changed field
   */
  validateFieldPermissions(updateDto: Record<string, any>): void {
    const changed = this.getChangedFields(updateDto);

    // Check demographic fields
    if (changed.demographic.length > 0 && !this.canEditDemographics()) {
      throw new ForbiddenException(
        `Insufficient permissions: Cannot edit demographic fields (${changed.demographic.join(', ')}). ` +
        `Only FRONT_DESK and ADMIN can edit demographics.`,
      );
    }

    // Check clinical fields
    if (changed.clinical.length > 0 && !this.canEditClinicalData()) {
      throw new ForbiddenException(
        `Insufficient permissions: Cannot edit clinical fields (${changed.clinical.join(', ')}). ` +
        `Only NURSE, DOCTOR, and ADMIN can edit clinical data.`,
      );
    }

    // Check restricted fields
    if (changed.restricted.length > 0 && !this.canRestrictPatient()) {
      throw new ForbiddenException(
        `Insufficient permissions: Cannot edit restricted fields (${changed.restricted.join(', ')}). ` +
        `Only ADMIN can restrict/unrestrict patients.`,
      );
    }

    // Warn about system fields (should not be in update DTO)
    if (changed.system.length > 0) {
      // Log warning but don't block (these will be ignored by repository anyway)
      console.warn(
        `Warning: System fields in update DTO (${changed.system.join(', ')}). ` +
        `These fields are managed automatically and will be ignored.`,
      );
    }

    // Unknown fields are allowed (for future extensibility)
    // They will be passed through to repository, which will handle validation
  }
}

