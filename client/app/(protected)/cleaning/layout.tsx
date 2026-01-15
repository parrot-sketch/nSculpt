'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { useAuth } from '@/hooks/useAuth';
import { isUserDepartmentRoute, getDashboardRouteForUser } from '@/lib/department-routing';

/**
 * Cleaning & Maintenance Layout
 * 
 * Note: Currently only ADMIN role is allowed until a CLEANING role is defined.
 * Department verification ensures users from CLEANING_AND_MAINTENANCE department
 * are routed here, but role guard restricts access to ADMIN only.
 */
export default function CleaningLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    // Verify department matches route (unless user is ADMIN)
    useEffect(() => {
        if (user && !isUserDepartmentRoute(user, pathname)) {
            // User's department doesn't match this route - redirect to their department dashboard
            const correctRoute = getDashboardRouteForUser(user);
            console.log('[CleaningLayout] Department mismatch, redirecting to:', correctRoute);
            router.push(correctRoute);
        }
    }, [user, pathname, router]);

    // TODO: Add CLEANING role when defined in backend
    return (
        <RoleGuard roles={['ADMIN']}>
            {children}
        </RoleGuard>
    );
}
