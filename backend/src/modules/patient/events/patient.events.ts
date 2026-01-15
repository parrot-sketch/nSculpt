/**
 * Patient Domain Events
 * 
 * Event types for patient-related domain events
 */

export enum PatientEventType {
  CREATED = 'Patient.Created',
  UPDATED = 'Patient.Updated',
  MERGED = 'Patient.Merged',
  ARCHIVED = 'Patient.Archived',
  RESTRICTED = 'Patient.Restricted',
  UNRESTRICTED = 'Patient.Unrestricted',
  CONSENT_SIGNED = 'Patient.ConsentSigned',
  RECORD_ACCESSED = 'Patient.RecordAccessed',
}

export interface PatientCreatedPayload {
  patientId: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  dateOfBirth?: string;
}

export interface PatientUpdatedPayload {
  patientId: string;
  changes: Record<string, any>;
  previousValues: Record<string, any>;
}

export interface PatientMergedPayload {
  sourcePatientId: string;
  targetPatientId: string;
  reason?: string;
}

export interface PatientRestrictedPayload {
  patientId: string;
  reason: string;
}

export interface PatientUnrestrictedPayload {
  patientId: string;
}




