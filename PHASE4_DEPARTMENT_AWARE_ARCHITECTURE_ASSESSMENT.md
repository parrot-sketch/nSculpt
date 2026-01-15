# Phase 4.1: Department-Aware Architecture - Assessment & Proposal

**Date:** 2026-01-11  
**Status:** Assessment Complete - Ready for Implementation  
**Objective:** Design department-aware routing, layouts, and navigation without breaking existing Admin functionality

---

## 📋 CURRENT ARCHITECTURE ASSESSMENT

### 1. Authentication Flow

**File:** `client/hooks/useAuth.ts`

**Current Behavior:**
- Login redirects are **role-based** (lines 80-95)
- Priority order: ADMIN → FRONT_DESK → NURSE → THEATER_MANAGER → DOCTOR/SURGEON → fallback
- Uses `user.roles` array to determine destination
- Does NOT consider `user.department` or `user.departmentId`

**Key Finding:**
```typescript
// Current (role-based)
if (roles.includes('ADMIN')) {
  router.push('/admin');
} else if (roles.includes('FRONT_DESK')) {
  router.push('/frontdesk');
}
```

**User Type Structure:**
```typescript
interface User {
  id: string;
  email: string;
  roles: string[];           // ✅ Currently used for routing
  departmentId?: string;     // ⚠️ Available but not used
  department?: {
    code: string;            // ⚠️ Available but not used
    name: string;
  };
}
```

---

### 2. Routing Structure

**Current App Router Structure:**
```
app/
  (protected)/
    admin/              ✅ Has layout.tsx with AuthGuard
    frontdesk/          ✅ Has layout.tsx with RoleGuard
    nursing/            ✅ Has layout.tsx with RoleGuard
    cleaning/           ✅ Has layout.tsx with RoleGuard (incomplete)
    theater-manager/    ✅ Has layout.tsx with RoleGuard
    dashboard/          ⚠️ Generic fallback
```

**Route Groups:**
- `(protected)` - Contains all authenticated routes
- Layout hierarchy: `(protected)/layout.tsx` → department-specific layouts

---

### 3. Layout Architecture

**Parent Layout:** `app/(protected)/layout.tsx`
- Provides shared structure (Header, Sidebar selection)
- Uses `getSidebarForPath()` to select department sidebar
- Wraps everything in `AuthGuard` (authentication check only)

**Department Layouts:**
- `admin/layout.tsx` - Uses `AuthGuard` with `requiredRole="ADMIN"` + permissions
- `frontdesk/layout.tsx` - Uses `RoleGuard` with `['FRONT_DESK', 'ADMIN']`
- `nursing/layout.tsx` - Uses `RoleGuard` with `['NURSE', 'ADMIN']`
- `cleaning/layout.tsx` - Uses `RoleGuard` with `['ADMIN']` only (⚠️ incomplete)
- `theater-manager/layout.tsx` - Uses `RoleGuard` with `['THEATER_MANAGER', 'ADMIN']`

**Sidebar Selection:** `client/lib/navigation.ts`
- Path-based selection (checks pathname prefix)
- Returns: `'admin' | 'frontdesk' | 'nursing' | 'theater' | 'cleaning' | 'default'`

---

### 4. Department vs Role Relationship

**Current Understanding:**
- **Roles** = Functional permissions (ADMIN, NURSE, FRONT_DESK, etc.)
- **Departments** = Organizational units (ADMINISTRATION, FRONT_DESK, SURGERY, NURSING, THEATER, CLEANING_AND_MAINTENANCE)
- Users can have multiple roles but typically belong to ONE department
- Department codes are stored in `user.department.code`

**Mapping Needed:**
```
Department Code          → Route Path        → Roles (for guards)
─────────────────────────────────────────────────────────────────
ADMINISTRATION          → /admin           → ADMIN
FRONT_DESK              → /frontdesk        → FRONT_DESK
SURGERY                 → /surgery          → DOCTOR, SURGEON
NURSING                 → /nursing          → NURSE
THEATER                 → /theater          → THEATER_MANAGER
CLEANING_AND_MAINTENANCE → /cleaning        → (needs role definition)
```

---

### 5. Current Gaps & Issues

#### ⚠️ Issue 1: Role-Based Routing Only
- Login routing ignores department
- A user with ADMIN role always goes to `/admin`, even if their department is SURGERY
- **Impact:** Users may be routed incorrectly if they have cross-department roles

#### ⚠️ Issue 2: Inconsistent Guard Patterns
- Admin uses `AuthGuard` with permissions
- Other departments use `RoleGuard` with roles
- Cleaning layout has incomplete guard (only ADMIN)

#### ⚠️ Issue 3: No Department Validation
- No check that user's department matches the route they're accessing
- A FRONT_DESK user could manually navigate to `/nursing` if they have NURSE role

#### ⚠️ Issue 4: Missing Department Routes
- `/surgery` route doesn't exist yet
- `/theater` exists but routing goes to `/theater-manager`

#### ⚠️ Issue 5: Sidebar Selection is Path-Based Only
- Sidebar selection doesn't verify user's department matches the path
- Could show wrong sidebar if user manually navigates

---

## 🎯 PROPOSED ARCHITECTURE

### Core Principle
**Department-first routing with role-based guards**

- Primary routing decision: User's department code
- Secondary enforcement: Role-based guards in layouts
- Fallback: Role-based routing if department is missing

---

### 1. Department-to-Route Mapping

**New File:** `client/lib/department-routing.ts`

```typescript
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
    route: '/theater',
    allowedRoles: ['THEATER_MANAGER', 'ADMIN'],
    sidebarType: 'theater',
  },
  CLEANING_AND_MAINTENANCE: {
    code: 'CLEANING_AND_MAINTENANCE',
    route: '/cleaning',
    allowedRoles: ['ADMIN'], // TODO: Define CLEANING role
    sidebarType: 'cleaning',
  },
};

/**
 * Get dashboard route for a user based on their department
 * Falls back to role-based routing if department is missing
 */
export function getDashboardRouteForUser(user: User | null): string {
  if (!user) return '/login';
  
  // Primary: Department-based routing
  if (user.department?.code) {
    const config = DEPARTMENT_ROUTES[user.department.code as DepartmentCode];
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
  
  return '/dashboard';
}

/**
 * Check if user's department matches the current route
 */
export function isUserDepartmentRoute(user: User | null, pathname: string): boolean {
  if (!user?.department?.code) return false;
  
  const config = DEPARTMENT_ROUTES[user.department.code as DepartmentCode];
  if (!config) return false;
  
  return pathname.startsWith(config.route);
}
```

---

### 2. Updated Login Routing

**File:** `client/hooks/useAuth.ts`

**Change:** Replace role-based routing with department-aware routing

```typescript
// OLD (lines 80-95)
if (roles.includes('ADMIN')) {
  router.push('/admin');
} else if (roles.includes('FRONT_DESK')) {
  router.push('/frontdesk');
}
// ... etc

// NEW
import { getDashboardRouteForUser } from '@/lib/department-routing';

// In login callback (line ~78)
const { user: userData } = response as any;
setUser(userData);

// Department-aware routing
const dashboardRoute = getDashboardRouteForUser(userData);
router.push(dashboardRoute);
```

---

### 3. Department-Aware Layout Guards

**Pattern:** Each department layout should:
1. Check user has required role(s)
2. Verify user's department matches the route
3. Redirect if mismatch

**Example:** `app/(protected)/frontdesk/layout.tsx`

```typescript
'use client';

import { useAuth } from '@/hooks/useAuth';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { isUserDepartmentRoute } from '@/lib/department-routing';

export default function FrontDeskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Verify department matches route
  useEffect(() => {
    if (user && !isUserDepartmentRoute(user, pathname)) {
      // User's department doesn't match this route
      // Redirect to their department dashboard
      const { getDashboardRouteForUser } = require('@/lib/department-routing');
      const correctRoute = getDashboardRouteForUser(user);
      router.push(correctRoute);
    }
  }, [user, pathname, router]);

  return (
    <RoleGuard roles={['FRONT_DESK', 'ADMIN']}>
      {children}
    </RoleGuard>
  );
}
```

---

### 4. Enhanced Sidebar Selection

**File:** `client/lib/navigation.ts`

**Enhancement:** Verify user's department matches sidebar selection

```typescript
import { isUserDepartmentRoute } from './department-routing';
import type { User } from '@/types/auth';

export function getSidebarForPath(pathname: string | null, user?: User | null): SidebarType {
  if (!pathname) return 'default';

  // If user provided, verify department matches
  if (user && !isUserDepartmentRoute(user, pathname)) {
    // User's department doesn't match path - use default sidebar
    return 'default';
  }

  // Existing path-based selection
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/frontdesk')) return 'frontdesk';
  if (pathname.startsWith('/nursing')) return 'nursing';
  if (pathname.startsWith('/theater') || pathname.startsWith('/theater-manager')) return 'theater';
  if (pathname.startsWith('/cleaning')) return 'cleaning';
  if (pathname.startsWith('/surgery')) return 'surgery';

  return 'default';
}
```

**Update:** `app/(protected)/layout.tsx` to pass user to `getSidebarForPath`

---

### 5. Missing Routes & Layouts

**New Routes Needed:**
- `/surgery` - For SURGERY department
  - Create `app/(protected)/surgery/layout.tsx`
  - Create `app/(protected)/surgery/dashboard/page.tsx` (or redirect to `/doctor`)

**Route Consolidation:**
- `/theater-manager` → `/theater` (update navigation.ts to handle both)

---

## 📝 IMPLEMENTATION PLAN

### Phase 1: Core Infrastructure (No Breaking Changes)

1. ✅ Create `client/lib/department-routing.ts`
   - Define department-to-route mapping
   - Implement `getDashboardRouteForUser()`
   - Implement `isUserDepartmentRoute()`

2. ✅ Update `client/lib/navigation.ts`
   - Add user parameter to `getSidebarForPath()`
   - Add department verification

3. ✅ Update `app/(protected)/layout.tsx`
   - Pass user to `getSidebarForPath()`

### Phase 2: Login Routing (Backward Compatible)

4. ✅ Update `client/hooks/useAuth.ts`
   - Replace role-based routing with `getDashboardRouteForUser()`
   - Preserves fallback to role-based routing

### Phase 3: Department Layout Guards

5. ✅ Update `app/(protected)/frontdesk/layout.tsx`
   - Add department verification

6. ✅ Update `app/(protected)/nursing/layout.tsx`
   - Add department verification

7. ✅ Update `app/(protected)/cleaning/layout.tsx`
   - Fix incomplete guard
   - Add department verification

8. ✅ Update `app/(protected)/theater-manager/layout.tsx`
   - Add department verification
   - Consider renaming to `/theater` route

9. ✅ Update `app/(protected)/admin/layout.tsx`
   - Add department verification (optional, ADMIN can access all)

### Phase 4: Missing Routes

10. ✅ Create `app/(protected)/surgery/layout.tsx`
    - For SURGERY department
    - Guard with DOCTOR, SURGEON, ADMIN roles

11. ✅ Create `app/(protected)/surgery/dashboard/page.tsx`
    - Or redirect to `/doctor` if that's the intended behavior

### Phase 5: Testing & Verification

12. ✅ Test login routing for each department
13. ✅ Test cross-department access prevention
14. ✅ Test Admin access to all departments
15. ✅ Verify sidebar selection matches department

---

## 🔒 SECURITY CONSIDERATIONS

### Guard Strategy

**Two-Layer Protection:**
1. **Route-level guards** (layouts) - Prevent unauthorized access
2. **Department verification** - Prevent cross-department navigation

**Admin Exception:**
- ADMIN role can access all departments (by design)
- Department verification should allow ADMIN to bypass

**Implementation:**
```typescript
function isUserDepartmentRoute(user: User | null, pathname: string): boolean {
  if (!user?.department?.code) return false;
  
  // ADMIN can access all departments
  if (user.roles.includes('ADMIN')) return true;
  
  const config = DEPARTMENT_ROUTES[user.department.code as DepartmentCode];
  if (!config) return false;
  
  return pathname.startsWith(config.route);
}
```

---

## ✅ VERIFICATION CHECKLIST

After implementation, verify:

- [ ] Admin logs in → routed to `/admin`
- [ ] Front Desk logs in → routed to `/frontdesk`
- [ ] Nurse logs in → routed to `/nursing`
- [ ] Theater staff logs in → routed to `/theater`
- [ ] Cleaning staff logs in → routed to `/cleaning`
- [ ] Surgery staff logs in → routed to `/surgery` (or `/doctor`)
- [ ] Admin can access all department routes
- [ ] Front Desk user cannot access `/nursing` (even with NURSE role)
- [ ] Sidebar matches user's department
- [ ] Existing Admin workflows still work
- [ ] No console errors or redirect loops

---

## 🚀 NEXT STEPS

1. Review this assessment
2. Approve implementation plan
3. Begin Phase 1 implementation
4. Test incrementally
5. Proceed to Phase 4.2 (Front Desk workflows)

---

**Status:** Ready for implementation  
**Risk Level:** Low (backward compatible, preserves existing behavior)  
**Estimated Effort:** 2-3 hours
