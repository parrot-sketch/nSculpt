import apiClient from './apiClient';

/**
 * Appointment Status enum
 * Matches Prisma AppointmentStatus enum
 */
export enum AppointmentStatus {
    REQUESTED = 'REQUESTED',
    SCHEDULED = 'SCHEDULED',
    CONFIRMED = 'CONFIRMED',
    PENDING_PAYMENT = 'PENDING_PAYMENT',
    PAYMENT_PENDING = 'PAYMENT_PENDING',
    NEEDS_RESCHEDULE = 'NEEDS_RESCHEDULE',
    CHECKED_IN = 'CHECKED_IN',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
    CANCELLED_AFTER_PAYMENT = 'CANCELLED_AFTER_PAYMENT',
    NO_SHOW = 'NO_SHOW',
}

/**
 * Appointment type definition
 */
export interface Appointment {
    id: string;
    appointmentNumber: string;
    patientId: string;
    doctorId: string;
    scheduledDate: string; // ISO Date string
    scheduledStartTime: string; // ISO Date string
    scheduledEndTime: string; // ISO Date string
    estimatedDurationMinutes: number;
    appointmentType: string;
    reason: string;
    notes?: string;
    status: AppointmentStatus;
    consultationFee: number;

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
    encounter?: {
        id: string;
        status: string;
        locked: boolean;
    };
    payment?: {
        id: string;
        status: string;
    };
}

/**
 * Appointment List Response
 */
export interface AppointmentListResponse {
    data: Appointment[];
    total: number;
}

/**
 * Booking DTOs
 */
export interface BookAppointmentForNewPatientDto {
    patientData: {
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
        dateOfBirth?: string;
        gender?: string;
        address?: string;
    };
    doctorId: string;
    scheduledDate: string; // YYYY-MM-DD
    scheduledStartTime: string; // ISO 8601
    scheduledEndTime: string; // ISO 8601
    appointmentType: string;
    reason: string;
    notes?: string;
    consultationFee?: number;
}

export interface BookAppointmentForExistingPatientDto {
    patientId: string;
    doctorId: string;
    scheduledDate: string;
    scheduledStartTime: string;
    scheduledEndTime: string;
    appointmentType: string;
    reason: string;
    notes?: string;
    consultationFee?: number;
}

export interface ScheduleFromProcedurePlanDto {
    procedurePlanId: string;
    scheduledDate: string;
    scheduledStartTime: string;
    scheduledEndTime: string;
    estimatedDurationMinutes?: number;
    notes?: string;
}

export interface ScheduleFromFollowUpPlanDto {
    followUpPlanId: string;
    scheduledDate: string;
    scheduledStartTime: string;
    scheduledEndTime: string;
    notes?: string;
}

export interface BookConsultationDto {
    patientId: string;
    doctorId: string;
    scheduledDate: string; // YYYY-MM-DD
    scheduledStartTime: string; // ISO 8601 datetime
    scheduledEndTime: string; // ISO 8601 datetime
    estimatedDurationMinutes?: number;
    visitType: string;
    reasonForVisit?: string;
    chiefComplaint?: string;
    notes?: string;
}

export interface AvailableSlotsResponse {
    doctorId: string;
    date: string;
    durationMinutes: number;
    availableSlots: { start: string; end: string }[];
    totalSlots: number;
}

/**
 * Appointment Service
 * 
 * Type-safe API client for appointment endpoints.
 */
export const appointmentService = {
    // ... (existing filter methods) ...

    /**
     * Book appointment for new patient
     */
    async bookNewPatient(data: BookAppointmentForNewPatientDto): Promise<Appointment> {
        const response = await apiClient.post<Appointment>('/appointments/book/new-patient', data);
        return (response as any).data || response;
    },

    /**
     * Book appointment for existing patient
     */
    async bookExistingPatient(data: BookAppointmentForExistingPatientDto): Promise<Appointment> {
        const response = await apiClient.post<Appointment>('/appointments/book/existing-patient', data);
        return (response as any).data || response;
    },

    /**
     * Get available consultation slots for a doctor on a specific date
     * GET /api/v1/appointments/available-slots/:doctorId
     */
    async getAvailableSlots(
        doctorId: string,
        date: string, // YYYY-MM-DD
        durationMinutes: number = 30
    ): Promise<{ availableSlots: { start: string; end: string }[] }> {
        const params = new URLSearchParams({
            date,
            duration: durationMinutes.toString(),
        });

        const response = await apiClient.get<AvailableSlotsResponse>(
            `/appointments/available-slots/${doctorId}?${params.toString()}`
        );
        return (response as any).data || response;
    },

    /**
     * Book a consultation (Patient Self-Booking)
     * POST /api/v1/public/consultations/book
     */
    async bookConsultation(data: BookConsultationDto): Promise<Appointment> {
        const response = await apiClient.post<Appointment>('/public/consultations/book', data);
        return (response as any).data || response;
    },

    /**
     * Schedule from procedure plan
     */
    async scheduleProcedure(data: ScheduleFromProcedurePlanDto): Promise<Appointment> {
        const response = await apiClient.post<Appointment>('/appointments/book/from-procedure-plan', data);
        return (response as any).data || response;
    },

    /**
     * Schedule from follow-up plan
     */
    async scheduleFollowUp(data: ScheduleFromFollowUpPlanDto): Promise<Appointment> {
        const response = await apiClient.post<Appointment>('/appointments/book/from-follow-up-plan', data);
        return (response as any).data || response;
    },

    /**
     * Get all appointments with filtering
     */
    async getAppointments(
        skip: number = 0,
        take: number = 20,
        filters?: {
            startDate?: Date | string;
            endDate?: Date | string;
            status?: AppointmentStatus;
            doctorId?: string;
            patientId?: string;
        }
    ): Promise<AppointmentListResponse> {
        const params = new URLSearchParams();
        params.append('skip', skip.toString());
        params.append('take', take.toString());

        if (filters?.startDate) params.append('startDate', new Date(filters.startDate).toISOString());
        if (filters?.endDate) params.append('endDate', new Date(filters.endDate).toISOString());
        if (filters?.status) params.append('status', filters.status);
        if (filters?.doctorId) params.append('doctorId', filters.doctorId);
        if (filters?.patientId) params.append('patientId', filters.patientId);

        const response = await apiClient.get<AppointmentListResponse>(
            `/appointments?${params.toString()}`
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
     * Get appointment by ID
     */
    async getAppointment(id: string): Promise<Appointment> {
        const response = await apiClient.get<Appointment>(`/appointments/${id}`);
        return (response as any).data || response;
    },

    /**
     * Check in patient (for Front Desk)
     */
    async checkIn(id: string): Promise<Appointment> {
        const response = await apiClient.post<Appointment>(`/appointments/${id}/check-in`, {});
        return (response as any).data || response;
    },

    /**
     * Get appointments for a specific patient
     * GET /api/v1/appointments/patient/:patientId
     */
    async getPatientAppointments(patientId: string, status?: AppointmentStatus): Promise<Appointment[]> {
        const params = status ? `?status=${status}` : '';
        const response = await apiClient.get<Appointment[]>(`/appointments/patient/${patientId}${params}`);
        const data = (response as any).data || response;
        return Array.isArray(data) ? data : [];
    },

    /**
     * Cancel appointment
     * POST /api/v1/appointments/:id/cancel
     */
    async cancelAppointment(
        id: string,
        cancelDto: {
            cancellationReason: string;
            cancellationNotes?: string;
            refundRequested?: boolean;
        }
    ): Promise<Appointment> {
        const response = await apiClient.post<Appointment>(`/appointments/${id}/cancel`, cancelDto);
        return (response as any).data || response;
    },

    /**
     * Confirm appointment payment
     * POST /api/v1/appointments/:id/confirm-payment
     */
    async confirmAppointment(id: string, paymentId: string): Promise<Appointment> {
        const response = await apiClient.post<Appointment>(`/appointments/${id}/confirm-payment`, {
            paymentId,
        });
        return (response as any).data || response;
    },

    /**
     * Reschedule appointment
     * PATCH /api/v1/appointments/:id
     */
    async rescheduleAppointment(
        id: string,
        rescheduleDto: {
            scheduledDate: string; // YYYY-MM-DD
            scheduledStartTime: string; // ISO 8601
            scheduledEndTime: string; // ISO 8601
        }
    ): Promise<Appointment> {
        const response = await apiClient.patch<Appointment>(`/appointments/${id}`, rescheduleDto);
        return (response as any).data || response;
    },

    /**
     * Update appointment status
     * PATCH /api/v1/appointments/:id/status
     * Used for: mark no-show, mark in-progress
     * Note: This endpoint may need to be created in backend if it doesn't exist
     */
    async updateAppointmentStatus(
        id: string,
        status: AppointmentStatus,
        notes?: string
    ): Promise<Appointment> {
        const response = await apiClient.patch<Appointment>(`/appointments/${id}/status`, {
            status,
            notes,
        });
        return (response as any).data || response;
    },

    /**
     * Complete appointment
     * POST /api/v1/appointments/:id/complete
     */
    async completeAppointment(id: string, consultationId: string): Promise<Appointment> {
        const response = await apiClient.post<Appointment>(`/appointments/${id}/complete`, {
            consultationId,
        });
        return (response as any).data || response;
    },

    /**
     * ============================================
     * CLINICAL COORDINATION METHODS
     * ============================================
     */

    /**
     * Step 1: Request Appointment (Patient)
     */
    async requestAppointment(data: {
        doctorId: string;
        appointmentType: string;
        reason?: string;
    }): Promise<Appointment> {
        const response = await apiClient.post<Appointment>('/appointments/request', data);
        return (response as any).data || response;
    },

    /**
     * Step 2: Assign Schedule (FrontDesk)
     */
    async assignSchedule(id: string, data: {
        scheduledDate: string;
        scheduledStartTime: string;
        scheduledEndTime: string;
        estimatedDurationMinutes?: number;
    }): Promise<Appointment> {
        const response = await apiClient.patch<Appointment>(`/appointments/${id}/schedule`, data);
        return (response as any).data || response;
    },

    /**
     * Step 3: Confirm Schedule (Doctor)
     */
    async doctorConfirm(id: string): Promise<Appointment> {
        const response = await apiClient.post<Appointment>(`/appointments/${id}/confirm`, {});
        return (response as any).data || response;
    },

    /**
     * Step 3 (Alt): Request Reschedule (Doctor)
     */
    async requestReschedule(id: string, notes: string): Promise<Appointment> {
        const response = await apiClient.post<Appointment>(`/appointments/${id}/request-reschedule`, { notes });
        return (response as any).data || response;
    },
};
