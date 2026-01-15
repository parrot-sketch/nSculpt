# Security Audit - Endpoint Analysis Table

## Summary

**CRITICAL FINDING**: `RolesGuard` in `common/guards/roles.guard.ts` always returns `true`, making all `@Roles()` decorators ineffective. All endpoints are accessible to any authenticated user.

---

## Endpoint Security Analysis

| Endpoint | HTTP Method | Controller.Method | Required Roles | Required Permissions | Current Access Check | Risk Level | Horizontal/Vertical Escalation | Recommendation |
|----------|-------------|-------------------|----------------|---------------------|---------------------|------------|--------------------------------|----------------|
| `/api/v1/auth/login` | POST | AuthController.login | None (Public) | None | `@Public()` - Correctly public | ✅ **LOW** | None | No change needed |
| `/api/v1/auth/refresh` | POST | AuthController.refresh | None (Public) | None | `@Public()` - Correctly public | ✅ **LOW** | None | No change needed |
| `/api/v1/auth/logout` | POST | AuthController.logout | None | None | `JwtAuthGuard` only | ✅ **LOW** | None | No change needed |
| `/api/v1/auth/me` | GET | AuthController.getProfile | None | None | `JwtAuthGuard` only | ✅ **LOW** | None | No change needed |
| `/api/v1/patients` | POST | PatientController.create | ADMIN, NURSE, DOCTOR | None | `@Roles()` + `RolesGuard` (BROKEN) | 🔴 **CRITICAL** | Vertical: Any authenticated user can create patients | 1. Fix RolesGuard 2. Add `patients:*:write` permission 3. Extract userId with `@CurrentUser()` |
| `/api/v1/patients` | GET | PatientController.findAll | ADMIN, NURSE, DOCTOR | None | `@Roles()` + `RolesGuard` (BROKEN) | 🔴 **CRITICAL** | Horizontal: Returns ALL patients without filtering | 1. Fix RolesGuard 2. Filter by department/assigned cases 3. Add `patients:*:read` permission |
| `/api/v1/patients/:id` | GET | PatientController.findOne | ADMIN, NURSE, DOCTOR | None | `@Roles()` + `RolesGuard` (BROKEN) | 🔴 **CRITICAL** | Horizontal: Any user can access any patient PHI | 1. Fix RolesGuard 2. Validate patient relationship 3. Add `patients:*:read` permission 4. Check ResourceAllocation or department |
| `/api/v1/patients/:id` | PATCH | PatientController.update | ADMIN, NURSE, DOCTOR | None | `@Roles()` + `RolesGuard` (BROKEN) | 🔴 **CRITICAL** | Horizontal: Any user can modify any patient; userId undefined | 1. Fix RolesGuard 2. Validate ownership/relationship 3. Extract userId with `@CurrentUser()` 4. Add `patients:*:write` permission |
| `/api/v1/patients/:id` | DELETE | PatientController.remove | ADMIN | None | `@Roles('ADMIN')` + `RolesGuard` (BROKEN) | 🔴 **CRITICAL** | Vertical: Any authenticated user can delete patients | 1. Fix RolesGuard 2. Require `patients:*:delete` permission 3. Extract userId 4. Add confirmation step |
| `/api/v1/theater/cases` | POST | TheaterController.createCase | ADMIN, SURGEON, NURSE | None | `@Roles()` + `RolesGuard` (BROKEN) | 🔴 **CRITICAL** | Vertical: Any authenticated user can create cases; userId undefined | 1. Fix RolesGuard 2. Extract userId 3. Validate surgeon assignment 4. Add `theater:*:write` permission |
| `/api/v1/theater/cases` | GET | TheaterController.findAll | ADMIN, SURGEON, NURSE, DOCTOR | None | `@Roles()` + `RolesGuard` (BROKEN) | 🔴 **CRITICAL** | Horizontal: Returns ALL cases; no filtering by primarySurgeonId | 1. Fix RolesGuard 2. Filter by `primarySurgeonId = userId` OR department OR require ADMIN 3. Add `theater:*:read` permission |
| `/api/v1/theater/cases/:id` | GET | TheaterController.findOne | ADMIN, SURGEON, NURSE, DOCTOR | None | `@Roles()` + `RolesGuard` (BROKEN) | 🔴 **CRITICAL** | Horizontal: Any user can access any case | 1. Fix RolesGuard 2. Validate: user is `primarySurgeonId` OR in ResourceAllocation OR ADMIN 3. Add `theater:*:read` permission |
| `/api/v1/theater/cases/:id` | PATCH | TheaterController.update | ADMIN, SURGEON, NURSE | None | `@Roles()` + `RolesGuard` (BROKEN) | 🔴 **CRITICAL** | Horizontal: Any user can modify any case; userId undefined | 1. Fix RolesGuard 2. Validate: user is `primarySurgeonId` OR ADMIN 3. Extract userId 4. Add `theater:*:write` permission |
| `/api/v1/theater/cases/:id/status` | PATCH | TheaterController.updateStatus | ADMIN, SURGEON, NURSE | None | `@Roles()` + `RolesGuard` (BROKEN) | 🔴 **CRITICAL** | Horizontal: Any user can change any case status; hardcoded currentStatus='SCHEDULED' | 1. Fix RolesGuard 2. Validate: user is `primarySurgeonId` OR ADMIN 3. Fix: Get actual currentStatus from case 4. Extract userId 5. Add `theater:*:write` permission |
| `/api/v1/medical-records` | POST | MedicalRecordsController.create | ADMIN, DOCTOR, NURSE | None | `@Roles()` + `RolesGuard` (BROKEN) | 🔴 **CRITICAL** | Vertical: Any authenticated user can create records; userId undefined | 1. Fix RolesGuard 2. Extract userId 3. Add `medical_records:*:write` permission |
| `/api/v1/medical-records` | GET | MedicalRecordsController.findAll | ADMIN, DOCTOR, NURSE | None | `@Roles()` + `RolesGuard` (BROKEN) | 🔴 **CRITICAL** | Horizontal: Returns ALL records; PHI exposure | 1. Fix RolesGuard 2. Filter by patient relationships 3. Add `medical_records:*:read` permission |
| `/api/v1/medical-records/:id` | GET | MedicalRecordsController.findOne | ADMIN, DOCTOR, NURSE | None | `@Roles()` + `RolesGuard` (BROKEN) | 🔴 **CRITICAL** | Horizontal: Any user can access any medical record PHI | 1. Fix RolesGuard 2. Validate patient relationship 3. Add `medical_records:*:read` permission 4. Check case assignments or department |
| `/api/v1/medical-records/:id` | PATCH | MedicalRecordsController.update | ADMIN, DOCTOR | None | `@Roles()` + `RolesGuard` (BROKEN) | 🔴 **CRITICAL** | Horizontal: Any user can modify any record; userId undefined | 1. Fix RolesGuard 2. Validate patient relationship 3. Extract userId 4. Add `medical_records:*:write` permission |
| `/api/v1/medical-records/:id/merge` | POST | MedicalRecordsController.merge | ADMIN, DOCTOR | None | `@Roles()` + `RolesGuard` (BROKEN) | 🔴 **CRITICAL** | Horizontal: Any user can merge any records; no validation | 1. Fix RolesGuard 2. Validate both records accessible 3. Extract userId 4. Add `medical_records:*:manage` permission |
| `/api/v1/consent/instances` | POST | ConsentController.create | ADMIN, NURSE, DOCTOR | None | `@Roles()` + `RolesGuard` (BROKEN) | 🔴 **CRITICAL** | Vertical: Any authenticated user can create consents; userId undefined | 1. Fix RolesGuard 2. Extract userId 3. Add `consent:*:write` permission |
| `/api/v1/consent/instances` | GET | ConsentController.findAll | ADMIN, NURSE, DOCTOR | None | `@Roles()` + `RolesGuard` (BROKEN) | 🔴 **CRITICAL** | Horizontal: Returns ALL consents; PHI exposure | 1. Fix RolesGuard 2. Filter by patient relationships 3. Add `consent:*:read` permission |
| `/api/v1/consent/instances/:id` | GET | ConsentController.findOne | ADMIN, NURSE, DOCTOR | None | `@Roles()` + `RolesGuard` (BROKEN) | 🔴 **CRITICAL** | Horizontal: Any user can access any consent PHI | 1. Fix RolesGuard 2. Validate patient relationship 3. Add `consent:*:read` permission |
| `/api/v1/consent/instances/:id` | PATCH | ConsentController.update | ADMIN, NURSE, DOCTOR | None | `@Roles()` + `RolesGuard` (BROKEN) | 🔴 **CRITICAL** | Horizontal: Any user can modify any consent; userId undefined | 1. Fix RolesGuard 2. Validate patient relationship 3. Extract userId 4. Add `consent:*:write` permission |
| `/api/v1/consent/instances/:id/revoke` | PATCH | ConsentController.revoke | ADMIN, NURSE, DOCTOR | None | `@Roles()` + `RolesGuard` (BROKEN) | 🔴 **CRITICAL** | Horizontal: Any user can revoke any consent; userId undefined | 1. Fix RolesGuard 2. Validate patient relationship 3. Extract userId 4. Add `consent:*:write` permission 5. Require reason for revocation |
| `/api/v1/billing/bills` | POST | BillingController.create | ADMIN, BILLING, DOCTOR | None | `@Roles()` + `RolesGuard` (BROKEN) | 🔴 **CRITICAL** | Vertical: Any authenticated user can create bills; userId undefined | 1. Fix RolesGuard 2. Extract userId 3. Add `billing:*:write` permission |
| `/api/v1/billing/bills` | GET | BillingController.findAll | ADMIN, BILLING, DOCTOR | None | `@Roles()` + `RolesGuard` (BROKEN) | 🔴 **CRITICAL** | Horizontal: Returns ALL bills; financial + patient data exposure | 1. Fix RolesGuard 2. Filter by patient relationships OR require BILLING role 3. Add `billing:*:read` permission |
| `/api/v1/billing/bills/:id` | GET | BillingController.findOne | ADMIN, BILLING, DOCTOR | None | `@Roles()` + `RolesGuard` (BROKEN) | 🔴 **CRITICAL** | Horizontal: Any user can access any bill; financial + patient data | 1. Fix RolesGuard 2. Validate patient relationship OR BILLING role 3. Add `billing:*:read` permission |
| `/api/v1/billing/bills/:id` | PATCH | BillingController.update | ADMIN, BILLING | None | `@Roles()` + `RolesGuard` (BROKEN) | 🔴 **CRITICAL** | Horizontal: Any authenticated user can modify any bill; userId undefined | 1. Fix RolesGuard 2. Require BILLING role + validate access 3. Extract userId 4. Add `billing:*:write` permission |
| `/api/v1/inventory/items` | POST | InventoryController.create | ADMIN, INVENTORY_MANAGER | None | `@Roles()` + `RolesGuard` (BROKEN) | 🔴 **CRITICAL** | Vertical: Any authenticated user can create items; userId undefined | 1. Fix RolesGuard 2. Extract userId 3. Add `inventory:*:write` permission |
| `/api/v1/inventory/items` | GET | InventoryController.findAll | ADMIN, INVENTORY_MANAGER, NURSE, DOCTOR | None | `@Roles()` + `RolesGuard` (BROKEN) | 🟡 **MEDIUM** | Vertical: Any authenticated user can view all inventory | 1. Fix RolesGuard 2. Add `inventory:*:read` permission (less critical - inventory not PHI) |
| `/api/v1/inventory/items/:id` | GET | InventoryController.findOne | ADMIN, INVENTORY_MANAGER, NURSE, DOCTOR | None | `@Roles()` + `RolesGuard` (BROKEN) | 🟡 **MEDIUM** | Vertical: Any authenticated user can view any item | 1. Fix RolesGuard 2. Add `inventory:*:read` permission |
| `/api/v1/inventory/items/:id` | PATCH | InventoryController.update | ADMIN, INVENTORY_MANAGER | None | `@Roles()` + `RolesGuard` (BROKEN) | 🔴 **CRITICAL** | Vertical: Any authenticated user can modify inventory; userId undefined | 1. Fix RolesGuard 2. Extract userId 3. Add `inventory:*:write` permission |

---

## Key Findings

### Critical Issues

1. **RolesGuard Always Returns True**
   - Location: `backend/src/common/guards/roles.guard.ts:29`
   - Impact: All `@Roles()` decorators are ineffective
   - Risk: **CRITICAL** - Complete access control bypass

2. **No Permission Checks**
   - `@Permissions()` decorator exists but is never used
   - No `PermissionsGuard` implementation
   - Risk: **HIGH** - No fine-grained access control

3. **No Row-Level Security**
   - `RlsGuard` always returns `true`
   - No ownership/relationship validation
   - Risk: **CRITICAL** - Horizontal privilege escalation

4. **User ID Always Undefined**
   - All controllers have `const userId = undefined;`
   - Audit trails incomplete
   - Risk: **HIGH** - HIPAA compliance violation

5. **No Resource Filtering**
   - All `findAll()` methods return ALL records
   - No department/relationship filtering
   - Risk: **CRITICAL** - PHI exposure

---

## Immediate Actions Required

### P0 - Critical (Do Not Deploy)

1. **Fix RolesGuard** - Replace broken implementation with working one from `modules/auth/guards/roles.guard.ts`
2. **Extract User ID** - Use `@CurrentUser()` decorator in all controllers
3. **Add Ownership Validation** - Validate user has relationship with resource before access
4. **Add Filtering** - Filter `findAll()` by department, assigned cases, relationships

### P1 - High (Before Production)

5. **Implement RlsGuard** - Add resource ownership checks
6. **Add Permission Checks** - Implement `PermissionsGuard` and use `@Permissions()` decorator
7. **Fix Hardcoded Values** - Fix `currentStatus = 'SCHEDULED'` in `updateStatus()`

---

## Risk Summary

- **🔴 CRITICAL**: 25 endpoints
- **🟡 MEDIUM**: 2 endpoints  
- **✅ LOW**: 4 endpoints (auth endpoints)

**Total Endpoints Audited**: 31  
**Vulnerable Endpoints**: 27 (87%)

---

**This system is NOT production-ready for HIPAA compliance.**












