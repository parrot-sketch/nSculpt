/**
 * Orders Domain Events
 * 
 * Event types for order-related domain events
 */

export enum OrderEventType {
  ORDER_CREATED = 'LabOrder.Created',
  ORDER_APPROVED = 'LabOrder.Approved',
  ORDER_CANCELLED = 'LabOrder.Cancelled',
  ORDER_STATUS_CHANGED = 'LabOrder.StatusChanged',
  RESULT_RECORDED = 'LabResult.Recorded',
  RESULT_AMENDED = 'LabResult.Amended',
  ORDER_ARCHIVED = 'LabOrder.Archived',
}

export interface OrderCreatedPayload {
  orderId: string;
  patientId: string;
  consultationId: string;
  orderedById: string;
  testName: string;
  priority: string;
  status: string;
  timestamp: string;
}

export interface OrderApprovedPayload {
  orderId: string;
  patientId: string;
  consultationId: string;
  approvedById: string;
  status: string;
  timestamp: string;
}

export interface OrderCancelledPayload {
  orderId: string;
  patientId: string;
  consultationId: string;
  cancelledBy: string;
  timestamp: string;
}

export interface ResultRecordedPayload {
  orderId: string;
  resultId: string;
  patientId: string;
  consultationId: string;
  recordedById: string;
  resultStatus: string;
  timestamp: string;
}

export interface ResultAmendedPayload {
  orderId: string;
  resultId: string;
  patientId: string;
  consultationId: string;
  amendedBy: string;
  timestamp: string;
}









