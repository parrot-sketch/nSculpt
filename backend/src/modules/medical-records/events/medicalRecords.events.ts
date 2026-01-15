/**
 * Medical Records Domain Events
 */

export enum MedicalRecordEventType {
  RECORD_CREATED = 'MedicalRecord.Created',
  RECORD_UPDATED = 'MedicalRecord.Updated',
  RECORD_MERGED = 'MedicalRecord.Merged',
  NOTE_CREATED = 'ClinicalNote.Created',
  NOTE_AMENDED = 'ClinicalNote.Amended',
  ATTACHMENT_ADDED = 'MedicalRecordAttachment.Added',
}

export interface RecordCreatedPayload {
  recordId: string;
  recordNumber: string;
  patientId: string;
}

export interface RecordMergedPayload {
  sourceRecordId: string;
  targetRecordId: string;
  reason?: string;
}

export interface NoteCreatedPayload {
  noteId: string;
  recordId: string;
  noteType: string;
  contentHash: string;
}












