/**
 * Reporting Types
 * 
 * Types for reporting functionality.
 */

// ============================================================================
// User Activity Report
// ============================================================================

export interface UserActivityQueryParams {
  startDate: string;
  endDate: string;
  userId?: string;
}

export interface UserActivityReport {
  summary: {
    dateRange: {
      start: string;
      end: string;
    };
    totalUserCreations: number;
    totalUserLogins: number;
    totalRoleAssignments: number;
    totalPermissionChanges: number;
    uniqueUsers: number;
  };
  userCreations: Array<{
    id: string;
    occurredAt: string;
    user?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
    payload: Record<string, any>;
  }>;
  userLogins: Array<{
    id: string;
    startedAt: string;
    user?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
    deviceInfo?: string;
    ipAddress?: string;
  }>;
  roleAssignments: Array<{
    id: string;
    createdAt: string;
    user?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
    role?: {
      id: string;
      code: string;
      name: string;
    };
    active: boolean;
    validFrom: string;
    validUntil?: string;
  }>;
  permissionChanges: Array<{
    id: string;
    occurredAt: string;
    eventType: string;
    creator?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
    payload: Record<string, any>;
  }>;
}

// ============================================================================
// Permission Usage Report
// ============================================================================

export interface PermissionUsageQueryParams {
  domain?: string;
  permissionId?: string;
}

export interface PermissionUsageReport {
  summary: {
    totalPermissions: number;
    totalRoles: number;
    totalUsers: number;
    filter: {
      domain: string;
      permissionId: string;
    };
  };
  permissionUsage: Array<{
    permission: {
      id: string;
      code: string;
      name: string;
      domain: string;
      resource?: string;
      action: string;
    };
    roles: Array<{
      id: string;
      code: string;
      name: string;
      active: boolean;
    }>;
    usersByRole: Record<string, Array<{
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      active: boolean;
    }>>;
    statistics: {
      totalRoles: number;
      totalUsers: number;
      activeUsers: number;
      inactiveUsers: number;
    };
  }>;
}









