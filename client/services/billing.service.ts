import apiClient from './apiClient';
import { getApiUrl } from '@/lib/env';
import type { PaginatedResponse } from '@/types/api';
import type {
  Bill,
  BillLineItem,
  Payment,
  InsurancePolicy,
  InsuranceProvider,
  InsuranceClaim,
  BillingCode,
} from '@/types/domain';

/**
 * Billing service
 * Handles billing and payment API calls
 */
export const billingService = {
  /**
   * Get all bills with pagination
   */
  async getBills(skip = 0, take = 10): Promise<PaginatedResponse<Bill>> {
    const response = await apiClient.get<PaginatedResponse<Bill>>(
      getApiUrl('/billing/bills'),
      { params: { skip, take } }
    );
    return response.data;
  },

  /**
   * Get bill by ID
   */
  async getBillById(id: string): Promise<Bill> {
    const response = await apiClient.get<Bill>(getApiUrl(`/billing/bills/${id}`));
    return response.data;
  },

  /**
   * Create new bill
   */
  async createBill(data: Partial<Bill>): Promise<Bill> {
    const response = await apiClient.post<Bill>(getApiUrl('/billing/bills'), data);
    return response.data;
  },

  /**
   * Update bill
   */
  async updateBill(id: string, data: Partial<Bill>): Promise<Bill> {
    const response = await apiClient.patch<Bill>(
      getApiUrl(`/billing/bills/${id}`),
      data
    );
    return response.data;
  },

  /**
   * Get payments
   */
  async getPayments(
    patientId?: string,
    skip = 0,
    take = 10
  ): Promise<PaginatedResponse<Payment>> {
    const response = await apiClient.get<PaginatedResponse<Payment>>(
      getApiUrl('/billing/payments'),
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
   * Create payment
   */
  async createPayment(data: Partial<Payment>): Promise<Payment> {
    const response = await apiClient.post<Payment>(
      getApiUrl('/billing/payments'),
      data
    );
    return response.data;
  },

  /**
   * Get insurance providers
   */
  async getInsuranceProviders(): Promise<InsuranceProvider[]> {
    const response = await apiClient.get<InsuranceProvider[]>(
      getApiUrl('/billing/insurance-providers')
    );
    return response.data;
  },

  /**
   * Get insurance policies for a patient
   */
  async getPatientPolicies(patientId: string): Promise<InsurancePolicy[]> {
    const response = await apiClient.get<InsurancePolicy[]>(
      getApiUrl(`/billing/patients/${patientId}/policies`)
    );
    return response.data;
  },

  /**
   * Get insurance claims
   */
  async getClaims(
    billId?: string,
    skip = 0,
    take = 10
  ): Promise<PaginatedResponse<InsuranceClaim>> {
    const response = await apiClient.get<PaginatedResponse<InsuranceClaim>>(
      getApiUrl('/billing/claims'),
      {
        params: {
          billId,
          skip,
          take,
        },
      }
    );
    return response.data;
  },

  /**
   * Get billing codes
   */
  async getBillingCodes(codeType?: string): Promise<BillingCode[]> {
    const response = await apiClient.get<BillingCode[]>(
      getApiUrl('/billing/codes'),
      { params: { codeType } }
    );
    return response.data;
  },
};












