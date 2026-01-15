import apiClient from './apiClient';

/**
 * Consultation Request Status enum
 */
export enum ConsultationRequestStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
}

/**
 * Consultation Request type definition
 */
export interface ConsultationRequest {
    id: string;
    patientId: string;
    specialistId?: string;
    status: ConsultationRequestStatus;
    reason?: string;
    preferredDate?: string;
    requestedAt: string;
    approvedAt?: string;
    approvedBy?: string;
    rejectedAt?: string;
    rejectedBy?: string;
    rejectionReason?: string;
    patient?: {
        id: string;
        patientNumber: string;
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
    };
    specialist?: {
        id: string;
        firstName: string;
        lastName: string;
        email?: string;
    };
}

/**
 * Consultation Request List Response
 */
export interface ConsultationRequestListResponse {
    data: ConsultationRequest[];
    total: number;
}

/**
 * Consultation Request Service
 * 
 * Type-safe API client for consultation request endpoints.
 */
export const consultationRequestService = {
    /**
     * Get all consultation requests with filtering
     */
    async getConsultationRequests(
        skip: number = 0,
        take: number = 20,
        filters?: {
            patientId?: string;
            specialistId?: string;
            status?: ConsultationRequestStatus;
        }
    ): Promise<ConsultationRequestListResponse> {
        const params = new URLSearchParams();
        params.append('skip', skip.toString());
        params.append('take', take.toString());

        if (filters?.patientId) params.append('patientId', filters.patientId);
        if (filters?.specialistId) params.append('specialistId', filters.specialistId);
        if (filters?.status) params.append('status', filters.status);

        const response = await apiClient.get<ConsultationRequestListResponse>(
            `/consultation-requests?${params.toString()}`
        );

        const data = (response as any).data || response;

        // Normalize response
        if (data && Array.isArray(data.data)) {
            return data;
        }

        // Fallback if backend returns just array
        if (Array.isArray(data)) {
            return { data: data, total: data.length };
        }

        return { data: [], total: 0 };
    },

    /**
     * Get consultation request by ID
     */
    async getConsultationRequest(id: string): Promise<ConsultationRequest> {
        const response = await apiClient.get<ConsultationRequest>(`/consultation-requests/${id}`);
        return (response as any).data || response;
    },

    /**
     * Create consultation request
     */
    async createConsultationRequest(data: {
        patientId: string;
        specialistId?: string;
        reason?: string;
        preferredDate?: string;
    }): Promise<ConsultationRequest> {
        const response = await apiClient.post<ConsultationRequest>('/consultation-requests', data);
        return (response as any).data || response;
    },

    /**
     * Approve consultation request
     */
    async approveConsultationRequest(id: string, notes?: string): Promise<ConsultationRequest> {
        const response = await apiClient.post<ConsultationRequest>(
            `/consultation-requests/${id}/approve`,
            { notes }
        );
        return (response as any).data || response;
    },

    /**
     * Reject consultation request
     */
    async rejectConsultationRequest(id: string, rejectionReason: string): Promise<ConsultationRequest> {
        const response = await apiClient.post<ConsultationRequest>(
            `/consultation-requests/${id}/reject`,
            { rejectionReason }
        );
        return (response as any).data || response;
    },
};
