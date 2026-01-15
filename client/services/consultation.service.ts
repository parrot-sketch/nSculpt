import apiClient from './apiClient';

/**
 * Consultation Status enum
 * Matches backend ConsultationStatus enum
 */
export enum ConsultationStatus {
  SCHEDULED = 'SCHEDULED',
  CHECKED_IN = 'CHECKED_IN',
  IN_TRIAGE = 'IN_TRIAGE',
  IN_CONSULTATION = 'IN_CONSULTATION',
  PLAN_CREATED = 'PLAN_CREATED',
  CLOSED = 'CLOSED',
  FOLLOW_UP = 'FOLLOW_UP',
  REFERRED = 'REFERRED',
  SURGERY_SCHEDULED = 'SURGERY_SCHEDULED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

/**
 * Consultation type definition
 */
export interface Consultation {
  id: string;
  consultationNumber: string;
  patientId: string;
  doctorId: string;
  appointmentId: string;
  consultationType: string;
  chiefComplaint?: string;
  consultationDate: string;
  status: ConsultationStatus;
  completedAt?: string;
  diagnosis?: string;
  notes?: string;
  followUpRequired: boolean;
  followUpDate?: string;
  billable: boolean;
  billed: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;

  // Relations
  patient?: {
    id: string;
    patientNumber: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  doctor?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
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
 * Create Consultation Request
 */
export interface CreateConsultationRequest {
  patientId: string;
  appointmentId: string;
  doctorId?: string;
  visitType: 'INITIAL' | 'REVIEW' | 'FOLLOW_UP' | 'PRE_OP';
  reasonForVisit?: string;
  chiefComplaint?: string;
}

/**
 * Update Consultation Request
 * 
 * Note: Backend UpdateConsultationDto supports:
 * - reasonForVisit
 * - chiefComplaint
 * - clinicalSummary (can be used for HPI + Examination)
 * - diagnoses (object)
 * 
 * We'll structure the frontend form to map to these fields appropriately.
 */
export interface UpdateConsultationRequest {
  reasonForVisit?: string;
  chiefComplaint?: string;
  clinicalSummary?: string; // Can contain HPI + Examination
  diagnoses?: Record<string, any>; // Structured diagnosis data
  version?: number; // For optimistic locking
}

/**
 * Consultation List Response
 */
export interface ConsultationListResponse {
  data: Consultation[];
  total: number;
  skip?: number;
  take?: number;
}

/**
 * Consultation Service
 * 
 * Type-safe API client for consultation endpoints.
 */
export const consultationService = {
  /**
   * Get all consultations with filtering
   * GET /api/v1/consultations
   */
  async getConsultations(
    skip: number = 0,
    take: number = 20,
    filters?: {
      patientId?: string;
      doctorId?: string;
      status?: ConsultationStatus;
    }
  ): Promise<ConsultationListResponse> {
    const params = new URLSearchParams();
    params.append('skip', skip.toString());
    params.append('take', take.toString());

    if (filters?.patientId) params.append('patientId', filters.patientId);
    if (filters?.doctorId) params.append('doctorId', filters.doctorId);
    if (filters?.status) params.append('status', filters.status);

    const response = await apiClient.get<ConsultationListResponse>(
      `/consultations?${params.toString()}`
    );

    const data = (response as any).data || response;

    // Normalize response
    if (data && Array.isArray(data.data)) {
      return data;
    }

    if (Array.isArray(data)) {
      return { data: data, total: data.length };
    }

    return { data: [], total: 0 };
  },

  /**
   * Get consultation by ID
   * GET /api/v1/consultations/:id
   */
  async getConsultation(id: string): Promise<Consultation> {
    const response = await apiClient.get<Consultation>(`/consultations/${id}`);
    return (response as any).data || response;
  },

  /**
   * Get consultation by appointment ID
   * This is a convenience method that fetches all consultations and filters by appointmentId
   * Note: Backend may have a direct endpoint for this, but we'll use this approach for now
   */
  async getConsultationByAppointment(appointmentId: string): Promise<Consultation | null> {
    const consultations = await this.getConsultations(0, 100);
    const consultation = consultations.data.find(c => c.appointmentId === appointmentId);
    return consultation || null;
  },

  /**
   * Create consultation
   * POST /api/v1/consultations
   */
  async createConsultation(dto: CreateConsultationRequest): Promise<Consultation> {
    const response = await apiClient.post<Consultation>('/consultations', dto);
    return (response as any).data || response;
  },

  /**
   * Update consultation
   * PATCH /api/v1/consultations/:id
   */
  async updateConsultation(id: string, dto: UpdateConsultationRequest): Promise<Consultation> {
    const response = await apiClient.patch<Consultation>(`/consultations/${id}`, dto);
    return (response as any).data || response;
  },

  /**
   * Start consultation (transitions to IN_CONSULTATION)
   * POST /api/v1/consultations/:id/start
   */
  async startConsultation(id: string): Promise<Consultation> {
    const response = await apiClient.post<Consultation>(`/consultations/${id}/start`, {});
    return (response as any).data || response;
  },

  /**
   * Finalize plan (transitions to PLAN_CREATED)
   * POST /api/v1/consultations/:id/plan
   */
  async finalizePlan(
    id: string,
    dto: {
      outcome: 'NO_ACTION' | 'FOLLOW_UP' | 'PROCEDURE_PLANNED' | 'CONSERVATIVE' | 'REFERRED';
      clinicalSummary?: string;
      diagnoses?: Record<string, any>;
      procedurePlan?: {
        procedureName: string;
        procedureCode?: string;
        procedureDescription?: string;
        planType: 'SURGICAL' | 'NON_SURGICAL' | 'CONSERVATIVE' | 'SERIES';
        sessionCount?: number;
        sessionIntervalDays?: number;
        sessionDetails?: string;
        followUpRequired?: boolean;
        followUpIntervalDays?: number;
        notes?: string;
      };
      followUpPlan?: {
        followUpType: string;
        intervalDays?: number;
        reason?: string;
      };
    }
  ): Promise<Consultation & { procedurePlan?: any; followUpPlan?: any }> {
    const response = await apiClient.post<Consultation & { procedurePlan?: any; followUpPlan?: any }>(
      `/consultations/${id}/plan`,
      dto
    );
    return (response as any).data || response;
  },

  /**
   * Get consultations with outcomes for a patient
   * GET /api/v1/consultations/patient/:patientId/outcomes
   */
  async getConsultationOutcomes(patientId: string): Promise<Consultation[]> {
    const response = await apiClient.get<Consultation[]>(`/consultations/patient/${patientId}/outcomes`);
    return (response as any).data || response;
  },

  /**
   * Close consultation (transitions to CLOSED)
   * POST /api/v1/consultations/:id/close
   */
  async closeConsultation(id: string): Promise<Consultation> {
    const response = await apiClient.post<Consultation>(`/consultations/${id}/close`, {});
    return (response as any).data || response;
  },
};
