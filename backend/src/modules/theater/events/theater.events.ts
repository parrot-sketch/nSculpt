/**
 * Theater Domain Events
 */

export enum TheaterEventType {
  CASE_CREATED = 'SurgicalCase.Created',
  CASE_STATUS_CHANGED = 'SurgicalCase.StatusChanged',
  CASE_UPDATED = 'SurgicalCase.Updated',
  SURGICAL_ITEM_USED = 'SurgicalCase.ItemUsed',
  RESERVATION_CREATED = 'TheaterReservation.Created',
  RESERVATION_CANCELLED = 'TheaterReservation.Cancelled',
  RESOURCE_ALLOCATED = 'ResourceAllocation.Created',
  RESOURCE_RELEASED = 'ResourceAllocation.Released',
}

export interface CaseCreatedPayload {
  caseId: string;
  caseNumber: string;
  patientId: string;
  procedureName: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
}

export interface CaseStatusChangedPayload {
  caseId: string;
  fromStatus: string | null;
  toStatus: string;
  reason?: string;
}

export interface ReservationCreatedPayload {
  reservationId: string;
  theaterId: string;
  caseId?: string;
  reservedFrom: string;
  reservedUntil: string;
}




