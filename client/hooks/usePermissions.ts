'use client';

import { useMemo } from 'react';
import { useAuth } from './useAuth';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRole,
  hasAnyRole,
  type Permission,
  type Role,
} from '@/lib/permissions';

/**
 * Hook for permission and role checking
 * Provides convenient methods to check user permissions
 */
export function usePermissions() {
  const { user } = useAuth();

  const permissions = useMemo(() => user?.permissions || [], [user]);
  const roles = useMemo(() => user?.roles || [], [user]);

  return {
    permissions,
    roles,
    hasPermission: (permission: Permission) => hasPermission(permissions, permission),
    hasAnyPermission: (requiredPermissions: Permission[]) =>
      hasAnyPermission(permissions, requiredPermissions),
    hasAllPermissions: (requiredPermissions: Permission[]) =>
      hasAllPermissions(permissions, requiredPermissions),
    hasRole: (role: Role) => hasRole(roles, role),
    hasAnyRole: (requiredRoles: Role[]) => hasAnyRole(roles, requiredRoles),
  };
}












