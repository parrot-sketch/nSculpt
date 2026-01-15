// Doctor Service - Handles doctor-related API calls
import apiClient from './apiClient';

export interface DoctorDashboardStats {
  totalPatients: number;
  pendingConsultations: number;
  upcomingSurgeries: number;
  pendingConsents: number;
}

export interface DoctorPatient {
  id: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  status: string;
  doctorInCharge?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  consultations?: Array<{
    id: string;
    consultationNumber: string;
    consultationDate: string;
    status: string;
  }>;
  procedurePlans?: Array<{
    id: string;
    procedureName: string;
    status: string;
  }>;
}

export interface DoctorConsultation {
  id: string;
  consultationNumber: string;
  consultationDate: string;
  consultationType: string;
  status: string;
  chiefComplaint?: string;
  diagnosis?: string;
  notes?: string;
  followUpRequired: boolean;
  followUpDate?: string;
  billable: boolean;
  billed: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  patient: {
    id: string;
    patientNumber: string;
    firstName: string;
    lastName: string;
  };
  doctorId: string;
  appointmentId: string;
}

export interface CreateConsultationRequest {
  patientId: string;
  appointmentId: string;
  consultationType: 'INITIAL' | 'FOLLOW_UP' | 'PRE_OP' | 'POST_OP' | 'EMERGENCY';
  chiefComplaint?: string;
  consultationDate?: string;
}

export interface UpdateConsultationRequest {
  chiefComplaint?: string;
  diagnosis?: string;
  notes?: string;
  version?: number;
}

export interface CompleteConsultationRequest {
  diagnosis: string;
  notes?: string;
  followUpRequired?: boolean;
  followUpDate?: string;
  version?: number;
}

export interface ConsultationListResponse {
  data: DoctorConsultation[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface DoctorSurgery {
  id: string;
  caseNumber: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  status: string;
  patient: {
    id: string;
    patientNumber: string;
    firstName: string;
    lastName: string;
  };
  procedurePlan: {
    id: string;
    procedureName: string;
  };
}

class DoctorService {
  async getDashboardStats(): Promise<DoctorDashboardStats> {
    const response = await apiClient.get('/doctors/dashboard/stats');
    return response.data;
  }

  async getAssignedPatients(skip = 0, take = 20) {
    const response = await apiClient.get(`/doctors/patients?skip=${skip}&take=${take}`);
    return response.data;
  }

  async getConsultations(skip = 0, take = 20, filters?: { patientId?: string; status?: string }): Promise<ConsultationListResponse> {
    const params = new URLSearchParams({
      skip: skip.toString(),
      take: take.toString(),
    });
    if (filters?.patientId) params.append('patientId', filters.patientId);
    if (filters?.status) params.append('status', filters.status);

    const response = await apiClient.get(`/doctor/consultations?${params.toString()}`);
    return response.data;
  }

  async getConsultation(id: string): Promise<DoctorConsultation> {
    const response = await apiClient.get(`/doctor/consultations/${id}`);
    return response.data;
  }

  async createConsultation(data: CreateConsultationRequest): Promise<DoctorConsultation> {
    const response = await apiClient.post('/doctor/consultations', data);
    return response.data;
  }

  async updateConsultation(id: string, data: UpdateConsultationRequest): Promise<DoctorConsultation> {
    const response = await apiClient.patch(`/doctor/consultations/${id}`, data);
    return response.data;
  }

  async completeConsultation(id: string, data: CompleteConsultationRequest): Promise<DoctorConsultation> {
    const response = await apiClient.post(`/doctor/consultations/${id}/complete`, data);
    return response.data;
  }

  async getUpcomingSurgeries() {
    const response = await apiClient.get('/doctors/surgeries');
    return response.data;
  }

  async assignPatient(patientId: string, doctorId?: string, reason?: string) {
    const response = await apiClient.post('/doctors/patients/assign', {
      patientId,
      doctorId,
      reason,
    });
    return response.data;
  }

  async unassignPatient(patientId: string, reason?: string) {
    const response = await apiClient.post('/doctors/patients/unassign', {
      patientId,
      reason,
    });
    return response.data;
  }

  /**
   * Get all doctors (for patient booking)
   * GET /api/v1/doctors
   */
  async getAllDoctors(): Promise<Array<{
    id: string;
    firstName: string;
    lastName: string;
    title?: string;
    email?: string;
    department?: {
      id: string;
      name: string;
      code: string;
    };
    doctorProfile?: {
      id: string;
      specialty: string;
      bio: string;
      qualifications: string;
      experienceYears: number;
      profilePictureUrl?: string;
    };
  }>> {
    const response = await apiClient.get('/doctors');
    const data = (response as any).data || response;
    return Array.isArray(data) ? data : [];
  }
}

export const doctorService = new DoctorService();

