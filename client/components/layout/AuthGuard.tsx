'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { usePermissions } from '@/hooks/usePermissions';
import { hasAnyRole } from '@/lib/permissions';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredPermissions?: string[];
  requiredRole?: string;
  requiredRoles?: string[];
  redirectTo?: string;
}

/**
 * AuthGuard component
 * Protects routes and ensures user is authenticated
 * 
 * CRITICAL FIXES:
 * 1. Uses store directly (single source of truth)
 * 2. Proper loading state handling
 * 3. Prevents redirect loops
 * 4. Thread-safe checks
 * 
 * Security Model:
 * - Roles: User must have ANY of the required roles (matches backend RolesGuard)
 * - Permissions: User must have ALL of the required permissions (matches backend PermissionsGuard)
 * - Multi-role users: Combined permissions from all roles, but ownership still enforced by backend
 */
export function AuthGuard({
  children,
  requiredPermission,
  requiredPermissions,
  requiredRole,
  requiredRoles,
  redirectTo = '/login',
}: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, isInitialized, user } = useAuthStore();
  const { permissions, roles, hasPermission, hasAllPermissions: hasAllPerms } = usePermissions();

  // Wait for initialization to complete before making auth decisions
  useEffect(() => {
    // Don't redirect if still initializing
    if (!isInitialized || isLoading) {
      return;
    }

    // Redirect if not authenticated
    if (!isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, isInitialized, router, redirectTo]);

  // Show loading state while initializing or loading
  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-neutral-500">Loading...</div>
      </div>
    );
  }

  // Redirect if not authenticated (return null to prevent flash)
  if (!isAuthenticated) {
    return null;
  }

  // Check single permission if required
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-neutral-900 mb-2">
            Access Denied
          </h2>
          <p className="text-neutral-600 mb-4">
            You do not have permission to access this resource.
          </p>
          <p className="text-sm text-neutral-500">
            Required permission: {requiredPermission}
          </p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 text-sm bg-neutral-100 text-neutral-700 rounded-md hover:bg-neutral-200"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Check multiple permissions if required (user must have ALL)
  if (requiredPermissions && requiredPermissions.length > 0) {
    if (!hasAllPerms(requiredPermissions)) {
      const missingPermissions = requiredPermissions.filter(
        (perm) => !hasPermission(perm)
      );
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-neutral-900 mb-2">
              Access Denied
            </h2>
            <p className="text-neutral-600 mb-4">
              You do not have all required permissions.
            </p>
            <p className="text-sm text-neutral-500 mb-2">
              Required: {requiredPermissions.join(', ')}
            </p>
            <p className="text-sm text-red-600">
              Missing: {missingPermissions.join(', ')}
            </p>
            <button
              onClick={() => router.back()}
              className="mt-4 px-4 py-2 text-sm bg-neutral-100 text-neutral-700 rounded-md hover:bg-neutral-200"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
  }

  // Check single role if required
  if (requiredRole && !hasAnyRole(roles, [requiredRole])) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-neutral-900 mb-2">
            Access Denied
          </h2>
          <p className="text-neutral-600 mb-4">
            This resource requires the {requiredRole} role.
          </p>
          <p className="text-sm text-neutral-500">
            Your roles: {roles.join(', ') || 'None'}
          </p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 text-sm bg-neutral-100 text-neutral-700 rounded-md hover:bg-neutral-200"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Check multiple roles if required (user must have ANY)
  if (requiredRoles && requiredRoles.length > 0) {
    if (!hasAnyRole(roles, requiredRoles)) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-neutral-900 mb-2">
              Access Denied
            </h2>
            <p className="text-neutral-600 mb-4">
              This resource requires one of the following roles: {requiredRoles.join(', ')}
            </p>
            <p className="text-sm text-neutral-500">
              Your roles: {roles.join(', ') || 'None'}
            </p>
            <button
              onClick={() => router.back()}
              className="mt-4 px-4 py-2 text-sm bg-neutral-100 text-neutral-700 rounded-md hover:bg-neutral-200"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
