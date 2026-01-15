/**
 * Patient List Item DTO
 * 
 * Optimized data structure for patient list display.
 * Only includes fields needed for the list view to minimize data transfer.
 */
export class PatientListItemDto {
  id: string; // Internal ID (for navigation, not displayed)
  fileNumber: string; // NS001 format
  patientNumber: string; // MRN-YYYY-XXXXX
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: Date;
  age: number; // Calculated server-side
  email?: string;
  phone?: string;
  whatsapp?: string;
  occupation?: string;
  city?: string; // Residence
  // Next of Kin (primary contact only)
  nextOfKinName?: string; // Combined firstName + lastName
  nextOfKinRelationship?: string;
  nextOfKinContact?: string; // Phone or email
  // Doctor in Charge
  doctorInChargeName?: string; // Combined firstName + lastName
  // Status
  status: string;
  // Lifecycle State
  lifecycleState?: string; // Current lifecycle state (e.g., 'REGISTERED', 'VERIFIED', 'CONSULTATION_COMPLETED')
  lifecycleStateChangedAt?: Date; // When lifecycle state was last changed
}






