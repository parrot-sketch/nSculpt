/**
 * Audit & Compliance Types
 * 
 * Types for audit and compliance functionality.
 */

// ============================================================================
// Data Access Logs
// ============================================================================

export interface DataAccessLog {
  id: string;
  userId: string;
  resourceType: string;
  resourceId: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  reason?: string;
  justification?: string;
  accessedPHI: boolean;
  success: boolean;
  errorMessage?: string;
  accessedAt: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface AccessLogQueryParams {
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  action?: string;
  accessedPHI?: boolean;
  success?: boolean;
  startDate?: string;
  endDate?: string;
  skip?: number;
  take?: number;
}

export interface AccessLogsListResponse {
  data: DataAccessLog[];
  total: number;
  skip: number;
  take: number;
}

// ============================================================================
// Domain Events
// ============================================================================

export interface DomainEvent {
  id: string;
  eventType: string;
  domain: string;
  aggregateId: string;
  aggregateType: string;
  payload: Record<string, any>;
  createdBy?: string;
  correlationId?: string;
  causationId?: string;
  sessionId?: string;
  requestId?: string;
  occurredAt: string;
  creator?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface DomainEventQueryParams {
  eventType?: string;
  domain?: string;
  aggregateId?: string;
  aggregateType?: string;
  createdBy?: string;
  correlationId?: string;
  startDate?: string;
  endDate?: string;
  skip?: number;
  take?: number;
}

export interface DomainEventsListResponse {
  data: DomainEvent[];
  total: number;
  skip: number;
  take: number;
}

export interface EventChain {
  events: DomainEvent[];
  rootEvent: DomainEvent;
}

// ============================================================================
// Sessions
// ============================================================================

export interface Session {
  id: string;
  userId: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  startedAt: string;
  lastActivityAt: string;
  expiresAt: string;
  revokedAt?: string;
  revokedBy?: string;
  revokedReason?: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  revokedByUser?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface SessionQueryParams {
  userId?: string;
  active?: boolean;
  revoked?: boolean;
  startDate?: string;
  endDate?: string;
  skip?: number;
  take?: number;
}

export interface SessionsListResponse {
  data: Session[];
  total: number;
  skip: number;
  take: number;
}

export interface RevokeSessionRequest {
  reason?: string;
}

// ============================================================================
// HIPAA Reports
// ============================================================================

export interface HipaaReportQueryParams {
  startDate: string;
  endDate: string;
  userId?: string;
  resourceType?: string;
}

export interface HipaaReport {
  logs: DataAccessLog[];
  summary: {
    totalAccesses: number;
    uniqueUsers: number;
    byResourceType: Record<string, number>;
    byAction: Record<string, number>;
    dateRange: {
      start: string;
      end: string;
    };
  };
}









