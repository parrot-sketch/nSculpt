import apiClient from './apiClient';
import type {
  AdminUser,
  AdminRole,
  AdminPermission,
  CreateUserRequest,
  UpdateUserRequest,
  AssignRoleRequest,
  CreateRoleRequest,
  UpdateRoleRequest,
  AssignPermissionRequest,
  UserQueryParams,
  PermissionQueryParams,
  UsersListResponse,
  PermissionsListResponse,
  PermissionStats,
  AdminDashboardStats,
} from '@/types/admin';
import type {
  Department,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
  DepartmentQueryParams,
  DepartmentsListResponse,
  OperatingTheater,
  CreateTheaterRequest,
  UpdateTheaterRequest,
  TheaterQueryParams,
  TheatersListResponse,
  InventoryCategory,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategoryQueryParams,
  CategoriesListResponse,
  Vendor,
  CreateVendorRequest,
  UpdateVendorRequest,
  VendorQueryParams,
  VendorsListResponse,
  BillingCode,
  CreateBillingCodeRequest,
  UpdateBillingCodeRequest,
  BillingCodeQueryParams,
  BillingCodesListResponse,
  InsuranceProvider,
  CreateInsuranceProviderRequest,
  UpdateInsuranceProviderRequest,
  InsuranceProviderQueryParams,
  InsuranceProvidersListResponse,
  FeeSchedule,
  CreateFeeScheduleRequest,
  UpdateFeeScheduleRequest,
  CreateFeeScheduleItemRequest,
  UpdateFeeScheduleItemRequest,
  FeeScheduleQueryParams,
  FeeSchedulesListResponse,
} from '@/types/admin-system-config';
import type {
  DataAccessLog,
  AccessLogQueryParams,
  AccessLogsListResponse,
  DomainEvent,
  DomainEventQueryParams,
  DomainEventsListResponse,
  EventChain,
  Session,
  SessionQueryParams,
  SessionsListResponse,
  RevokeSessionRequest,
  HipaaReportQueryParams,
  HipaaReport,
} from '@/types/admin-audit';
import type {
  UserActivityQueryParams,
  UserActivityReport,
  PermissionUsageQueryParams,
  PermissionUsageReport,
} from '@/types/admin-reports';
import type {
  RecordMergeHistory,
  MergeRecordsRequest,
  ReverseMergeRequest,
  SystemHealth,
} from '@/types/admin-medical-records';

/**
 * Admin Service
 * 
 * Type-safe API client for admin endpoints.
 * All endpoints require ADMIN role and appropriate permissions.
 */
export const adminService = {
  // ============================================================================
  // Dashboard
  // ============================================================================

  /**
   * Get admin dashboard statistics
   */
  async getDashboardStats(): Promise<AdminDashboardStats> {
    const response = await apiClient.get<AdminDashboardStats>('/admin/dashboard');
    return response.data;
  },

  // ============================================================================
  // User Management
  // ============================================================================

  /**
   * List users with filters and pagination
   */
  async listUsers(params?: UserQueryParams): Promise<UsersListResponse> {
    const response = await apiClient.get<UsersListResponse>('/admin/users', { params });
    return response.data;
  },

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<AdminUser> {
    const response = await apiClient.get<AdminUser>(`/admin/users/${id}`);
    return response.data;
  },

  /**
   * Create a new user
   */
  async createUser(data: CreateUserRequest): Promise<AdminUser> {
    const response = await apiClient.post<AdminUser>('/admin/users', data);
    return response.data;
  },

  /**
   * Update user
   */
  async updateUser(id: string, data: UpdateUserRequest): Promise<AdminUser> {
    const response = await apiClient.patch<AdminUser>(`/admin/users/${id}`, data);
    return response.data;
  },

  /**
   * Deactivate user (soft delete)
   */
  async deactivateUser(id: string): Promise<void> {
    await apiClient.delete(`/admin/users/${id}`);
  },

  /**
   * Activate user (reactivate deactivated user)
   */
  async activateUser(id: string): Promise<AdminUser> {
    const response = await apiClient.patch<AdminUser>(`/admin/users/${id}/activate`);
    return response.data;
  },

  /**
   * Permanently delete user account (hard delete)
   * WARNING: This is irreversible
   */
  async deleteUser(id: string): Promise<void> {
    await apiClient.delete(`/admin/users/${id}/permanent`);
  },

  /**
   * Update user status (Activate/Suspend)
   */
  async updateUserStatus(userId: string, active: boolean): Promise<AdminUser> {
    const response = await apiClient.patch<AdminUser>(`/admin/users/${userId}`, { active });
    return response.data;
  },

  /**
   * Update user role
   * Note: This simplifies the role assignment by overwriting the user's role 
   * or updating their primary role depending on backend implementation.
   * Based on requirements, we act as if we are setting the single authoritative role.
   */
  async updateUserRole(userId: string, roleCode: string): Promise<AdminUser> {
    // Currently, we use the updateUser endpoint if it supports roleId/roleCode
    // OR we might need to look up role ID first. 
    // Assuming backend endpoint /admin/users/:id accepts { roleId: ... } or similar.
    // Based on `UpdateUserRequest` in admin.ts, it takes `roleId`.

    // We need to find the role ID for the given code.
    // This is a bit inefficient (fetching all roles) but ensures safety.
    // In a real app we might cache roles or have a direct 'update-role' endpoint.
    const roles = await this.listRoles();
    const role = roles.find(r => r.code === roleCode);

    if (!role) {
      throw new Error(`Invalid role code: ${roleCode}`);
    }

    const response = await apiClient.patch<AdminUser>(`/admin/users/${userId}`, { roleId: role.id });
    return response.data;
  },

  /**
   * Assign role to user
   */
  async assignRole(userId: string, data: AssignRoleRequest): Promise<AdminRoleAssignment> {
    const response = await apiClient.post<AdminRoleAssignment>(
      `/admin/users/${userId}/roles`,
      data,
    );
    return response.data;
  },

  /**
   * Revoke role from user
   */
  async revokeRole(userId: string, roleId: string): Promise<void> {
    await apiClient.delete(`/admin/users/${userId}/roles/${roleId}`);
  },

  /**
   * Reset user password
   */
  async resetPassword(userId: string): Promise<{ temporaryPassword: string }> {
    const response = await apiClient.post<{ temporaryPassword: string }>(
      `/admin/users/${userId}/reset-password`,
    );
    return response.data;
  },

  /**
   * Get user sessions
   */
  async getUserSessions(userId: string): Promise<Array<{
    id: string;
    deviceInfo?: string;
    ipAddress?: string;
    userAgent?: string;
    startedAt: string;
    lastActivityAt: string;
    expiresAt: string;
  }>> {
    const response = await apiClient.get(`/admin/users/${userId}/sessions`);
    return response.data;
  },

  // ============================================================================
  // Role Management
  // ============================================================================

  /**
   * List all roles
   */
  async listRoles(includeInactive?: boolean): Promise<AdminRole[]> {
    const response = await apiClient.get<AdminRole[]>('/admin/roles', {
      params: { includeInactive },
    });
    return response.data;
  },

  /**
   * Get role by ID
   */
  async getRoleById(id: string): Promise<AdminRole> {
    const response = await apiClient.get<AdminRole>(`/admin/roles/${id}`);
    return response.data;
  },

  /**
   * Create a new role
   */
  async createRole(data: CreateRoleRequest): Promise<AdminRole> {
    const response = await apiClient.post<AdminRole>('/admin/roles', data);
    return response.data;
  },

  /**
   * Update role
   */
  async updateRole(id: string, data: UpdateRoleRequest): Promise<AdminRole> {
    const response = await apiClient.patch<AdminRole>(`/admin/roles/${id}`, data);
    return response.data;
  },

  /**
   * Deactivate role
   */
  async deactivateRole(id: string): Promise<void> {
    await apiClient.delete(`/admin/roles/${id}`);
  },

  /**
   * Assign permission to role
   */
  async assignPermission(roleId: string, data: AssignPermissionRequest): Promise<{
    id: string;
    roleId: string;
    permissionId: string;
    permission: AdminPermission;
    role: AdminRole;
  }> {
    const response = await apiClient.post(`/admin/roles/${roleId}/permissions`, data);
    return response.data;
  },

  /**
   * Remove permission from role
   */
  async removePermission(roleId: string, permissionId: string): Promise<void> {
    await apiClient.delete(`/admin/roles/${roleId}/permissions/${permissionId}`);
  },

  /**
   * Get users with this role
   */
  async getUsersWithRole(roleId: string): Promise<AdminUser[]> {
    const response = await apiClient.get<AdminUser[]>(`/admin/roles/${roleId}/users`);
    return response.data;
  },

  // ============================================================================
  // Permission Management
  // ============================================================================

  /**
   * List permissions with filters
   */
  async listPermissions(params?: PermissionQueryParams): Promise<PermissionsListResponse> {
    const response = await apiClient.get<PermissionsListResponse>('/admin/permissions', { params });
    return response.data;
  },

  /**
   * Get permission by ID
   */
  async getPermissionById(id: string): Promise<AdminPermission> {
    const response = await apiClient.get<AdminPermission>(`/admin/permissions/${id}`);
    return response.data;
  },

  /**
   * Get permissions by domain
   */
  async getPermissionsByDomain(domain: string): Promise<AdminPermission[]> {
    const response = await apiClient.get<AdminPermission[]>(`/admin/permissions/by-domain/${domain}`);
    return response.data;
  },

  /**
   * Get roles with this permission
   */
  async getRolesWithPermission(permissionId: string): Promise<AdminRole[]> {
    const response = await apiClient.get<AdminRole[]>(`/admin/permissions/${permissionId}/roles`);
    return response.data;
  },

  /**
   * Get permission statistics
   */
  async getPermissionStats(): Promise<PermissionStats> {
    const response = await apiClient.get<PermissionStats>('/admin/permissions/stats');
    return response.data;
  },

  // ============================================================================
  // System Configuration - Departments
  // ============================================================================

  async listDepartments(params?: DepartmentQueryParams): Promise<DepartmentsListResponse> {
    const response = await apiClient.get<DepartmentsListResponse>('/admin/departments', { params });
    return response.data;
  },

  async getDepartmentById(id: string): Promise<Department> {
    const response = await apiClient.get<Department>(`/admin/departments/${id}`);
    return response.data;
  },

  async createDepartment(data: CreateDepartmentRequest): Promise<Department> {
    const response = await apiClient.post<Department>('/admin/departments', data);
    return response.data;
  },

  async updateDepartment(id: string, data: UpdateDepartmentRequest): Promise<Department> {
    const response = await apiClient.patch<Department>(`/admin/departments/${id}`, data);
    return response.data;
  },

  async deactivateDepartment(id: string): Promise<void> {
    await apiClient.delete(`/admin/departments/${id}`);
  },

  // ============================================================================
  // System Configuration - Operating Theaters
  // ============================================================================

  async listTheaters(params?: TheaterQueryParams): Promise<TheatersListResponse> {
    const response = await apiClient.get<TheatersListResponse>('/admin/theaters', { params });
    return response.data;
  },

  async getTheaterById(id: string): Promise<OperatingTheater> {
    const response = await apiClient.get<OperatingTheater>(`/admin/theaters/${id}`);
    return response.data;
  },

  async createTheater(data: CreateTheaterRequest): Promise<OperatingTheater> {
    const response = await apiClient.post<OperatingTheater>('/admin/theaters', data);
    return response.data;
  },

  async updateTheater(id: string, data: UpdateTheaterRequest): Promise<OperatingTheater> {
    const response = await apiClient.patch<OperatingTheater>(`/admin/theaters/${id}`, data);
    return response.data;
  },

  async deactivateTheater(id: string): Promise<void> {
    await apiClient.delete(`/admin/theaters/${id}`);
  },

  // ============================================================================
  // System Configuration - Inventory Categories
  // ============================================================================

  async listCategories(params?: CategoryQueryParams): Promise<CategoriesListResponse> {
    const response = await apiClient.get<CategoriesListResponse>('/admin/categories', { params });
    return response.data;
  },

  async getCategoryById(id: string): Promise<InventoryCategory> {
    const response = await apiClient.get<InventoryCategory>(`/admin/categories/${id}`);
    return response.data;
  },

  async createCategory(data: CreateCategoryRequest): Promise<InventoryCategory> {
    const response = await apiClient.post<InventoryCategory>('/admin/categories', data);
    return response.data;
  },

  async updateCategory(id: string, data: UpdateCategoryRequest): Promise<InventoryCategory> {
    const response = await apiClient.patch<InventoryCategory>(`/admin/categories/${id}`, data);
    return response.data;
  },

  async deactivateCategory(id: string): Promise<void> {
    await apiClient.delete(`/admin/categories/${id}`);
  },

  // ============================================================================
  // System Configuration - Vendors
  // ============================================================================

  async listVendors(params?: VendorQueryParams): Promise<VendorsListResponse> {
    const response = await apiClient.get<VendorsListResponse>('/admin/vendors', { params });
    return response.data;
  },

  async getVendorById(id: string): Promise<Vendor> {
    const response = await apiClient.get<Vendor>(`/admin/vendors/${id}`);
    return response.data;
  },

  async createVendor(data: CreateVendorRequest): Promise<Vendor> {
    const response = await apiClient.post<Vendor>('/admin/vendors', data);
    return response.data;
  },

  async updateVendor(id: string, data: UpdateVendorRequest): Promise<Vendor> {
    const response = await apiClient.patch<Vendor>(`/admin/vendors/${id}`, data);
    return response.data;
  },

  async deactivateVendor(id: string): Promise<void> {
    await apiClient.delete(`/admin/vendors/${id}`);
  },

  // ============================================================================
  // System Configuration - Billing Codes
  // ============================================================================

  async listBillingCodes(params?: BillingCodeQueryParams): Promise<BillingCodesListResponse> {
    const response = await apiClient.get<BillingCodesListResponse>('/admin/billing-codes', { params });
    return response.data;
  },

  async getBillingCodeById(id: string): Promise<BillingCode> {
    const response = await apiClient.get<BillingCode>(`/admin/billing-codes/${id}`);
    return response.data;
  },

  async createBillingCode(data: CreateBillingCodeRequest): Promise<BillingCode> {
    const response = await apiClient.post<BillingCode>('/admin/billing-codes', data);
    return response.data;
  },

  async updateBillingCode(id: string, data: UpdateBillingCodeRequest): Promise<BillingCode> {
    const response = await apiClient.patch<BillingCode>(`/admin/billing-codes/${id}`, data);
    return response.data;
  },

  async deactivateBillingCode(id: string): Promise<void> {
    await apiClient.delete(`/admin/billing-codes/${id}`);
  },

  // ============================================================================
  // System Configuration - Insurance Providers
  // ============================================================================

  async listInsuranceProviders(params?: InsuranceProviderQueryParams): Promise<InsuranceProvidersListResponse> {
    const response = await apiClient.get<InsuranceProvidersListResponse>('/admin/insurance-providers', { params });
    return response.data;
  },

  async getInsuranceProviderById(id: string): Promise<InsuranceProvider> {
    const response = await apiClient.get<InsuranceProvider>(`/admin/insurance-providers/${id}`);
    return response.data;
  },

  async createInsuranceProvider(data: CreateInsuranceProviderRequest): Promise<InsuranceProvider> {
    const response = await apiClient.post<InsuranceProvider>('/admin/insurance-providers', data);
    return response.data;
  },

  async updateInsuranceProvider(id: string, data: UpdateInsuranceProviderRequest): Promise<InsuranceProvider> {
    const response = await apiClient.patch<InsuranceProvider>(`/admin/insurance-providers/${id}`, data);
    return response.data;
  },

  async deactivateInsuranceProvider(id: string): Promise<void> {
    await apiClient.delete(`/admin/insurance-providers/${id}`);
  },

  // ============================================================================
  // System Configuration - Fee Schedules
  // ============================================================================

  async listFeeSchedules(params?: FeeScheduleQueryParams): Promise<FeeSchedulesListResponse> {
    const response = await apiClient.get<FeeSchedulesListResponse>('/admin/fee-schedules', { params });
    return response.data;
  },

  async getFeeScheduleById(id: string): Promise<FeeSchedule> {
    const response = await apiClient.get<FeeSchedule>(`/admin/fee-schedules/${id}`);
    return response.data;
  },

  async createFeeSchedule(data: CreateFeeScheduleRequest): Promise<FeeSchedule> {
    const response = await apiClient.post<FeeSchedule>('/admin/fee-schedules', data);
    return response.data;
  },

  async updateFeeSchedule(id: string, data: UpdateFeeScheduleRequest): Promise<FeeSchedule> {
    const response = await apiClient.patch<FeeSchedule>(`/admin/fee-schedules/${id}`, data);
    return response.data;
  },

  async deactivateFeeSchedule(id: string): Promise<void> {
    await apiClient.delete(`/admin/fee-schedules/${id}`);
  },

  async createFeeScheduleItem(feeScheduleId: string, data: CreateFeeScheduleItemRequest): Promise<any> {
    const response = await apiClient.post(`/admin/fee-schedules/${feeScheduleId}/items`, data);
    return response.data;
  },

  async updateFeeScheduleItem(feeScheduleId: string, itemId: string, data: UpdateFeeScheduleItemRequest): Promise<any> {
    const response = await apiClient.patch(`/admin/fee-schedules/${feeScheduleId}/items/${itemId}`, data);
    return response.data;
  },

  async deleteFeeScheduleItem(feeScheduleId: string, itemId: string): Promise<void> {
    await apiClient.delete(`/admin/fee-schedules/${feeScheduleId}/items/${itemId}`);
  },

  // ============================================================================
  // Audit & Compliance - Access Logs
  // ============================================================================

  async listAccessLogs(params?: AccessLogQueryParams): Promise<AccessLogsListResponse> {
    const response = await apiClient.get<AccessLogsListResponse>('/admin/audit-logs', { params });
    return response.data;
  },

  // ============================================================================
  // Audit & Compliance - Domain Events
  // ============================================================================

  async listDomainEvents(params?: DomainEventQueryParams): Promise<DomainEventsListResponse> {
    const response = await apiClient.get<DomainEventsListResponse>('/admin/audit/domain-events', { params });
    return response.data;
  },

  async getEventChain(eventId: string): Promise<EventChain> {
    const response = await apiClient.get<EventChain>(`/admin/audit/domain-events/${eventId}/chain`);
    return response.data;
  },

  async getCorrelatedEvents(correlationId: string): Promise<DomainEvent[]> {
    const response = await apiClient.get<DomainEvent[]>(`/admin/audit/domain-events/correlated/${correlationId}`);
    return response.data;
  },

  // ============================================================================
  // Audit & Compliance - Sessions
  // ============================================================================

  async listSessions(params?: SessionQueryParams): Promise<SessionsListResponse> {
    const response = await apiClient.get<SessionsListResponse>('/admin/audit/sessions', { params });
    return response.data;
  },

  async revokeSession(sessionId: string, data: RevokeSessionRequest): Promise<void> {
    await apiClient.post(`/admin/audit/sessions/${sessionId}/revoke`, data);
  },

  // ============================================================================
  // Audit & Compliance - HIPAA Reports
  // ============================================================================

  async generateHipaaReport(params: HipaaReportQueryParams): Promise<HipaaReport> {
    const response = await apiClient.get<HipaaReport>('/admin/audit/hipaa-report', { params });
    return response.data;
  },

  // ============================================================================
  // Medical Records Admin - Merges
  // ============================================================================

  async mergeRecords(sourceRecordId: string, data: MergeRecordsRequest): Promise<{ success: boolean; mergeEventId: string }> {
    const response = await apiClient.post(`/admin/medical-records/${sourceRecordId}/merge`, data);
    return response.data;
  },

  async getMergeHistory(recordId: string): Promise<RecordMergeHistory[]> {
    const response = await apiClient.get<RecordMergeHistory[]>(`/admin/medical-records/${recordId}/merge-history`);
    return response.data;
  },

  async reverseMerge(mergeId: string, data: ReverseMergeRequest): Promise<{ success: boolean; reversalEventId: string; mergeHistoryId: string }> {
    const response = await apiClient.post(`/admin/medical-records/merge-history/${mergeId}/reverse`, data);
    return response.data;
  },

  // ============================================================================
  // System Health
  // ============================================================================

  async getSystemHealth(): Promise<SystemHealth> {
    const response = await apiClient.get<SystemHealth>('/admin/system-health');
    return response.data;
  },

  // ============================================================================
  // Reports - User Activity
  // ============================================================================

  async generateUserActivityReport(params: UserActivityQueryParams): Promise<UserActivityReport> {
    const response = await apiClient.get<UserActivityReport>('/admin/reports/user-activity', { params });
    return response.data;
  },

  // ============================================================================
  // Reports - Permission Usage
  // ============================================================================

  async generatePermissionUsageReport(params?: PermissionUsageQueryParams): Promise<PermissionUsageReport> {
    const response = await apiClient.get<PermissionUsageReport>('/admin/reports/permission-usage', { params });
    return response.data;
  },
};

// Re-export type for convenience
export type AdminRoleAssignment = {
  id: string;
  roleId: string;
  role: AdminRole;
  active: boolean;
  validFrom: string;
  validUntil?: string;
};

