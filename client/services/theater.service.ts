import apiClient from './apiClient';
import { getApiUrl } from '@/lib/env';
import type { PaginatedResponse } from '@/types/api';
import type { SurgicalCase, TheaterReservation, OperatingTheater, ResourceAllocation } from '@/types/domain';

/**
 * Theater service
 * Handles surgical case and theater reservation API calls
 */
export const theaterService = {
  /**
   * Get all surgical cases with pagination
   */
  async getCases(skip = 0, take = 10): Promise<PaginatedResponse<SurgicalCase>> {
    const response = await apiClient.get<PaginatedResponse<SurgicalCase>>(
      getApiUrl('/theater/cases'),
      { params: { skip, take } }
    );
    return response.data;
  },

  /**
   * Get surgical case by ID
   */
  async getCaseById(id: string): Promise<SurgicalCase> {
    const response = await apiClient.get<SurgicalCase>(
      getApiUrl(`/theater/cases/${id}`)
    );
    return response.data;
  },

  /**
   * Create new surgical case
   */
  async createCase(data: Partial<SurgicalCase>): Promise<SurgicalCase> {
    const response = await apiClient.post<SurgicalCase>(
      getApiUrl('/theater/cases'),
      data
    );
    return response.data;
  },

  /**
   * Update surgical case
   */
  async updateCase(id: string, data: Partial<SurgicalCase>): Promise<SurgicalCase> {
    const response = await apiClient.patch<SurgicalCase>(
      getApiUrl(`/theater/cases/${id}`),
      data
    );
    return response.data;
  },

  /**
   * Update case status
   */
  async updateCaseStatus(
    id: string,
    status: string,
    reason?: string
  ): Promise<SurgicalCase> {
    const response = await apiClient.patch<SurgicalCase>(
      getApiUrl(`/theater/cases/${id}/status`),
      { status, reason }
    );
    return response.data;
  },

  /**
   * Get operating theaters
   */
  async getTheaters(): Promise<OperatingTheater[]> {
    const response = await apiClient.get<OperatingTheater[]>(
      getApiUrl('/theater/theaters')
    );
    return response.data;
  },

  /**
   * Get theater reservations
   */
  async getReservations(
    theaterId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<TheaterReservation[]> {
    const response = await apiClient.get<TheaterReservation[]>(
      getApiUrl('/theater/reservations'),
      {
        params: {
          theaterId,
          startDate,
          endDate,
        },
      }
    );
    return response.data;
  },

  /**
   * Create theater reservation
   */
  async createReservation(
    data: Partial<TheaterReservation>
  ): Promise<TheaterReservation> {
    const response = await apiClient.post<TheaterReservation>(
      getApiUrl('/theater/reservations'),
      data
    );
    return response.data;
  },

  /**
   * Get resource allocations for a case
   */
  async getResourceAllocations(caseId: string): Promise<ResourceAllocation[]> {
    const response = await apiClient.get<ResourceAllocation[]>(
      getApiUrl(`/theater/cases/${caseId}/allocations`)
    );
    return response.data;
  },
};












