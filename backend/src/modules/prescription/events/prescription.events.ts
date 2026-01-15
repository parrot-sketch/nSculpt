/**
 * Prescription Domain Events
 */

export enum PrescriptionEventType {
  PRESCRIPTION_CREATED = 'Prescription.Created',
  PRESCRIPTION_DISPENSED = 'Prescription.Dispensed',
  MEDICATION_ADMINISTERED = 'Medication.Administered',
  PRESCRIPTION_CANCELLED = 'Prescription.Cancelled',
}

export interface PrescriptionCreatedPayload {
  prescriptionId: string;
  patientId: string;
  consultationId: string;
  medicationName: string;
  quantity: number;
  timestamp: string;
}

export interface PrescriptionDispensedPayload {
  prescriptionId: string;
  patientId: string;
  consultationId: string;
  quantityDispensed: number;
  inventoryTransactionId?: string;
  timestamp: string;
}

export interface MedicationAdministeredPayload {
  prescriptionId: string;
  patientId: string;
  consultationId: string;
  dosageGiven: string;
  timestamp: string;
}









