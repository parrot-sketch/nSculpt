import apiClient from './apiClient';

/**
 * Prescription Status enum
 * Matches Prisma PrescriptionStatus enum
 */
export enum PrescriptionStatus {
  PRESCRIBED = 'PRESCRIBED',
  DISPENSED = 'DISPENSED',
  PARTIALLY_DISPENSED = 'PARTIALLY_DISPENSED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

/**
 * Medication Type enum
 * Matches Prisma MedicationType enum
 */
export enum MedicationType {
  ORAL = 'ORAL',
  INJECTION = 'INJECTION',
  TOPICAL = 'TOPICAL',
  INHALATION = 'INHALATION',
  IV = 'IV',
  OTHER = 'OTHER',
}

/**
 * Prescription type definition
 * 
 * Note: Backend has one prescription per medication.
 * Multiple medications = multiple prescription records.
 */
export interface Prescription {
  id: string;
  patientId: string;
  consultationId: string;
  prescribedById: string;
  dispensedById?: string;
  medicationName: string;
  medicationType: MedicationType;
  dosage: string;
  frequency: string;
  quantity: number;
  quantityDispensed: number;
  inventoryItemId?: string;
  status: PrescriptionStatus;
  instructions?: string;
  duration?: string;
  refills: number;
  refillsRemaining: number;
  prescribedAt: string;
  dispensedAt?: string;
  expiresAt?: string;
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
  prescribedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  dispensedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

/**
 * Create Prescription Request
 */
export interface CreatePrescriptionRequest {
  consultationId: string;
  medicationName: string;
  medicationType: MedicationType;
  dosage: string;
  frequency: string;
  quantity: number;
  inventoryItemId?: string;
  instructions?: string;
  duration?: string;
  refills?: number;
}

/**
 * Update Prescription Request
 */
export interface UpdatePrescriptionRequest {
  medicationName?: string;
  medicationType?: MedicationType;
  dosage?: string;
  frequency?: string;
  quantity?: number;
  instructions?: string;
  duration?: string;
  refills?: number;
  version?: number;
}

/**
 * Prescription List Response
 */
export interface PrescriptionListResponse {
  data: Prescription[];
  total: number;
}

/**
 * Prescription Service
 * 
 * Type-safe API client for prescription endpoints.
 * 
 * Note: Each prescription represents one medication.
 * Multiple medications require multiple prescription records.
 */
export const prescriptionService = {
  /**
   * Get all prescriptions with filtering
   * GET /api/v1/prescriptions
   * 
   * Note: Backend may support query params like ?patientId=...&consultationId=...
   */
  async getPrescriptions(
    filters?: {
      patientId?: string;
      consultationId?: string;
      status?: PrescriptionStatus;
    }
  ): Promise<PrescriptionListResponse> {
    const params = new URLSearchParams();

    if (filters?.patientId) params.append('patientId', filters.patientId);
    if (filters?.consultationId) params.append('consultationId', filters.consultationId);
    if (filters?.status) params.append('status', filters.status);

    const queryString = params.toString();
    const url = queryString ? `/prescriptions?${queryString}` : '/prescriptions';
    
    const response = await apiClient.get<PrescriptionListResponse>(url);

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
   * Get prescription by ID
   * GET /api/v1/prescriptions/:id
   */
  async getPrescription(id: string): Promise<Prescription> {
    const response = await apiClient.get<Prescription>(`/prescriptions/${id}`);
    return (response as any).data || response;
  },

  /**
   * Get prescriptions by consultation ID
   * GET /api/v1/prescriptions/by-consultation/:consultationId
   */
  async getPrescriptionsByConsultation(consultationId: string): Promise<Prescription[]> {
    const response = await apiClient.get<Prescription[]>(
      `/prescriptions/by-consultation/${consultationId}`
    );
    const data = (response as any).data || response;
    return Array.isArray(data) ? data : [];
  },

  /**
   * Get prescriptions by patient ID
   * 
   * Note: Backend may not have a direct patient endpoint.
   * This method uses consultation-based fetching.
   * For now, we'll fetch all prescriptions and filter by patientId client-side.
   * In production, this should use a proper patient endpoint if available.
   */
  async getPrescriptionsByPatient(patientId: string): Promise<Prescription[]> {
    // Try to get all prescriptions (if endpoint supports it)
    // Otherwise, this would need to fetch via consultations
    // For now, we'll use a placeholder that will be handled by the hook
    // The hook will need to fetch consultations first, then prescriptions for each
    const response = await this.getPrescriptions({ patientId });
    return response.data;
  },

  /**
   * Create prescription
   * POST /api/v1/prescriptions
   */
  async createPrescription(dto: CreatePrescriptionRequest): Promise<Prescription> {
    const response = await apiClient.post<Prescription>('/prescriptions', dto);
    return (response as any).data || response;
  },

  /**
   * Update prescription
   * PATCH /api/v1/prescriptions/:id
   * Note: Backend may not have update endpoint - prescriptions are typically immutable after creation
   */
  async updatePrescription(id: string, dto: UpdatePrescriptionRequest): Promise<Prescription> {
    const response = await apiClient.patch<Prescription>(`/prescriptions/${id}`, dto);
    return (response as any).data || response;
  },

  /**
   * Cancel prescription
   * POST /api/v1/prescriptions/:id/cancel
   * Note: Backend may use status update instead
   */
  async cancelPrescription(id: string): Promise<Prescription> {
    const response = await apiClient.post<Prescription>(`/prescriptions/${id}/cancel`, {});
    return (response as any).data || response;
  },
};
