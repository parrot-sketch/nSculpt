/**
 * Medical Records Admin Types
 * 
 * Types for medical record admin operations.
 */

// ============================================================================
// Record Merges
// ============================================================================

export interface RecordMergeHistory {
  id: string;
  sourceRecordId: string;
  targetRecordId: string;
  triggeringEventId: string;
  reason?: string;
  mergedBy?: string;
  reversedAt?: string;
  reversalEventId?: string;
  reversedBy?: string;
  mergedAt: string;
  sourceRecord?: {
    id: string;
    recordNumber: string;
    patientId: string;
    status: string;
  };
  targetRecord?: {
    id: string;
    recordNumber: string;
    patientId: string;
    status: string;
  };
  triggeringEvent?: {
    id: string;
    eventType: string;
    occurredAt: string;
    createdBy?: string;
  };
  reversalEvent?: {
    id: string;
    eventType: string;
    occurredAt: string;
    createdBy?: string;
  };
}

export interface MergeRecordsRequest {
  targetRecordId: string;
  reason: string;
}

export interface ReverseMergeRequest {
  reason: string;
}

// ============================================================================
// System Health
// ============================================================================

export interface SystemHealth {
  status: 'healthy' | 'degraded';
  timestamp: string;
  database: {
    status: string;
    responseTimeMs: number | null;
  };
  metrics: {
    activeUsers: number;
    activeSessions: number;
    recentErrors: number;
    apiResponseTimeMs: number;
  };
  uptime: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
  };
  recentCriticalEvents: Array<{
    id: string;
    type: string;
    occurredAt: string;
    payload: Record<string, any>;
  }>;
}









