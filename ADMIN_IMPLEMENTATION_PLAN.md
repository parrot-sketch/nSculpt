# Admin Workflows Implementation Plan

**Date:** January 2025  
**Purpose:** Systematic implementation of all admin workflows from ADMIN_WORKFLOWS_USER_STORIES.md

---

## Architecture Overview

### Database-First Approach
1. **Data Structure**: Ensure all entities are properly structured in Prisma schema
2. **Repository Layer**: Data access with Prisma type safety
3. **Service Layer**: Business logic, validation, domain events
4. **Controller Layer**: HTTP endpoints, guards, interceptors
5. **DTO Layer**: Request/response validation

### Key Patterns
- **Repository Pattern**: Data access isolation
- **Domain Events**: All mutations emit events for audit
- **Data Access Logging**: All reads/writes logged
- **Immutable Records**: Historical data never modified
- **Event-Driven**: Critical operations event-anchored

---

## Critical Gap Analysis

### Location Entity Issue

**Current State:**
- `InventoryStock.locationId` references UUID but no `Location` entity exists
- `InventoryTransaction.fromLocationId/toLocationId` also reference UUIDs
- Comment says: "Theater, storage room, etc."

**Options:**
1. **Option A**: Use `OperatingTheater.id` for theater locations, add `InventoryLocation` entity for storage rooms
2. **Option B**: Create unified `Location` entity (theaters, storage rooms, warehouses)
3. **Option C**: Use polymorphic approach with `locationType` + `locationId`

**Recommendation: Option A (Hybrid)**
- OperatingTheater already exists and is sufficient for theater locations
- Add `InventoryLocation` entity for storage rooms/warehouses
- `locationId` can reference either (application layer validates)

**Implementation:**
- Add `InventoryLocation` model to `inventory.prisma`
- Fields: id, code (unique), name, description, locationType (STORAGE_ROOM, WAREHOUSE, etc.), active, audit fields
- No foreign key constraint (application validates reference exists)

---

## Implementation Phases

### Phase 1: Database Schema Updates
**Priority: CRITICAL (must be done first)**

1. Add `InventoryLocation` entity (if needed)
2. Verify all required entities exist:
   - ✅ Department (theater.prisma)
   - ✅ OperatingTheater (theater.prisma)
   - ✅ InventoryCategory (inventory.prisma)
   - ✅ Vendor (inventory.prisma)
   - ✅ BillingCode (billing.prisma)
   - ✅ InsuranceProvider (billing.prisma)
   - ✅ FeeSchedule (billing.prisma)

### Phase 2: System Configuration (SC-001 to SC-007)
**Priority: HIGH (required before other workflows)**

These are foundational structures needed for the system:
- SC-001: Manage Departments
- SC-002: Manage Operating Theaters
- SC-003: Manage Inventory Categories
- SC-004: Manage Vendors
- SC-005: Manage Billing Codes
- SC-006: Manage Insurance Providers
- SC-007: Manage Fee Schedules

**Entities:**
- DepartmentsService + DepartmentsController
- TheatersService + TheatersController
- CategoriesService + CategoriesController (inventory)
- VendorsService + VendorsController
- BillingCodesService + BillingCodesController
- InsuranceProvidersService + InsuranceProvidersController
- FeeSchedulesService + FeeSchedulesController

### Phase 3: User Management (US-001 to US-008)
**Priority: HIGH (MVP)**

Already partially implemented, need to complete:
- ✅ US-001: Create User (exists)
- ✅ US-002: Update User (exists)
- ✅ US-003: Deactivate User (exists)
- ✅ US-004: Assign Role (exists)
- ✅ US-005: Revoke Role (exists)
- ⚠️ US-006: Reset Password (needs verification)
- ⚠️ US-007: View User Sessions (needs implementation)
- ⚠️ US-008: Search and Filter Users (exists but verify)

### Phase 4: Role & Permission Management (RP-001 to RP-008)
**Priority: HIGH (MVP)**

Already partially implemented, need to complete:
- ✅ RP-001: Create Role (exists)
- ✅ RP-002: Update Role (exists)
- ✅ RP-003: Deactivate Role (needs verification)
- ✅ RP-004: Assign Permission (exists)
- ✅ RP-005: Remove Permission (exists)
- ⚠️ RP-006: View Users with Role (needs implementation)
- ⚠️ RP-007: Browse Permissions (exists but verify)
- ⚠️ RP-008: View Permission Details (needs implementation)

### Phase 5: Audit & Compliance (AC-001 to AC-005)
**Priority: HIGH (Compliance Critical)**

- AC-001: View Data Access Logs
- AC-002: View Domain Events
- AC-003: View User Sessions
- AC-004: Revoke User Session
- AC-005: Generate HIPAA Access Report

### Phase 6: Cross-Domain Admin (CD-001 to CD-003)
**Priority: MEDIUM**

- CD-001: Merge Medical Records
- CD-002: Reverse Medical Record Merge
- CD-003: View System Health

### Phase 7: Dashboard & Reporting (DR-001 to DR-003)
**Priority: MEDIUM**

- ✅ DR-001: View Admin Dashboard (exists but enhance)
- DR-002: View User Activity Report
- DR-003: View Permission Usage Report

---

## File Structure

```
backend/src/modules/admin/
├── admin.module.ts
├── controllers/
│   ├── admin.controller.ts (dashboard)
│   ├── users.controller.ts
│   ├── roles.controller.ts
│   ├── permissions.controller.ts
│   ├── departments.controller.ts (NEW)
│   ├── theaters.controller.ts (NEW)
│   ├── inventory-config.controller.ts (NEW - categories, vendors)
│   ├── billing-config.controller.ts (NEW - codes, providers, fee schedules)
│   ├── audit.controller.ts (NEW)
│   └── system-health.controller.ts (NEW)
├── services/
│   ├── admin.service.ts
│   ├── users.service.ts
│   ├── roles.service.ts
│   ├── permissions.service.ts
│   ├── departments.service.ts (NEW)
│   ├── theaters.service.ts (NEW)
│   ├── categories.service.ts (NEW)
│   ├── vendors.service.ts (NEW)
│   ├── billing-codes.service.ts (NEW)
│   ├── insurance-providers.service.ts (NEW)
│   ├── fee-schedules.service.ts (NEW)
│   └── audit.service.ts (NEW)
├── repositories/
│   ├── users.repository.ts
│   ├── roles.repository.ts
│   ├── permissions.repository.ts
│   ├── departments.repository.ts (NEW)
│   ├── theaters.repository.ts (NEW)
│   ├── categories.repository.ts (NEW)
│   ├── vendors.repository.ts (NEW)
│   ├── billing-codes.repository.ts (NEW)
│   ├── insurance-providers.repository.ts (NEW)
│   ├── fee-schedules.repository.ts (NEW)
│   └── audit.repository.ts (NEW)
└── dto/
    ├── (existing user/role/permission DTOs)
    ├── departments/ (NEW)
    ├── theaters/ (NEW)
    ├── categories/ (NEW)
    ├── vendors/ (NEW)
    ├── billing-codes/ (NEW)
    ├── insurance-providers/ (NEW)
    ├── fee-schedules/ (NEW)
    └── audit/ (NEW)
```

---

## Implementation Order

1. **Database Schema** (if Location entity needed)
2. **System Configuration** (SC-001 to SC-007) - Foundation
3. **Complete User Management** (verify/complete US-001 to US-008)
4. **Complete Role/Permission Management** (verify/complete RP-001 to RP-008)
5. **Audit & Compliance** (AC-001 to AC-005)
6. **Cross-Domain** (CD-001 to CD-003)
7. **Dashboard Enhancement** (DR-001 to DR-003)

---

## Next Steps

1. Verify existing implementations
2. Create missing System Configuration modules
3. Complete missing User/Role/Permission workflows
4. Implement Audit workflows
5. Implement Cross-Domain workflows
6. Enhance Dashboard









