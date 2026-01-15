import apiClient from './apiClient';
import { getApiUrl } from '@/lib/env';
import type { PaginatedResponse } from '@/types/api';
import type {
  MedicalRecord,
  ClinicalNote,
  MedicalRecordAttachment,
} from '@/types/domain';

/**
 * Medical records service
 * Handles medical records API calls
 */
export const medicalRecordsService = {
  /**
   * Get medical records with pagination
   */
  async getRecords(
    patientId?: string,
    skip = 0,
    take = 10
  ): Promise<PaginatedResponse<MedicalRecord>> {
    const response = await apiClient.get<PaginatedResponse<MedicalRecord>>(
      getApiUrl('/medical-records'),
      {
        params: {
          patientId,
          skip,
          take,
        },
      }
    );
    return response.data;
  },

  /**
   * Get medical record by ID
   */
  async getRecordById(id: string): Promise<MedicalRecord> {
    const response = await apiClient.get<MedicalRecord>(
      getApiUrl(`/medical-records/${id}`)
    );
    return response.data;
  },

  /**
   * Create medical record
   */
  async createRecord(data: Partial<MedicalRecord>): Promise<MedicalRecord> {
    const response = await apiClient.post<MedicalRecord>(
      getApiUrl('/medical-records'),
      data
    );
    return response.data;
  },

  /**
   * Get clinical notes for a record
   */
  async getClinicalNotes(recordId: string): Promise<ClinicalNote[]> {
    const response = await apiClient.get<ClinicalNote[]>(
      getApiUrl(`/medical-records/${recordId}/notes`)
    );
    return response.data;
  },

  /**
   * Create clinical note
   */
  async createClinicalNote(
    recordId: string,
    data: Partial<ClinicalNote>
  ): Promise<ClinicalNote> {
    const response = await apiClient.post<ClinicalNote>(
      getApiUrl(`/medical-records/${recordId}/notes`),
      data
    );
    return response.data;
  },

  /**
   * Get attachments for a record
   */
  async getAttachments(recordId: string): Promise<MedicalRecordAttachment[]> {
    const response = await apiClient.get<MedicalRecordAttachment[]>(
      getApiUrl(`/medical-records/${recordId}/attachments`)
    );
    return response.data;
  },
};












