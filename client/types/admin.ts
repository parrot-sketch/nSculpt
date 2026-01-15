/**
 * Admin Module Types
 * 
 * Type-safe types for admin functionality.
 * Aligned with backend Prisma types.
 */

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  title?: string;
  employeeId?: string;
  departmentId?: string;
  active: boolean;
  isTheaterEligible: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  department?: {
    id: string;
    code: string;
    name: string;
  };
  roleAssignments?: AdminRoleAssignment[];
  temporaryPassword?: string;
}

export interface AdminRoleAssignment {
  id: string;
  roleId: string;
  role: AdminRole;
  active: boolean;
  validFrom: string;
  validUntil?: string;
}

export interface AdminRole {
  id: string;
  code: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  permissions?: AdminPermission[];
  _count?: {
    userAssignments: number;
  };
}

export interface AdminPermission {
  id: string;
  code: string;
  name: string;
  description?: string;
  domain: string;
  resource?: string;
  action: string;
  rolePermissions?: Array<{
    role: {
      id: string;
      code: string;
      name: string;
      active: boolean;
    };
  }>;
  _count?: {
    rolePermissions: number;
  };
}

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  title?: string;
  employeeId?: string;
  departmentId?: string;
  roleId?: string;
  active?: boolean;
  isTheaterEligible?: boolean;
}

export interface UpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  title?: string;
  employeeId?: string;
  departmentId?: string;
  roleId?: string;
  active?: boolean;
  isTheaterEligible?: boolean;
}

export interface AssignRoleRequest {
  roleId: string;
  validFrom?: string;
  validUntil?: string;
}

export interface CreateRoleRequest {
  code: string;
  name: string;
  description?: string;
  active?: boolean;
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  active?: boolean;
}

export interface AssignPermissionRequest {
  permissionId: string;
}

export interface UserQueryParams {
  search?: string;
  roleCode?: string;
  active?: boolean;
  departmentId?: string;
  skip?: number;
  take?: number;
}

export interface PermissionQueryParams {
  domain?: string;
  resource?: string;
  action?: string;
  search?: string;
}

export interface UsersListResponse {
  users: AdminUser[];
  total: number;
  skip: number;
  take: number;
}

export interface PermissionsListResponse {
  permissions: AdminPermission[];
  total: number;
}

export interface PermissionStats {
  total: number;
  byDomain: Record<string, number>;
  byAction: Record<string, number>;
}

export interface AdminDashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalRoles: number;
  activeRoles: number;
  totalPermissions: number;
  recentActivity?: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }>;
}










