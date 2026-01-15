# Phase 4.2: Fine-Grained RBAC & Route Isolation - Architectural Analysis

**Date:** 2026-01-11  
**Status:** Analysis Complete - Ready for Implementation  
**Objective:** Implement strict route isolation between Admin and FrontDesk areas

---

## 🔍 CURRENT ARCHITECTURE ANALYSIS

### 1. Current Route Structure

**Current Layout:**
```
app/
  (protected)/
    admin/              ← Admin routes (allows FRONT_DESK for patients - WRONG!)
    frontdesk/          ← FrontDesk routes (allows ADMIN - OK for now)
    patients/           ← Shared patient routes (WRONG - should be department-specific)
    dashboard/          ← Generic fallback
```

**Critical Issues:**
1. ❌ **No Route Group Isolation** - All routes under single `(protected)` group
2. ❌ **Admin Layout Leakage** - Admin layout allows FRONT_DESK for patient routes
3. ❌ **Shared Patient Routes** - `/patients/*` accessible to all roles
4. ❌ **FrontDesk Can Access Admin** - FrontDesk can manually navigate to `/admin/*`
5. ❌ **No Strict Layout-Level Guards** - Guards are per-page, not per-route-group

---

### 2. Current Guard Implementation

**Admin Layout (`/admin/layout.tsx`):**
```typescript
// CURRENT - ALLOWS FRONT_DESK FOR PATIENT ROUTES (SECURITY ISSUE)
if (isPatientRoute) {
  return (
    <AuthGuard requiredRoles={[ROLES.ADMIN, ROLES.FRONT_DESK]}>
      {children}
    </AuthGuard>
  );
}
```

**Problem:** FrontDesk can access `/admin/patients/*` routes, which exposes admin UI and navigation.

**FrontDesk Layout (`/frontdesk/layout.tsx`):**
```typescript
// CURRENT - ALLOWS ADMIN (OK, but not strict enough)
<RoleGuard roles={['FRONT_DESK', 'ADMIN']}>
  {children}
</RoleGuard>
```

**Problem:** No strict enforcement that FrontDesk users can ONLY access `/frontdesk/*`.

---

### 3. Navigation Leakage

**Parent Layout (`(protected)/layout.tsx`):**
- Sidebar selection is path-based only
- No role-based filtering
- FrontDesk user on `/admin/patients` sees Admin sidebar
- This is a security and UX issue

---

### 4. FrontDesk Scope Definition

**FrontDesk Should Access:**
- ✅ Patient registration (`/frontdesk/patients/new`)
- ✅ Patient list (read-only, filtered)
- ✅ Patient details (read-only)
- ✅ Appointment booking
- ✅ Check-in / Check-out
- ✅ View schedules
- ✅ View encounter status (read-only)
- ✅ Billing (read-only, limited)

**FrontDesk Should NOT Access:**
- ❌ `/admin/*` routes (any admin route)
- ❌ User management
- ❌ Role management
- ❌ System configuration
- ❌ Audit logs
- ❌ Admin dashboard
- ❌ Locked encounter editing

---

## 🎯 PROPOSED ARCHITECTURE

### Route Group Isolation

**New Structure:**
```
app/
  (protected)/
    (admin)/              ← Route group: ADMIN only
      admin/
        layout.tsx        ← Strict ADMIN-only guard
        dashboard/
        users/
        patients/         ← Admin patient management
        system-config/
    
    (frontdesk)/          ← Route group: FRONT_DESK only
      frontdesk/
        layout.tsx        ← Strict FRONT_DESK-only guard
        dashboard/        ← Purpose-built FrontDesk dashboard
        patients/
          new/            ← Patient registration
          [id]/           ← Patient view (read-only)
        appointments/
        check-in/
    
    (shared)/             ← Shared routes (if needed)
      encounters/         ← Read-only encounter viewing
      consent/            ← Consent viewing
```

---

### Layout-Level Protection

**Admin Route Group Layout:**
```typescript
// (admin)/admin/layout.tsx
export default function AdminRouteGroupLayout() {
  return (
    <AuthGuard requiredRole="ADMIN" requiredPermissions={['admin:*:read']}>
      {/* Admin-only content */}
    </AuthGuard>
  );
}
```

**FrontDesk Route Group Layout:**
```typescript
// (frontdesk)/frontdesk/layout.tsx
export default function FrontDeskRouteGroupLayout() {
  return (
    <AuthGuard requiredRoles={[ROLES.FRONT_DESK]} redirectTo="/frontdesk">
      {/* FrontDesk-only content */}
    </AuthGuard>
  );
}
```

**Key:** Each route group has its own layout that enforces role at the route level, not just component level.

---

### Navigation Isolation

**Admin Sidebar:**
- Only rendered in `(admin)` route group
- Never shown to FrontDesk users
- Admin-specific navigation items

**FrontDesk Sidebar:**
- Only rendered in `(frontdesk)` route group
- Never shown to Admin users (unless they're in frontdesk route)
- FrontDesk-specific navigation items

**Parent Layout:**
- Detects route group from pathname
- Renders appropriate sidebar based on route group
- No cross-role sidebar rendering

---

## 📋 IMPLEMENTATION PLAN

### Phase 1: Create Route Groups

1. Create `(admin)` route group
2. Create `(frontdesk)` route group
3. Move existing routes to appropriate groups

### Phase 2: Strict Layout Guards

1. Admin route group layout - ADMIN only
2. FrontDesk route group layout - FRONT_DESK only
3. Remove FRONT_DESK access from admin layout

### Phase 3: Route Migration

1. Move `/admin/*` → `(admin)/admin/*`
2. Move `/frontdesk/*` → `(frontdesk)/frontdesk/*`
3. Move patient registration to `/frontdesk/patients/new`
4. Update all internal links

### Phase 4: FrontDesk Dashboard

1. Create purpose-built FrontDesk dashboard
2. Add FrontDesk-specific KPIs
3. Add FrontDesk-specific navigation

### Phase 5: Navigation Updates

1. Update sidebar selection logic
2. Ensure no cross-role navigation
3. Update all route references

---

## 🔒 SECURITY REQUIREMENTS

### Access Matrix

| Route Pattern | ADMIN | FRONT_DESK | DOCTOR | NURSE |
|--------------|-------|------------|--------|-------|
| `/admin/*` | ✅ | ❌ | ❌ | ❌ |
| `/frontdesk/*` | ✅* | ✅ | ❌ | ❌ |
| `/nursing/*` | ✅* | ❌ | ❌ | ✅ |
| `/theater/*` | ✅* | ❌ | ❌ | ❌ |

*Admin can access all departments for management purposes, but should see appropriate UI.

### Enforcement Points

1. **Route Group Layout** - First line of defense
2. **Page-Level Guards** - Second line of defense
3. **Backend API** - Final enforcement

---

## 🚀 NEXT STEPS

1. Review and approve this architecture
2. Begin route group creation
3. Implement strict layout guards
4. Migrate routes
5. Build FrontDesk dashboard
6. Test isolation

---

**Status:** Ready for Implementation  
**Risk Level:** Medium (requires route migration)  
**Breaking Changes:** Route paths will change (need redirects)
