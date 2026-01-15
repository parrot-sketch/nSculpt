'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { useAuth } from '@/hooks/useAuth';
import { isUserDepartmentRoute, getDashboardRouteForUser } from '@/lib/department-routing';

export default function NursingLayout({
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
            console.log('[NursingLayout] Department mismatch, redirecting to:', correctRoute);
            router.push(correctRoute);
        }
    }, [user, pathname, router]);

    return (
        <RoleGuard roles={['NURSE', 'ADMIN']}>
            {children}
        </RoleGuard>
    );
}
