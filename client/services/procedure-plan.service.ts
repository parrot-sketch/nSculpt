import apiClient from './apiClient';

/**
 * Procedure Plan Type enum
 */
export enum ProcedurePlanType {
  SURGICAL = 'SURGICAL',
  NON_SURGICAL = 'NON_SURGICAL',
  CONSERVATIVE = 'CONSERVATIVE',
  SERIES = 'SERIES',
}

/**
 * Procedure Plan Status enum
 */
export enum ProcedurePlanStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ON_HOLD = 'ON_HOLD',
}

/**
 * Procedure Plan type definition
 */
export interface ProcedurePlan {
  id: string;
  planNumber: string;
  patientId: string;
  consultationId: string;
  surgeonId: string;
  procedureName: string;
  procedureCode?: string;
  procedureDescription?: string;
  planType: ProcedurePlanType;
  sessionCount?: number;
  currentSession?: number;
  sessionIntervalDays?: number;
  sessionDetails?: string;
  plannedDate?: string;
  estimatedDurationMinutes?: number;
  complexity?: string;
  followUpRequired: boolean;
  followUpIntervalDays?: number;
  followUpConsultationId?: string;
  status: ProcedurePlanStatus;
  approvedAt?: string;
  approvedBy?: string;
  notes?: string;
  preoperativeNotes?: string;
  createdAt: string;
  updatedAt: string;
  version: number;

  // Relations
  patient?: {
    id: string;
    patientNumber: string;
    firstName: string;
    lastName: string;
  };
  consultation?: {
    id: string;
    consultationNumber: string;
    consultationDate: string;
  };
  surgeon?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  followUpConsultation?: {
    id: string;
    consultationNumber: string;
  };
}

/**
 * Create Procedure Plan Request
 */
export interface CreateProcedurePlanRequest {
  consultationId: string;
  surgeonId: string;
  procedureName: string;
  procedureCode?: string;
  procedureDescription?: string;
  planType: ProcedurePlanType;
  sessionCount?: number;
  currentSession?: number;
  sessionIntervalDays?: number;
  sessionDetails?: string;
  followUpRequired?: boolean;
  followUpIntervalDays?: number;
  notes?: string;
  preoperativeNotes?: string;
}

/**
 * Update Procedure Plan Request
 */
export interface UpdateProcedurePlanRequest {
  procedureName?: string;
  procedureCode?: string;
  procedureDescription?: string;
  planType?: ProcedurePlanType;
  sessionCount?: number;
  currentSession?: number;
  sessionIntervalDays?: number;
  sessionDetails?: string;
  plannedDate?: string;
  estimatedDurationMinutes?: number;
  complexity?: string;
  followUpRequired?: boolean;
  followUpIntervalDays?: number;
  notes?: string;
  preoperativeNotes?: string;
}

/**
 * Procedure Plan Service
 * 
 * Type-safe API client for procedure plan endpoints.
 */
export const procedurePlanService = {
  /**
   * Get procedure plan by ID
   * GET /api/v1/procedure-plans/:id
   */
  async getProcedurePlan(id: string): Promise<ProcedurePlan> {
    const response = await apiClient.get<ProcedurePlan>(`/procedure-plans/${id}`);
    return (response as any).data || response;
  },

  /**
   * Get procedure plans by consultation ID
   * GET /api/v1/procedure-plans/consultation/:consultationId
   */
  async getProcedurePlansByConsultation(consultationId: string): Promise<ProcedurePlan[]> {
    const response = await apiClient.get<ProcedurePlan[]>(`/procedure-plans/consultation/${consultationId}`);
    return (response as any).data || response;
  },

  /**
   * Get procedure plans by patient ID
   * GET /api/v1/procedure-plans/patient/:patientId
   */
  async getProcedurePlansByPatient(patientId: string): Promise<ProcedurePlan[]> {
    const response = await apiClient.get<ProcedurePlan[]>(`/procedure-plans/patient/${patientId}`);
    return (response as any).data || response;
  },

  /**
   * Create procedure plan
   * POST /api/v1/procedure-plans
   */
  async createProcedurePlan(dto: CreateProcedurePlanRequest): Promise<ProcedurePlan> {
    const response = await apiClient.post<ProcedurePlan>('/procedure-plans', dto);
    return (response as any).data || response;
  },

  /**
   * Update procedure plan
   * PATCH /api/v1/procedure-plans/:id
   */
  async updateProcedurePlan(id: string, dto: UpdateProcedurePlanRequest): Promise<ProcedurePlan> {
    const response = await apiClient.patch<ProcedurePlan>(`/procedure-plans/${id}`, dto);
    return (response as any).data || response;
  },

  /**
   * Approve procedure plan
   * POST /api/v1/procedure-plans/:id/approve
   */
  async approveProcedurePlan(id: string): Promise<ProcedurePlan> {
    const response = await apiClient.post<ProcedurePlan>(`/procedure-plans/${id}/approve`, {});
    return (response as any).data || response;
  },

  /**
   * Schedule procedure plan
   * POST /api/v1/procedure-plans/:id/schedule
   */
  async scheduleProcedurePlan(id: string, appointmentId: string): Promise<ProcedurePlan> {
    const response = await apiClient.post<ProcedurePlan>(`/procedure-plans/${id}/schedule`, { appointmentId });
    return (response as any).data || response;
  },

  /**
   * Complete session (for SERIES plans)
   * POST /api/v1/procedure-plans/:id/complete-session
   */
  async completeSession(id: string, sessionNumber: number): Promise<ProcedurePlan> {
    const response = await apiClient.post<ProcedurePlan>(`/procedure-plans/${id}/complete-session`, { sessionNumber });
    return (response as any).data || response;
  },

  /**
   * Complete procedure plan
   * POST /api/v1/procedure-plans/:id/complete
   */
  async completeProcedurePlan(id: string): Promise<ProcedurePlan> {
    const response = await apiClient.post<ProcedurePlan>(`/procedure-plans/${id}/complete`, {});
    return (response as any).data || response;
  },
};
