# Role-Aware Frontend Implementation

## Overview

The frontend has been extended with comprehensive role-aware dashboards and workflow pages aligned with the database architecture. The system respects the event-driven, immutable audit architecture from the backend.

## Architecture Alignment

### Database-Driven Design

The frontend types and services are **directly aligned** with the Prisma schema:

- **Theater/Surgical Cases**: Matches `SurgicalCase`, `TheaterReservation`, `ResourceAllocation` models
- **Inventory**: Matches `InventoryItem`, `InventoryStock`, `InventoryTransaction`, `InventoryUsage` models
- **Billing**: Matches `Bill`, `BillLineItem`, `Payment`, `InsuranceClaim` models
- **Medical Records**: Matches `MedicalRecord`, `ClinicalNote` models

### Event-Driven Awareness

The UI respects the event-driven architecture:
- All transactions reference `triggeringEventId` (backend handles this)
- Immutable records are displayed as read-only where appropriate
- Status changes show history via `CaseStatusHistory`
- Audit trails are accessible via audit logs

## Role-Based Access Control

### Roles Supported

1. **ADMIN** - Full system access
2. **SURGEON / DOCTOR** - Clinical workflows
3. **NURSE** - Patient care and monitoring
4. **THEATER_MANAGER** - OR scheduling and coordination
5. **INVENTORY_MANAGER** - Stock management
6. **BILLING / FRONT_DESK** - Revenue cycle management

### Permission System

Permissions follow the pattern: `domain:resource:action`

Examples:
- `theater:*:read` - Read theater information
- `theater:*:book` - Book operating theaters
- `inventory:*:write` - Manage inventory
- `billing:*:approve` - Approve billing adjustments

## Components Created

### Reusable Components

1. **DataTable** (`components/tables/DataTable.tsx`)
   - Generic table component with column definitions
   - Supports row click handlers
   - Empty state handling

2. **StatCard** (`components/cards/StatCard.tsx`)
   - Dashboard statistics display
   - Supports trends and icons
   - Clickable for navigation

3. **Modal** (`components/modals/Modal.tsx`)
   - Reusable modal dialog
   - Portal-based rendering
   - Size variants (sm, md, lg, xl)

4. **PermissionsGuard** (`components/layout/PermissionsGuard.tsx`)
   - Conditional rendering based on permissions
   - Domain-based convenience wrapper
   - Fallback UI support

### Enhanced Components

1. **Sidebar** (`components/layout/Sidebar.tsx`)
   - **Dynamic role-based navigation**
   - Sections: Clinical, Operations, Administration
   - Filters items by permissions AND roles
   - Multi-role support

2. **Dashboard** (`app/(protected)/dashboard/page.tsx`)
   - **Role-aware widgets**
   - Different stats/metrics per role
   - Quick actions based on user capabilities

## Pages Created

### Workflow Pages

1. **Procedures** (`/procedures`)
   - Lists all surgical cases
   - Status tracking (SCHEDULED, IN_PROGRESS, COMPLETED, etc.)
   - Priority indicators
   - Links to case details

2. **OR Booking** (`/or-booking`)
   - Theater reservation management
   - Prevents double-booking (backend enforced)
   - Filter by theater
   - Block time support

3. **Post-Op Notes** (`/post-op`)
   - Post-operative documentation
   - Links completed cases to medical records
   - Clinical note creation

4. **Inventory Management** (`/inventory`)
   - Stock level tracking
   - Low stock alerts
   - Batch/lot tracking support
   - Billable item flags

5. **Billing** (`/billing`)
   - Invoice management
   - Payment tracking
   - Insurance claim status
   - Revenue metrics

## API Services

### Service Layer

All services use the existing `apiClient` with automatic token injection:

1. **theaterService** - Surgical cases, reservations, resource allocation
2. **inventoryService** - Items, stock, transactions, usage
3. **billingService** - Bills, payments, insurance, claims
4. **medicalRecordsService** - Records, clinical notes, attachments
5. **patientService** - Patient management (existing)

### Data Fetching

Uses **TanStack Query** for:
- Automatic caching
- Background refetching
- Loading/error states
- Optimistic updates (ready for implementation)

## Type Safety

### Domain Types

All types in `types/domain.ts` match Prisma schema:
- Exact field names and types
- Optional fields marked correctly
- Relations included where needed
- Decimal types as strings (JSON serialization)

## Navigation Structure

### Sidebar Sections

```
Main
├── Dashboard

Clinical
├── Patients
├── Procedures
├── Medical Records
├── Consent
└── Post-Op Notes

Operations
├── Theater Schedule
├── OR Booking
├── Inventory
└── Stock Requests

Administration
├── Billing
├── Appointments
├── Patient Registration
└── Payments

Settings
├── Settings
└── Audit Logs (Admin only)
```

### Dynamic Filtering

- Items filtered by **permissions** (from backend)
- Items filtered by **roles** (if specified)
- Multi-role users see combined navigation
- Sections only show if they have visible items

## Dashboard Customization

### Role-Specific Widgets

**Surgeon/Doctor:**
- My Cases (upcoming and in-progress)
- Procedure schedule
- Post-op documentation status

**Nurse:**
- Assigned patients
- Pre-op prep checklist
- Post-op monitoring alerts

**Theater Manager:**
- Today's schedule
- Theater availability
- Resource allocation status

**Inventory Manager:**
- Low stock alerts
- Reorder recommendations
- Stock level overview

**Billing/Front Desk:**
- Pending payments
- Unpaid invoices
- Revenue metrics

**Admin:**
- System-wide overview
- All metrics combined
- Audit log access

## Security & Compliance

### HIPAA Compliance

- ✅ No PHI in localStorage (sessionStorage only)
- ✅ Permission checks at route and component level
- ✅ Backend is source of truth for permissions
- ✅ Audit logs accessible (admin only)
- ✅ Secure token handling

### Permission Enforcement

1. **Route Level**: `AuthGuard` + `PermissionsGuard`
2. **Component Level**: `PermissionsGuard` wrapper
3. **Navigation Level**: Sidebar filters by permissions
4. **API Level**: Backend enforces (frontend never bypasses)

## Database Alignment

### Event-Driven Features

The UI is designed to work with the event-driven backend:

- **Status Changes**: Display `CaseStatusHistory` for audit trail
- **Inventory Transactions**: Show immutable transaction log
- **Billing Line Items**: Display `triggeringEventId` references
- **Clinical Notes**: Show amendment history

### Immutability Respect

- Read-only displays for immutable records
- Amendment tracking for clinical notes
- Status history visualization
- Audit trail access

## Next Steps

### To Complete Implementation

1. **Form Components**: Create forms for creating/editing entities
2. **Detail Pages**: Individual pages for cases, patients, bills, etc.
3. **Calendar View**: Theater scheduling calendar
4. **Reports**: Role-specific reports and analytics
5. **Notifications**: Real-time alerts for low stock, overdue bills, etc.

### Integration Points

1. **Backend Endpoints**: Ensure all API endpoints exist
2. **WebSocket**: Real-time updates for case status, inventory, etc.
3. **File Upload**: For medical record attachments
4. **PDF Generation**: For bills, consent forms, etc.

## File Structure

```
client/
├── app/(protected)/
│   ├── dashboard/          # Role-aware dashboard
│   ├── procedures/          # Surgical cases
│   ├── or-booking/         # Theater reservations
│   ├── post-op/            # Post-operative notes
│   ├── inventory/          # Stock management
│   ├── billing/            # Revenue cycle
│   └── ...
├── components/
│   ├── tables/DataTable.tsx
│   ├── cards/StatCard.tsx
│   ├── modals/Modal.tsx
│   └── layout/
│       ├── Sidebar.tsx      # Enhanced with role filtering
│       ├── AuthGuard.tsx
│       └── PermissionsGuard.tsx
├── services/
│   ├── theater.service.ts
│   ├── inventory.service.ts
│   ├── billing.service.ts
│   └── medicalRecords.service.ts
└── types/
    └── domain.ts            # Database-aligned types
```

## Usage Examples

### Checking Permissions

```tsx
import { PermissionsGuard } from '@/components/layout/PermissionsGuard';
import { PERMISSION_DOMAINS, PERMISSION_ACTIONS } from '@/lib/constants';
import { buildPermission } from '@/lib/permissions';

<PermissionsGuard
  requiredPermission={buildPermission(
    PERMISSION_DOMAINS.THEATER,
    '*',
    PERMISSION_ACTIONS.BOOK
  )}
>
  <BookTheaterButton />
</PermissionsGuard>
```

### Role-Based Rendering

```tsx
import { useAuth } from '@/hooks/useAuth';
import { ROLES } from '@/lib/constants';

const { user } = useAuth();
const isSurgeon = user?.roles.includes(ROLES.SURGEON);

{isSurgeon && <SurgeonOnlyWidget />}
```

### Fetching Data

```tsx
import { useQuery } from '@tanstack/react-query';
import { theaterService } from '@/services/theater.service';

const { data, isLoading } = useQuery({
  queryKey: ['surgical-cases'],
  queryFn: () => theaterService.getCases(0, 50),
});
```

## Summary

The frontend is now **fully role-aware** and **database-aligned**:

✅ Role-based dashboards
✅ Permission-driven navigation
✅ Workflow pages for each role
✅ Type-safe API integration
✅ Reusable component library
✅ HIPAA-compliant security
✅ Event-driven architecture awareness

Ready for feature development and backend integration!












