# Admin UI Architecture Plan

## Overview

Modern, professional admin UI built with Next.js 14 App Router, React Query, and Tailwind CSS.

## Architecture Principles

1. **Separation of Concerns**: Service layer, types, components, and pages
2. **Type Safety**: Full TypeScript coverage
3. **Server State**: React Query for all API data
4. **Client State**: Minimal local state, context for UI state
5. **Reusability**: Shared components and hooks
6. **Performance**: Optimistic updates, caching, pagination
7. **Accessibility**: ARIA labels, keyboard navigation
8. **UX**: Loading states, error handling, optimistic updates

## File Structure

```
client/
├── app/
│   └── (protected)/
│       └── admin/
│           ├── layout.tsx                    # Admin layout with navigation
│           ├── page.tsx                      # Dashboard
│           ├── users/
│           │   ├── page.tsx                  # Users list
│           │   ├── [id]/
│           │   │   └── page.tsx              # User detail/edit
│           │   └── new/
│           │       └── page.tsx              # Create user
│           ├── roles/
│           │   ├── page.tsx                  # Roles list
│           │   ├── [id]/
│           │   │   └── page.tsx              # Role detail/edit
│           │   └── new/
│           │       └── page.tsx              # Create role
│           ├── permissions/
│           │   ├── page.tsx                  # Permissions list
│           │   └── [id]/
│           │       └── page.tsx              # Permission detail
│           ├── system-config/
│           │   ├── departments/
│           │   ├── theaters/
│           │   ├── categories/
│           │   ├── vendors/
│           │   ├── billing-codes/
│           │   ├── insurance-providers/
│           │   └── fee-schedules/
│           ├── audit/
│           │   ├── access-logs/
│           │   ├── domain-events/
│           │   ├── sessions/
│           │   └── hipaa-reports/
│           ├── medical-records/
│           │   └── merge/
│           ├── system-health/
│           │   └── page.tsx
│           └── reports/
│               ├── user-activity/
│               └── permission-usage/
├── components/
│   └── admin/
│       ├── layout/
│       │   ├── AdminNav.tsx                  # Main navigation
│       │   └── AdminHeader.tsx               # Header with breadcrumbs
│       ├── tables/
│       │   ├── UsersTable.tsx
│       │   ├── RolesTable.tsx
│       │   └── DataTable.tsx                 # Generic table
│       ├── forms/
│       │   ├── UserForm.tsx
│       │   ├── RoleForm.tsx
│       │   └── FilterForm.tsx                # Generic filter form
│       ├── modals/
│       │   ├── ConfirmModal.tsx
│       │   ├── UserModal.tsx
│       │   └── RoleModal.tsx
│       └── cards/
│           ├── StatCard.tsx                  # Already exists
│           └── InfoCard.tsx
├── services/
│   └── admin.service.ts                      # Expanded service
├── types/
│   └── admin.ts                              # Expanded types
└── hooks/
    └── admin/
        ├── useUsers.ts
        ├── useRoles.ts
        └── usePermissions.ts
```

## Routing Structure

```
/admin                          # Dashboard
/admin/users                    # Users list
/admin/users/new                # Create user
/admin/users/[id]               # User detail/edit
/admin/roles                    # Roles list
/admin/roles/new                # Create role
/admin/roles/[id]               # Role detail/edit
/admin/permissions              # Permissions list
/admin/permissions/[id]         # Permission detail
/admin/system-config/departments
/admin/system-config/theaters
/admin/system-config/categories
/admin/system-config/vendors
/admin/system-config/billing-codes
/admin/system-config/insurance-providers
/admin/system-config/fee-schedules
/admin/audit/access-logs
/admin/audit/domain-events
/admin/audit/sessions
/admin/audit/hipaa-reports
/admin/medical-records/merge
/admin/system-health
/admin/reports/user-activity
/admin/reports/permission-usage
```

## Component Patterns

### Data Fetching
- React Query for all server state
- Custom hooks for each resource type
- Optimistic updates for mutations
- Proper error handling and retry logic

### Forms
- Controlled components with React Hook Form (if needed) or native state
- Validation with Zod schemas
- Loading and error states
- Success feedback

### Tables
- Server-side pagination
- Sorting and filtering
- Row actions (edit, delete, view)
- Empty states

### Modals
- Reusable modal component
- Form modals for create/edit
- Confirm modals for destructive actions
- Proper focus management

## State Management Strategy

1. **Server State**: React Query
   - All API data
   - Automatic caching
   - Background refetching
   - Optimistic updates

2. **Client State**: React state + Context
   - UI state (modals, filters)
   - Form state
   - Navigation state

3. **Global State**: Zustand (already in use)
   - Auth state
   - User preferences
   - UI theme/settings

## Implementation Phases

### Phase 1: Foundation
- Expand admin service with all API methods
- Expand types
- Create reusable components (tables, forms, modals)
- Update admin layout with navigation

### Phase 2: Core Features
- User Management (enhance existing)
- Role & Permission Management (enhance existing)
- Dashboard (enhance existing)

### Phase 3: System Configuration
- Departments, Theaters, Categories, Vendors
- Billing Codes, Insurance Providers, Fee Schedules

### Phase 4: Audit & Compliance
- Access Logs, Domain Events, Sessions
- HIPAA Reports

### Phase 5: Cross-Domain & Reporting
- Medical Record Merges
- System Health
- User Activity Reports
- Permission Usage Reports

## Design System

### Colors
- Primary: Blue (system primary)
- Success: Green
- Warning: Yellow/Orange
- Error: Red
- Neutral: Gray scale

### Typography
- Headings: Bold, clear hierarchy
- Body: Regular, readable
- Labels: Medium weight
- Small text: Muted color

### Spacing
- Consistent spacing scale (4px base)
- Padding: p-4, p-6
- Gaps: gap-4, gap-6

### Components
- Cards: White background, border, shadow-sm
- Buttons: Primary, secondary, danger variants
- Inputs: Clean, bordered, focus states
- Tables: Striped rows, hover states









