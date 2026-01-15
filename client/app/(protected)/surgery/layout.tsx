'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { useAuth } from '@/hooks/useAuth';
import { isUserDepartmentRoute, getDashboardRouteForUser } from '@/lib/department-routing';

/**
 * Surgery Layout
 * 
 * For users in the SURGERY department (doctors and surgeons).
 * Routes to /surgery or falls back to /doctor if department not set.
 */
export default function SurgeryLayout({
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
            console.log('[SurgeryLayout] Department mismatch, redirecting to:', correctRoute);
            router.push(correctRoute);
        }
    }, [user, pathname, router]);

    return (
        <RoleGuard roles={['DOCTOR', 'SURGEON', 'ADMIN']}>
            {children}
        </RoleGuard>
    );
}
