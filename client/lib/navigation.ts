/**
 * Navigation Logic
 * 
 * Determines which sidebar to show based on the current path and user's department.
 * This centralizes the routing logic to avoid cluttering the layout component.
 */

import type { User } from '@/types/auth';
import { getSidebarTypeForDepartment } from './department-routing';

export type SidebarType = 'admin' | 'frontdesk' | 'nursing' | 'theater' | 'cleaning' | 'surgery' | 'default';

/**
 * Get sidebar type based on pathname and user's role/department
 * 
 * CRITICAL: This function enforces strict role-based sidebar rendering.
 * - Admin sidebar only shown for ADMIN users on /admin/* routes
 * - FrontDesk sidebar only shown for FRONT_DESK users on /frontdesk/* routes
 * - Prevents cross-role sidebar leakage
 * 
 * @param pathname - Current route pathname
 * @param user - Optional user object for role/department verification
 * @returns Sidebar type to display
 */
export function getSidebarForPath(pathname: string | null, user?: User | null): SidebarType {
  if (!pathname) return 'default';

  const userRoles = user?.roles || [];
  const isAdmin = userRoles.includes('ADMIN');
  const isFrontDesk = userRoles.includes('FRONT_DESK');

  // STRICT ROLE-BASED SIDEBAR SELECTION

  // Admin routes: Only show admin sidebar to ADMIN users
  if (pathname.startsWith('/admin')) {
    if (isAdmin) {
      return 'admin';
    }
    // Non-admin user on admin route - show their department sidebar
    if (user?.department?.code) {
      return getSidebarTypeForDepartment(user.department.code);
    }
    return 'default';
  }

  // FrontDesk routes: Only show frontdesk sidebar to FRONT_DESK or ADMIN users
  if (pathname.startsWith('/frontdesk')) {
    if (isFrontDesk || isAdmin) {
      return 'frontdesk';
    }
    // Non-FrontDesk user on frontdesk route - show their department sidebar
    if (user?.department?.code) {
      return getSidebarTypeForDepartment(user.department.code);
    }
    return 'default';
  }

  // Other department routes: Verify user has access
  if (pathname.startsWith('/nursing')) {
    if (userRoles.includes('NURSE') || isAdmin) {
      return 'nursing';
    }
    if (user?.department?.code) {
      return getSidebarTypeForDepartment(user.department.code);
    }
    return 'default';
  }

  if (pathname.startsWith('/theater') || pathname.startsWith('/theater-manager')) {
    if (userRoles.includes('THEATER_MANAGER') || isAdmin) {
      return 'theater';
    }
    if (user?.department?.code) {
      return getSidebarTypeForDepartment(user.department.code);
    }
    return 'default';
  }

  if (pathname.startsWith('/cleaning')) {
    if (isAdmin) {
      return 'cleaning';
    }
    if (user?.department?.code) {
      return getSidebarTypeForDepartment(user.department.code);
    }
    return 'default';
  }

  if (pathname.startsWith('/surgery')) {
    if (userRoles.includes('DOCTOR') || userRoles.includes('SURGEON') || isAdmin) {
      return 'surgery';
    }
    if (user?.department?.code) {
      return getSidebarTypeForDepartment(user.department.code);
    }
    return 'default';
  }

  // Default sidebar for shared routes
  return 'default';
}

/**
 * Get dashboard route for user (legacy function, kept for backward compatibility)
 * 
 * @deprecated Use getDashboardRouteForUser from department-routing.ts instead
 * @param user - User object
 * @returns Dashboard route path
 */
export function getDashboardRoute(user: any): string {
  if (!user) return '/login';
  if (user.roles?.includes('ADMIN')) return '/admin';
  return '/dashboard';
}
