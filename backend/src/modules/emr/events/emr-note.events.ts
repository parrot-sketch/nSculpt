/**
 * EMR Note Domain Events
 * 
 * Event types for EMR note-related domain events
 */

export enum EMRNoteEventType {
  NOTE_CREATED = 'EMRNote.Created',
  NOTE_ADDENDUM_CREATED = 'EMRNote.AddendumCreated',
  NOTE_ARCHIVED = 'EMRNote.Archived',
  NOTE_UNLOCKED = 'EMRNote.Unlocked',
}

export interface EMRNoteCreatedPayload {
  noteId: string;
  consultationId: string;
  patientId: string;
  authorId: string;
  noteType: string;
  timestamp: string;
}

export interface EMRNoteAddendumCreatedPayload {
  noteId: string;
  parentNoteId: string;
  consultationId: string;
  patientId: string;
  authorId: string;
  timestamp: string;
}

export interface EMRNoteArchivedPayload {
  noteId: string;
  consultationId: string;
  patientId: string;
  archivedBy: string;
  timestamp: string;
}

export interface EMRNoteUnlockedPayload {
  noteId: string;
  consultationId: string;
  patientId: string;
  unlockedBy: string;
  timestamp: string;
}









