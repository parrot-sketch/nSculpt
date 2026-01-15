/**
 * Consultation Domain Events
 * 
 * Event types for consultation-related domain events
 */

export enum ConsultationEventType {
  CREATED = 'Consultation.Created',
  CHECKED_IN = 'Consultation.CheckedIn',
  TRIAGE_STARTED = 'Consultation.TriageStarted',
  CONSULTATION_STARTED = 'Consultation.ConsultationStarted',
  PLAN_CREATED = 'Consultation.PlanCreated',
  CLOSED = 'Consultation.Closed',
  FOLLOW_UP_SCHEDULED = 'Consultation.FollowUpScheduled',
  REFERRED = 'Consultation.Referred',
  SURGERY_SCHEDULED = 'Consultation.SurgeryScheduled',
  STATUS_CHANGED = 'Consultation.StatusChanged',
  ARCHIVED = 'Consultation.Archived',
  STATE_OVERRIDE = 'Consultation.StateOverride', // For admin overrides
}

export interface ConsultationCreatedPayload {
  consultationId: string;
  patientId: string;
  doctorId?: string;
  visitType: string;
  status: string;
}

export interface ConsultationStatusChangedPayload {
  consultationId: string;
  previousStatus: string;
  newStatus: string;
  reason?: string;
  overriddenBy?: string; // If admin override
}

export interface ConsultationCheckedInPayload {
  consultationId: string;
  patientId: string;
  billingEventId?: string; // Reference to billing event created
}









