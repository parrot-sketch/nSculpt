import apiClient from './apiClient';

/**
 * Patient Allergy type
 */
export interface PatientAllergy {
  id: string;
  allergen: string;
  allergyType: string;
  severity: string;
  reaction?: string;
  active: boolean;
}

/**
 * Patient Contact (Next of Kin) type
 */
export interface PatientContact {
  id: string;
  firstName: string;
  lastName: string;
  relationship: string;
  phone?: string;
  email?: string;
  isNextOfKin: boolean;
  isEmergencyContact: boolean;
}

/**
 * Patient type definition
 */
export interface Patient {
  id: string;
  patientNumber?: string;
  mrn?: string;
  fileNumber?: string; // NS001, NS002, etc.
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth?: string | Date;
  age?: number; // Calculated server-side
  gender?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  occupation?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  city?: string; // Residence
  allergies?: PatientAllergy[]; // Drug allergies
  contacts?: PatientContact[]; // Next of kin and emergency contacts
  // Optimized fields for list view
  nextOfKinName?: string; // Combined name for list display
  nextOfKinRelationship?: string;
  nextOfKinContact?: string;
  doctorInChargeName?: string; // Combined name for list display
  doctorInCharge?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  status?: string;
  isRestricted?: boolean;
  restrictedAt?: string;
  restrictedBy?: string;
  restrictionReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Patients list response
 */
export interface PatientsListResponse {
  data: Patient[];
  total?: number;
  skip?: number;
  take?: number;
}

/**
 * Patient Service
 * 
 * Type-safe API client for patient endpoints.
 */
export const patientService = {
  /**
   * Get list of patients
   * @param skip - Number of records to skip
   * @param take - Number of records to take
   * @param search - Optional search query
   */
  async getPatients(skip: number = 0, take: number = 20, search?: string): Promise<PatientsListResponse> {
    const params = new URLSearchParams();
    params.append('skip', skip.toString());
    params.append('take', take.toString());
    if (search) {
      params.append('search', search);
    }

    const response = await apiClient.get<Patient[] | PatientsListResponse>(
      `/patients?${params.toString()}`
    );

    // Axios returns { data, status, headers, ... }, we need response.data
    const data = (response as any).data || response;

    // Backend returns { data, total, skip, take } format
    if (data && typeof data === 'object' && 'data' in data) {
      return {
        data: Array.isArray(data.data) ? data.data : [],
        total: data.total || 0,
        skip: data.skip !== undefined ? data.skip : skip,
        take: data.take !== undefined ? data.take : take,
      };
    }

    // Handle array response (fallback)
    if (Array.isArray(data)) {
      return {
        data: data,
        total: data.length,
        skip,
        take,
      };
    }

    // Default empty response
    return {
      data: [],
      total: 0,
      skip,
      take,
    };
  },

  /**
   * Get a single patient by ID
   */
  async getPatient(id: string): Promise<Patient> {
    const response = await apiClient.get<Patient>(`/patients/${id}`);
    // Axios returns { data, status, headers, ... }, we need response.data
    return (response as any).data || response;
  },

  /**
   * Create a new patient
   */
  async createPatient(patient: Partial<Patient>): Promise<Patient> {
    const response = await apiClient.post<Patient>('/patients', patient);
    // Axios returns { data, status, headers, ... }, we need response.data
    const patientData = (response as any).data || response;
    // Ensure we have a valid ID
    if (!patientData?.id) {
      console.error('Patient created but no ID in response:', patientData);
      throw new Error('Invalid response from patient creation API: missing patient ID');
    }
    return patientData as Patient;
  },

  /**
   * Update a patient
   */
  async updatePatient(id: string, patient: Partial<Patient>): Promise<Patient> {
    const response = await apiClient.patch<Patient>(`/patients/${id}`, patient);
    // Axios returns { data, status, headers, ... }, we need response.data
    return (response as any).data || response;
  },

  /**
   * Delete a patient
   */
  async deletePatient(id: string): Promise<void> {
    await apiClient.delete(`/patients/${id}`);
  },

  /**
   * Get active consents for a patient
   */
  async getActiveConsents(patientId: string): Promise<any[]> {
    const response = await apiClient.get<any[]>(`/patients/${patientId}/consents?status=active`);
    const data = (response as any).data || response;
    return Array.isArray(data) ? data : [];
  },

  /**
   * Get revoked consents for a patient
   */
  async getRevokedConsents(patientId: string): Promise<any[]> {
    const response = await apiClient.get<any[]>(`/patients/${patientId}/consents?status=revoked`);
    const data = (response as any).data || response;
    return Array.isArray(data) ? data : [];
  },

  /**
   * Get all consents for a patient
   */
  async getPatientConsents(patientId: string, archived?: boolean): Promise<any[]> {
    const params = archived ? '?archived=true' : '';
    const response = await apiClient.get<any[]>(`/patients/${patientId}/consents${params}`);
    const data = (response as any).data || response;
    return Array.isArray(data) ? data : [];
  },

  /**
   * Get current patient's own profile (self-service)
   * GET /api/v1/patients/me
   */
  async getMyProfile(): Promise<Patient> {
    const response = await apiClient.get<Patient>('/patients/me');
    return (response as any).data || response;
  },

  /**
   * Update current patient's own profile (self-service)
   * PATCH /api/v1/patients/me
   * Only allows updating demographic and contact fields
   */
  async updateMyProfile(patient: Partial<Patient>): Promise<Patient> {
    const response = await apiClient.patch<Patient>('/patients/me', patient);
    return (response as any).data || response;
  },
};
