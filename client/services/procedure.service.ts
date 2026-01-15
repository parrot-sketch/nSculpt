import apiClient from './apiClient';
import { getApiUrl } from '@/lib/env';
import type {
  ProcedurePlan,
  CreateProcedurePlanDto,
  UpdateProcedurePlanDto,
  AddInventoryRequirementDto,
  ProcedureInventoryRequirement,
} from '@/types/procedure';

/**
 * Procedure Plan Service
 * Handles all procedure plan-related API calls
 * 
 * Note: Backend API endpoints may need to be created if they don't exist yet.
 * Expected endpoints:
 * - POST /api/v1/procedure-plans
 * - GET /api/v1/procedure-plans?patientId=...
 * - GET /api/v1/procedure-plans/:id
 * - PATCH /api/v1/procedure-plans/:id
 * - POST /api/v1/procedure-plans/:id/inventory-requirements
 * - DELETE /api/v1/procedure-plans/:id/inventory-requirements/:requirementId
 */
export const procedureService = {
  /**
   * Get all procedure plans for a patient
   */
  async getPlansByPatient(patientId: string): Promise<ProcedurePlan[]> {
    const response = await apiClient.get<{ data: ProcedurePlan[] }>(
      getApiUrl('/procedure-plans'),
      {
        params: { patientId },
      }
    );
    return response.data.data;
  },

  /**
   * Get procedure plan by ID
   */
  async getPlanById(id: string): Promise<ProcedurePlan> {
    const response = await apiClient.get<ProcedurePlan>(
      getApiUrl(`/procedure-plans/${id}`)
    );
    return response.data;
  },

  /**
   * Create new procedure plan
   */
  async createPlan(data: CreateProcedurePlanDto): Promise<ProcedurePlan> {
    const response = await apiClient.post<ProcedurePlan>(
      getApiUrl('/procedure-plans'),
      data
    );
    return response.data;
  },

  /**
   * Update procedure plan
   */
  async updatePlan(
    id: string,
    data: UpdateProcedurePlanDto
  ): Promise<ProcedurePlan> {
    const response = await apiClient.patch<ProcedurePlan>(
      getApiUrl(`/procedure-plans/${id}`),
      data
    );
    return response.data;
  },

  /**
   * Approve procedure plan
   */
  async approvePlan(id: string): Promise<ProcedurePlan> {
    const response = await apiClient.post<ProcedurePlan>(
      getApiUrl(`/procedure-plans/${id}/approve`)
    );
    return response.data;
  },

  /**
   * Add inventory requirement to procedure plan
   */
  async addInventoryRequirement(
    data: AddInventoryRequirementDto
  ): Promise<ProcedureInventoryRequirement> {
    const response = await apiClient.post<ProcedureInventoryRequirement>(
      getApiUrl(`/procedure-plans/${data.planId}/inventory-requirements`),
      data
    );
    return response.data;
  },

  /**
   * Remove inventory requirement from procedure plan
   */
  async removeInventoryRequirement(
    planId: string,
    requirementId: string
  ): Promise<void> {
    await apiClient.delete(
      getApiUrl(`/procedure-plans/${planId}/inventory-requirements/${requirementId}`)
    );
  },

  /**
   * Generate quote for procedure plan
   */
  async generateQuote(id: string): Promise<{ pdfUrl: string; totalCost: number }> {
    const response = await apiClient.post<{ pdfUrl: string; totalCost: number }>(
      getApiUrl(`/procedure-plans/${id}/quote`)
    );
    return response.data;
  },
};









