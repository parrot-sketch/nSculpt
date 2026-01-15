import apiClient from './apiClient';

/**
 * Follow-Up Plan Status enum
 */
export enum FollowUpPlanStatus {
  PENDING = 'PENDING',
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/**
 * Follow-Up Plan type definition
 */
export interface FollowUpPlan {
  id: string;
  consultationId: string;
  patientId: string;
  doctorId: string;
  followUpType: string; // REVIEW, POST_OP, SERIES_SESSION, GENERAL
  scheduledDate?: string;
  intervalDays?: number;
  reason?: string;
  status: FollowUpPlanStatus;
  appointmentId?: string;
  createdAt: string;
  updatedAt: string;
  version: number;

  // Relations
  consultation?: {
    id: string;
    consultationNumber: string;
    consultationDate: string;
  };
  patient?: {
    id: string;
    patientNumber: string;
    firstName: string;
    lastName: string;
  };
  doctor?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  appointment?: {
    id: string;
    appointmentNumber: string;
    scheduledStartTime: string;
    scheduledEndTime: string;
    status: string;
  };
}

/**
 * Create Follow-Up Plan Request
 */
export interface CreateFollowUpPlanRequest {
  consultationId: string;
  doctorId: string;
  followUpType: string;
  intervalDays?: number;
  reason?: string;
}

/**
 * Update Follow-Up Plan Request
 */
export interface UpdateFollowUpPlanRequest {
  followUpType?: string;
  scheduledDate?: string;
  intervalDays?: number;
  reason?: string;
  appointmentId?: string;
}

/**
 * Follow-Up Plan Service
 * 
 * Type-safe API client for follow-up plan endpoints.
 */
export const followUpPlanService = {
  /**
   * Get follow-up plan by ID
   * GET /api/v1/follow-up-plans/:id
   */
  async getFollowUpPlan(id: string): Promise<FollowUpPlan> {
    const response = await apiClient.get<FollowUpPlan>(`/follow-up-plans/${id}`);
    return (response as any).data || response;
  },

  /**
   * Get follow-up plans by consultation ID
   * GET /api/v1/follow-up-plans/consultation/:consultationId
   */
  async getFollowUpPlansByConsultation(consultationId: string): Promise<FollowUpPlan[]> {
    const response = await apiClient.get<FollowUpPlan[]>(`/follow-up-plans/consultation/${consultationId}`);
    return (response as any).data || response;
  },

  /**
   * Get follow-up plans by patient ID
   * GET /api/v1/follow-up-plans/patient/:patientId
   */
  async getFollowUpPlansByPatient(patientId: string): Promise<FollowUpPlan[]> {
    const response = await apiClient.get<FollowUpPlan[]>(`/follow-up-plans/patient/${patientId}`);
    return (response as any).data || response;
  },

  /**
   * Create follow-up plan
   * POST /api/v1/follow-up-plans
   */
  async createFollowUpPlan(dto: CreateFollowUpPlanRequest): Promise<FollowUpPlan> {
    const response = await apiClient.post<FollowUpPlan>('/follow-up-plans', dto);
    return (response as any).data || response;
  },

  /**
   * Update follow-up plan
   * PATCH /api/v1/follow-up-plans/:id
   */
  async updateFollowUpPlan(id: string, dto: UpdateFollowUpPlanRequest): Promise<FollowUpPlan> {
    const response = await apiClient.patch<FollowUpPlan>(`/follow-up-plans/${id}`, dto);
    return (response as any).data || response;
  },

  /**
   * Schedule follow-up plan
   * POST /api/v1/follow-up-plans/:id/schedule
   */
  async scheduleFollowUpPlan(id: string, appointmentId: string): Promise<FollowUpPlan> {
    const response = await apiClient.post<FollowUpPlan>(`/follow-up-plans/${id}/schedule`, { appointmentId });
    return (response as any).data || response;
  },

  /**
   * Complete follow-up plan
   * POST /api/v1/follow-up-plans/:id/complete
   */
  async completeFollowUpPlan(id: string): Promise<FollowUpPlan> {
    const response = await apiClient.post<FollowUpPlan>(`/follow-up-plans/${id}/complete`, {});
    return (response as any).data || response;
  },
};
