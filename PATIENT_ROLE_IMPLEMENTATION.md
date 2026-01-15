  Patient Role Implementation - Architectural Analysis & Implementation Plan

## 1. ARCHITECTURAL ANALYSIS

### Current Architecture Patterns

#### Layout-Level Protection Pattern
- **Admin Layout** (`/admin/layout.tsx`):
  - Uses `useEffect` to check user roles
  - Redirects non-ADMIN users via `getDashboardRouteForUser()`
  - Wraps children in `AuthGuard` with `requiredRole="ADMIN"` and `requiredPermissions={['admin:*:read']}`
  - Pattern: Role check → Redirect → AuthGuard wrapper

- **FrontDesk Layout** (`/frontdesk/layout.tsx`):
  - Uses `useEffect` to check for FRONT_DESK or ADMIN roles
  - Uses `isUserDepartmentRoute()` for department verification
  - Wraps children in `AuthGuard` with `requiredRoles={[ROLES.FRONT_DESK, ROLES.ADMIN]}`
  - Pattern: Role check → Department verification → Redirect → AuthGuard wrapper

#### Routing Logic Pattern
- **`department-routing.ts`**:
  - `getDashboardRouteForUser()`: Priority: Department → Role → Generic dashboard
  - `DEPARTMENT_ROUTES`: Maps department codes to routes and allowed roles
  - `isUserDepartmentRoute()`: Verifies user's department matches route

#### Post-Login Routing
- **`useAuth.ts`**: After successful login, calls `getDashboardRouteForUser(userData)` and redirects
- **Login page**: Also redirects authenticated users using role-based logic

#### Navigation Pattern
- Each role has its own sidebar component (e.g., `FrontDeskSidebar.tsx`, `AdminSidebar.tsx`)
- Sidebars are role-specific and isolated
- Navigation items are defined in the sidebar component

### How Patient Should Plug In

1. **Layout**: Create `/patient/layout.tsx` following the same pattern as Admin/FrontDesk
2. **Routing**: Add PATIENT to `getDashboardRouteForUser()` fallback logic
3. **Navigation**: Create `PatientSidebar.tsx` with patient-specific navigation
4. **Dashboard**: Create `/patient/dashboard/page.tsx` with patient-facing UI
5. **Isolation**: Ensure Patient cannot access `/admin/*` or `/frontdesk/*` routes

---

## 2. ROLE & ROUTING STRATEGY

### Patient Role Identification
- **Role Code**: `PATIENT` (from backend)
- **Identification**: `user.roles?.includes('PATIENT')`
- **No Department**: Patients are not staff, so they don't have departments
- **Permission**: `patients:self:read` and `patients:self:write` (for their own data)

### Routing Logic
- **Primary Route**: `/patient` (not department-based)
- **Fallback in `getDashboardRouteForUser()`**: 
  ```typescript
  if (roles.includes('PATIENT')) return '/patient';
  ```
- **Layout Protection**: Patient layout must redirect non-PATIENT users

### Layout Protection Strategy
1. **Role Check**: `useEffect` checks if user has PATIENT role
2. **Redirect**: Non-PATIENT users redirected to `getDashboardRouteForUser(user)`
3. **AuthGuard**: Wrap children with `requiredRole="PATIENT"`
4. **Isolation**: Explicitly prevent access to `/admin/*` and `/frontdesk/*`

---

## 3. LAYOUT & NAVIGATION DESIGN

### Patient Layout Responsibilities
- Enforce PATIENT-only access
- Render PatientSidebar
- Provide patient-specific layout structure
- Redirect unauthorized users

### Patient Navigation Structure
- **Dashboard**: `/patient/dashboard` - Personalized welcome, upcoming appointments, recent visits
- **Appointments**: `/patient/appointments` - View and manage own appointments
- **Visit History**: `/patient/visits` - Read-only visit history
- **Profile**: `/patient/profile` - Edit own profile (demographics, contact)
- **Messages**: `/patient/messages` - Communication with clinic
- **Notifications**: `/patient/notifications` - System notifications

### Initial Pages to Create
1. `/patient/dashboard/page.tsx` - Main dashboard
2. `/patient/appointments/page.tsx` - Appointments list
3. `/patient/profile/page.tsx` - Profile management
4. `/patient/visits/page.tsx` - Visit history (read-only)

---

## 4. IMPLEMENTATION

### Files to Create
1. `client/app/(protected)/patient/layout.tsx` - Patient layout with guards
2. `client/app/(protected)/patient/dashboard/page.tsx` - Patient dashboard
3. `client/app/(protected)/patient/appointments/page.tsx` - Appointments page
4. `client/app/(protected)/patient/profile/page.tsx` - Profile page
5. `client/app/(protected)/patient/visits/page.tsx` - Visit history page
6. `client/components/layout/PatientSidebar.tsx` - Patient navigation

### Files to Modify
1. `client/lib/department-routing.ts` - Add PATIENT to routing logic
2. `client/lib/constants.ts` - Add PATIENT role constant

---

## 5. VERIFICATION

### Testing Checklist
- [ ] Patient logs in → routed to `/patient/dashboard`
- [ ] Patient cannot access `/admin/*` → redirected to `/patient`
- [ ] Patient cannot access `/frontdesk/*` → redirected to `/patient`
- [ ] Admin cannot access `/patient/*` → redirected to `/admin`
- [ ] FrontDesk cannot access `/patient/*` → redirected to `/frontdesk`
- [ ] Patient navigation shows only patient-appropriate items
- [ ] Patient dashboard shows personalized, healthcare-appropriate content
- [ ] Manual URL typing to `/admin/*` as Patient → redirects
- [ ] Manual URL typing to `/frontdesk/*` as Patient → redirects

---

## PATIENT SCOPE DEFINITION

### What Patient CAN Access
✅ Their own dashboard (personalized, calm, healthcare-appropriate)
✅ Their own appointments (view, book, cancel)
✅ Their own visit history (read-only)
✅ Their own profile (edit demographics, contact info)
✅ Messages/communication with clinic
✅ Notifications
✅ Their own medical records (read-only, if permission granted)

### What Patient MUST NOT Access
❌ Admin features (`/admin/*`)
❌ FrontDesk features (`/frontdesk/*`)
❌ User management
❌ Other patients' data
❌ Scheduling global views
❌ Audit logs
❌ System configuration
❌ Staff dashboards

---

## UX DIRECTION

### Patient Dashboard Design Principles
- **Calm**: Soft colors, plenty of white space, minimal noise
- **Simple**: Clear primary actions, no overwhelming metrics
- **Trustworthy**: Professional healthcare aesthetic
- **Personal**: Personalized greeting, their own data only
- **Healthcare-appropriate**: Medical terminology when needed, but accessible

### Dashboard Content
- Welcome header with patient name
- Upcoming appointments (next 3-5)
- Recent visits (last 3-5, read-only)
- Quick actions: "Book Appointment", "View Profile", "Message Clinic"
- Notifications/messages placeholder
- No staff metrics, no operational data, no system management
