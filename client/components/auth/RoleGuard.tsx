'use client';

import { useAuth } from '@/hooks/useAuth'; // Assuming existing hook
import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';

export type UserRole = 'ADMIN' | 'DOCTOR' | 'NURSE' | 'SURGEON' | 'PATIENT' | 'THEATER_MANAGER' | 'INVENTORY_MANAGER' | 'BILLING' | 'FRONT_DESK';

export const usePermission = () => {
    const { user } = useAuth();

    // Check if user has any of the required roles
    const hasRole = (requiredRole: UserRole | UserRole[]) => {
        if (!user || !user.roles) return false;

        const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

        // Check if user has any of the required roles
        return requiredRoles.some(role => user.roles.includes(role));
    };

    return { hasRole, user };
};

interface RoleGuardProps {
    children: ReactNode;
    roles: UserRole | UserRole[];
    fallback?: ReactNode;
}

export const RoleGuard = ({ children, roles, fallback = null }: RoleGuardProps) => {
    const { hasRole, user } = usePermission();
    const router = useRouter();

    console.log('[RoleGuard] Checking roles:', {
        requiredRoles: roles,
        userRoles: user?.roles,
        hasAccess: hasRole(roles)
    });

    if (!user) {
        console.log('[RoleGuard] No user, returning null');
        return null; // Or loading spinner
    }

    if (!hasRole(roles)) {
        console.log('[RoleGuard] Access denied, returning fallback');
        return <>{fallback}</>;
    }

    console.log('[RoleGuard] Access granted, rendering children');
    return <>{children}</>;
};
