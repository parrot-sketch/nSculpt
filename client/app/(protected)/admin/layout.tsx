'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { useAuth } from '@/hooks/useAuth';
import { ROLES } from '@/lib/constants';

/**
 * Admin Layout - STRICT ADMIN-ONLY ACCESS
 * 
 * CRITICAL: This layout enforces ADMIN-only access to all /admin/* routes.
 * FrontDesk users must use /frontdesk/* routes for patient registration.
 * 
 * Security:
 * - Requires ADMIN role
 * - Requires admin:*:read permission
 * - Redirects non-admin users to their department dashboard
 * - No exceptions for patient routes (moved to /frontdesk/patients/*)
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Strict enforcement: Only ADMIN can access /admin/* routes
  useEffect(() => {
    if (user && !user.roles?.includes('ADMIN')) {
      // Non-admin user trying to access admin routes - redirect to their dashboard
      // This includes PATIENT users who must be redirected to /patient
      const { getDashboardRouteForUser } = require('@/lib/department-routing');
      const correctRoute = getDashboardRouteForUser(user);
      console.warn('[AdminLayout] Non-admin user attempted to access admin route, redirecting to:', correctRoute);
      router.replace(correctRoute);
    }
  }, [user, pathname, router]);

  // ADMIN-only access - no exceptions
  return (
    <AuthGuard requiredRole="ADMIN" requiredPermissions={['admin:*:read']}>
      {children}
    </AuthGuard>
  );
}


