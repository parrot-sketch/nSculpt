'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { useAuth } from '@/hooks/useAuth';
import { ROLES } from '@/lib/constants';
import { getDashboardRouteForUser } from '@/lib/department-routing';

/**
 * Patient Layout - STRICT PATIENT-ONLY ACCESS
 * 
 * CRITICAL: This layout enforces PATIENT-only access to /patient/* routes.
 * Patients are not staff and must have a completely isolated experience.
 * 
 * Security:
 * - Requires PATIENT role
 * - Requires patients:self:read permission
 * - Redirects non-Patient users to their appropriate dashboard
 * - Prevents Patient from accessing admin/frontdesk routes
 * - No exceptions - strict isolation for healthcare compliance
 */
export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Strict enforcement: Only PATIENT can access /patient/* routes
  useEffect(() => {
    if (!user) return;

    const isPatient = user.roles?.includes(ROLES.PATIENT);

    // If user is not PATIENT, redirect to their appropriate dashboard
    if (!isPatient) {
      const correctRoute = getDashboardRouteForUser(user);
      console.warn('[PatientLayout] Non-patient user attempted to access patient route, redirecting to:', correctRoute);
      router.replace(correctRoute);
      return;
    }

    // Prevent Patient from accessing staff routes (defensive check)
    if (pathname.startsWith('/admin') || pathname.startsWith('/frontdesk')) {
      console.warn('[PatientLayout] Patient attempted to access staff route, redirecting to /patient');
      router.replace('/patient');
      return;
    }
  }, [user, pathname, router]);

  // PATIENT-only access - no exceptions
  return (
    <AuthGuard
      requiredRole={ROLES.PATIENT}
      requiredPermission="patients:self:read"
    >
      {children}
    </AuthGuard>
  );
}
