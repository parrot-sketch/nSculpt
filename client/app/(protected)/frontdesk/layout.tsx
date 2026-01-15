'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { useAuth } from '@/hooks/useAuth';
import { ROLES } from '@/lib/constants';
import { buildPermission } from '@/lib/permissions';
import { PERMISSION_DOMAINS, PERMISSION_ACTIONS } from '@/lib/constants';
import { isUserDepartmentRoute, getDashboardRouteForUser } from '@/lib/department-routing';

/**
 * FrontDesk Layout - STRICT FRONT_DESK ACCESS
 * 
 * CRITICAL: This layout enforces FRONT_DESK-only access to /frontdesk/* routes.
 * Admin users can access for management, but FrontDesk users cannot access /admin/*.
 * 
 * Security:
 * - Requires FRONT_DESK role (or ADMIN for management)
 * - Requires patients:*:read permission
 * - Redirects non-FrontDesk users to their department dashboard
 * - Prevents FrontDesk from accessing admin routes
 * 
 * Note: Sidebar is rendered by parent (protected)/layout.tsx
 */
export default function FrontDeskLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    // Strict enforcement: Only FRONT_DESK (or ADMIN) can access /frontdesk/* routes
    useEffect(() => {
        if (!user) return;

        const isAdmin = user.roles?.includes('ADMIN');
        const isFrontDesk = user.roles?.includes('FRONT_DESK');
        const isPatient = user.roles?.includes('PATIENT');

        // If user is PATIENT, redirect to patient portal (strict isolation)
        if (isPatient) {
            console.warn('[FrontDeskLayout] Patient attempted to access frontdesk route, redirecting to /patient');
            router.replace('/patient');
            return;
        }

        // If user is neither ADMIN nor FRONT_DESK, redirect
        if (!isAdmin && !isFrontDesk) {
            const { getDashboardRouteForUser } = require('@/lib/department-routing');
            const correctRoute = getDashboardRouteForUser(user);
            console.warn('[FrontDeskLayout] User does not have FRONT_DESK role, redirecting to:', correctRoute);
            router.replace(correctRoute);
            return;
        }

        // If user is FRONT_DESK (not ADMIN), verify department matches
        if (isFrontDesk && !isAdmin && !isUserDepartmentRoute(user, pathname)) {
            const correctRoute = getDashboardRouteForUser(user);
            console.warn('[FrontDeskLayout] Department mismatch, redirecting to:', correctRoute);
            router.replace(correctRoute);
        }
    }, [user, pathname, router]);

    // FRONT_DESK access (ADMIN can also access for management)
    // Sidebar is rendered by parent layout, so we just wrap children with AuthGuard
    return (
        <AuthGuard
            requiredRoles={[ROLES.FRONT_DESK, ROLES.ADMIN]}
            requiredPermission={buildPermission(PERMISSION_DOMAINS.PATIENTS, '*', PERMISSION_ACTIONS.READ)}
        >
            {children}
        </AuthGuard>
    );
}
