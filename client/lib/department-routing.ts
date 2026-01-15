/**
 * Department-Aware Routing
 * 
 * Maps department codes to routes and provides utilities for
 * department-aware navigation and access control.
 * 
 * Architecture: Department-first routing with role-based guards
 */

import type { User } from '@/types/auth';

export type DepartmentCode =
  | 'ADMINISTRATION'
  | 'FRONT_DESK'
  | 'SURGERY'
  | 'NURSING'
  | 'THEATER'
  | 'CLEANING_AND_MAINTENANCE';

export interface DepartmentRouteConfig {
  code: DepartmentCode;
  route: string;
  allowedRoles: string[];
  sidebarType: 'admin' | 'frontdesk' | 'nursing' | 'theater' | 'cleaning' | 'surgery' | 'default';
}

/**
 * Department-to-route mapping configuration
 * 
 * Defines which route each department should use and which roles
 * are allowed to access that department's routes.
 */
export const DEPARTMENT_ROUTES: Record<DepartmentCode, DepartmentRouteConfig> = {
  ADMINISTRATION: {
    code: 'ADMINISTRATION',
    route: '/admin',
    allowedRoles: ['ADMIN'],
    sidebarType: 'admin',
  },
  FRONT_DESK: {
    code: 'FRONT_DESK',
    route: '/frontdesk',
    allowedRoles: ['FRONT_DESK', 'ADMIN'],
    sidebarType: 'frontdesk',
  },
  SURGERY: {
    code: 'SURGERY',
    route: '/surgery',
    allowedRoles: ['DOCTOR', 'SURGEON', 'ADMIN'],
    sidebarType: 'surgery',
  },
  NURSING: {
    code: 'NURSING',
    route: '/nursing',
    allowedRoles: ['NURSE', 'ADMIN'],
    sidebarType: 'nursing',
  },
  THEATER: {
    code: 'THEATER',
    route: '/theater-manager', // Matches existing route structure
    allowedRoles: ['THEATER_MANAGER', 'ADMIN'],
    sidebarType: 'theater',
  },
  CLEANING_AND_MAINTENANCE: {
    code: 'CLEANING_AND_MAINTENANCE',
    route: '/cleaning',
    allowedRoles: ['ADMIN'], // TODO: Define CLEANING role when available
    sidebarType: 'cleaning',
  },
};

/**
 * Get dashboard route for a user based on their department
 * 
 * Priority:
 * 1. Department-based routing (if user has department)
 * 2. Role-based routing (fallback for users without department)
 * 3. Generic dashboard (final fallback)
 * 
 * @param user - User object with department and roles
 * @returns Route path to user's dashboard
 */
export function getDashboardRouteForUser(user: User | null): string {
  if (!user) return '/login';

  // Primary: Department-based routing
  if (user.department?.code) {
    const departmentCode = user.department.code as DepartmentCode;
    const config = DEPARTMENT_ROUTES[departmentCode];
    if (config) {
      return config.route;
    }
  }

  // Fallback: Role-based routing (preserves existing behavior)
  const roles = user.roles || [];
  if (roles.includes('ADMIN')) return '/admin';
  if (roles.includes('FRONT_DESK')) return '/frontdesk';
  if (roles.includes('NURSE')) return '/nursing';
  if (roles.includes('THEATER_MANAGER')) return '/theater';
  if (roles.includes('DOCTOR') || roles.includes('SURGEON')) return '/doctor';
  // Patients should land on their dedicated dashboard, not a non-existent /patient index
  if (roles.includes('PATIENT')) return '/patient/dashboard';

  return '/dashboard';
}

/**
 * Check if user's department matches the current route
 * 
 * Used for:
 * - Verifying user should have access to a route
 * - Preventing cross-department navigation
 * - Selecting correct sidebar
 * 
 * Admin users can access all departments (by design).
 * 
 * @param user - User object with department and roles
 * @param pathname - Current route pathname
 * @returns true if user's department matches route, or if user is ADMIN
 */
export function isUserDepartmentRoute(user: User | null, pathname: string): boolean {
  if (!user) return false;

  // ADMIN can access all departments
  if (user.roles?.includes('ADMIN')) return true;

  // If user has no department, allow access (fallback to role-based)
  if (!user.department?.code) return true;

  const departmentCode = user.department.code as DepartmentCode;
  const config = DEPARTMENT_ROUTES[departmentCode];
  if (!config) return false;

  // Check if pathname matches department route
  return pathname.startsWith(config.route);
}

/**
 * Get department route configuration for a given department code
 * 
 * @param departmentCode - Department code
 * @returns Route configuration or undefined if not found
 */
export function getDepartmentRouteConfig(
  departmentCode: string | null | undefined
): DepartmentRouteConfig | undefined {
  if (!departmentCode) return undefined;
  return DEPARTMENT_ROUTES[departmentCode as DepartmentCode];
}

/**
 * Get sidebar type for a department code
 * 
 * @param departmentCode - Department code
 * @returns Sidebar type or 'default' if not found
 */
export function getSidebarTypeForDepartment(
  departmentCode: string | null | undefined
): 'admin' | 'frontdesk' | 'nursing' | 'theater' | 'cleaning' | 'surgery' | 'default' {
  const config = getDepartmentRouteConfig(departmentCode);
  return config?.sidebarType || 'default';
}
