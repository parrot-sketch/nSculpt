'use client';

import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { buildPermission } from '@/lib/permissions';
import { PERMISSION_DOMAINS, PERMISSION_ACTIONS } from '@/lib/constants';

interface PermissionsGuardProps {
  children: ReactNode;
  requiredPermission?: string;
  requiredPermissions?: string[];
  domain?: string;
  resource?: string;
  action?: string;
  fallback?: ReactNode;
  requireAll?: boolean; // If true, requires ALL permissions (default: true to match backend)
}

/**
 * PermissionsGuard component
 * Conditionally renders children based on user permissions
 * 
 * Aligns with backend PermissionsGuard:
 * - Single permission: User must have the permission
 * - Multiple permissions: User must have ALL permissions (by default)
 * - Multi-role users: Combined permissions from all roles
 */
export function PermissionsGuard({
  children,
  requiredPermission,
  requiredPermissions,
  domain,
  resource,
  action,
  fallback = null,
  requireAll = true, // Default to requiring ALL permissions (matches backend)
}: PermissionsGuardProps) {
  const { hasPermission, hasAllPermissions, hasAnyPermission } = usePermissions();

  // Build permission from domain/resource/action if provided
  let permission = requiredPermission;
  if (!permission && domain && resource && action) {
    permission = buildPermission(domain, resource, action);
  }

  // Check single permission
  if (permission) {
    if (!hasPermission(permission)) {
      return <>{fallback}</>;
    }
  }

  // Check multiple permissions
  if (requiredPermissions && requiredPermissions.length > 0) {
    // By default, require ALL permissions (matches backend PermissionsGuard)
    // Set requireAll=false to use ANY permission check
    const hasAccess = requireAll
      ? hasAllPermissions(requiredPermissions)
      : hasAnyPermission(requiredPermissions);
    
    if (!hasAccess) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

/**
 * Convenience wrapper for domain-based permission checks
 */
export function DomainGuard({
  children,
  domain,
  action = PERMISSION_ACTIONS.READ,
  resource = '*',
  fallback,
}: {
  children: ReactNode;
  domain: string;
  action?: string;
  resource?: string;
  fallback?: ReactNode;
}) {
  return (
    <PermissionsGuard
      domain={domain}
      resource={resource}
      action={action}
      fallback={fallback}
    >
      {children}
    </PermissionsGuard>
  );
}

