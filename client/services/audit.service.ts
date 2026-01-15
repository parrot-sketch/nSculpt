import apiClient from './apiClient';
import { getApiUrl } from '@/lib/env';
import type { PaginatedResponse } from '@/types/api';

export interface DataAccessLog {
  id: string;
  userId: string;
  resourceType: string;
  resourceId: string;
  action: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  // Add more fields as needed
}

/**
 * Audit service
 * Handles audit log API calls
 */
export const auditService = {
  /**
   * Get data access logs with pagination
   */
  async getDataAccessLogs(
    skip = 0,
    take = 10
  ): Promise<PaginatedResponse<DataAccessLog>> {
    const response = await apiClient.get<PaginatedResponse<DataAccessLog>>(
      getApiUrl('/audit/data-access'),
      {
        params: { skip, take },
      }
    );
    return response.data;
  },

  /**
   * Get data access logs for a specific user
   */
  async getUserAccessLogs(
    userId: string,
    skip = 0,
    take = 10
  ): Promise<PaginatedResponse<DataAccessLog>> {
    const response = await apiClient.get<PaginatedResponse<DataAccessLog>>(
      getApiUrl(`/audit/data-access/user/${userId}`),
      {
        params: { skip, take },
      }
    );
    return response.data;
  },
};












