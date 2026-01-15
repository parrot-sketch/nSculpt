import apiClient from './apiClient';
import { getApiUrl } from '@/lib/env';
import type { PaginatedResponse } from '@/types/api';
import type {
  InventoryItem,
  InventoryStock,
  InventoryTransaction,
  InventoryUsage,
  InventoryCategory,
  InventoryBatch,
} from '@/types/domain';

/**
 * Inventory service
 * Handles inventory management API calls
 */
export const inventoryService = {
  /**
   * Get all inventory items with pagination
   */
  async getItems(skip = 0, take = 10): Promise<PaginatedResponse<InventoryItem>> {
    const response = await apiClient.get<PaginatedResponse<InventoryItem>>(
      getApiUrl('/inventory/items'),
      { params: { skip, take } }
    );
    return response.data;
  },

  /**
   * Get inventory item by ID
   */
  async getItemById(id: string): Promise<InventoryItem> {
    const response = await apiClient.get<InventoryItem>(
      getApiUrl(`/inventory/items/${id}`)
    );
    return response.data;
  },

  /**
   * Create new inventory item
   */
  async createItem(data: Partial<InventoryItem>): Promise<InventoryItem> {
    const response = await apiClient.post<InventoryItem>(
      getApiUrl('/inventory/items'),
      data
    );
    return response.data;
  },

  /**
   * Update inventory item
   */
  async updateItem(id: string, data: Partial<InventoryItem>): Promise<InventoryItem> {
    const response = await apiClient.patch<InventoryItem>(
      getApiUrl(`/inventory/items/${id}`),
      data
    );
    return response.data;
  },

  /**
   * Get inventory stock levels
   */
  async getStock(itemId?: string, locationId?: string): Promise<InventoryStock[]> {
    const response = await apiClient.get<InventoryStock[]>(
      getApiUrl('/inventory/stock'),
      {
        params: {
          itemId,
          locationId,
        },
      }
    );
    return response.data;
  },

  /**
   * Get inventory transactions
   */
  async getTransactions(
    itemId?: string,
    caseId?: string,
    skip = 0,
    take = 10
  ): Promise<PaginatedResponse<InventoryTransaction>> {
    const response = await apiClient.get<PaginatedResponse<InventoryTransaction>>(
      getApiUrl('/inventory/transactions'),
      {
        params: {
          itemId,
          caseId,
          skip,
          take,
        },
      }
    );
    return response.data;
  },

  /**
   * Create inventory transaction
   */
  async createTransaction(
    data: Partial<InventoryTransaction>
  ): Promise<InventoryTransaction> {
    const response = await apiClient.post<InventoryTransaction>(
      getApiUrl('/inventory/transactions'),
      data
    );
    return response.data;
  },

  /**
   * Get inventory usage for a case
   */
  async getCaseUsage(caseId: string): Promise<InventoryUsage[]> {
    const response = await apiClient.get<InventoryUsage[]>(
      getApiUrl(`/inventory/usage/case/${caseId}`)
    );
    return response.data;
  },

  /**
   * Get inventory categories
   */
  async getCategories(): Promise<InventoryCategory[]> {
    const response = await apiClient.get<InventoryCategory[]>(
      getApiUrl('/inventory/categories')
    );
    return response.data;
  },

  /**
   * Get inventory batches
   */
  async getBatches(itemId?: string): Promise<InventoryBatch[]> {
    const response = await apiClient.get<InventoryBatch[]>(
      getApiUrl('/inventory/batches'),
      { params: { itemId } }
    );
    return response.data;
  },
};












