# RBAC Audit & Refinement for Surgical EHR

**Date:** January 2025  
**Purpose:** Audit existing RBAC implementation and propose incremental improvements for surgical EHR requirements

---

## Executive Summary

Your RBAC implementation is **architecturally sound** with proper separation of concerns:
- ✅ Permission-driven access control (not role-hardcoded)
- ✅ Proper guard chain: RolesGuard → PermissionsGuard → RlsGuard
- ✅ Audit logging integrated
- ✅ Domain-driven permission structure

**Key Findings:**
1. **Missing roles** for surgical EHR workflow (9 roles need to be added)
2. **Incomplete permission coverage** for surgical operations (consent, clinical notes, surgery lifecycle)
3. **Some controllers still mix role checks** - should be permission-only
4. **Permission naming inconsistencies** - some use `*` wildcard, some use specific resources

**Recommendation:** Incremental improvements with **zero breaking changes**. All changes are additive.

---

## 1. Current Architecture Assessment

### 1.1 Models Review

**✅ Strengths:**
- `User` model: Well-structured with audit fields, department linkage
- `Role` model: Simple, effective, supports activation/deactivation
- `Permission` model: Excellent structure with `domain`, `resource`, `action` pattern
- `RolePermission`: Proper many-to-many with audit trail
- `UserRoleAssignment`: Time-bound assignments supported (validFrom/validUntil)

**⚠️ Minor Issues:**
- No constraint preventing deactivation of role with active user assignments (handled in service layer - acceptable)
- `Permission.resource` is nullable - consider making required for consistency
- No index on `Permission.domain` alone (only composite with resource/action)

### 1.2 Guards & Decorators Review

**✅ Strengths:**
- `PermissionsGuard`: Correctly checks ALL required permissions (not ANY)
- `RolesGuard`: Correctly checks ANY required role (flexible)
- `RlsGuard`: Row-level security for resource ownership
- Guards are composable and work together
- Audit logging integrated in guards

**✅ Current Usage Pattern (Good):**
```typescript
@UseGuards(RolesGuard, RlsGuard, PermissionsGuard)
@Roles('ADMIN', 'SURGEON', 'NURSE')  // Coarse-grained filter
@Permissions('consent:*:write')      // Fine-grained control
```

**⚠️ Issue:** Some controllers use `@Roles()` decorator which is acceptable for coarse filtering, but **permissions should be the source of truth**. The `@Roles()` decorator should be optional/legacy support.

### 1.3 Current Roles (from seed.ts)

**Existing:**
- `ADMIN` - System administrator
- `DOCTOR` - Medical professional
- `SURGEON` - Surgical specialist
- `NURSE` - Nursing staff
- `THEATER_MANAGER` - Theater scheduling
- `INVENTORY_MANAGER` - Inventory management
- `BILLING` - Billing staff
- `FRONT_DESK` - Front desk staff

**Missing (Required for Surgical EHR):**
- `PATIENT` - Patient portal access
- `GUARDIAN` - Guardian/proxy access
- `ASSISTANT_SURGEON` - Assistant surgeon
- `ANESTHESIOLOGIST` - Anesthesia provider
- `MEDICAL_DIRECTOR` - Medical director oversight
- `RECEPTIONIST` - Reception staff (different from FRONT_DESK)
- `PRACTICE_MANAGER` - Practice administration
- `BILLING_OFFICER` - Billing officer (different from BILLING)
- `INSURANCE_OFFICER` - Insurance claims specialist
- `AUDIT_OFFICER` - Compliance/audit specialist

### 1.4 Current Permission Domains

**Existing Domains:**
- `RBAC` - User/role/permission management
- `MEDICAL_RECORDS` - Medical records access
- `THEATER` - Theater scheduling
- `CONSENT` - Consent management
- `INVENTORY` - Inventory management
- `BILLING` - Billing operations
- `AUDIT` - Audit log access

**✅ All domains are appropriate for surgical EHR**

### 1.5 Permission Pattern Analysis

**Current Pattern:** `domain:resource:action` or `domain:*:action`

**Examples:**
- `medical_records:read` ✅
- `medical_records:*:write` ✅ (wildcard for all resources in domain)
- `theater:book` ✅
- `consent:*:write` ✅
- `admin:users:read` ✅

**⚠️ Inconsistency:** Some use `*` wildcard, some use specific resources. This is acceptable but should be documented.

**Recommendation:** Standardize on:
- `domain:*:action` for domain-wide permissions (e.g., `consent:*:read`)
- `domain:resource:action` for specific resource permissions (e.g., `consent:template:create`)

---

## 2. Gap Analysis

### 2.1 Missing Roles

| Role | Purpose | Priority |
|------|---------|----------|
| `PATIENT` | Patient portal access, view own records | HIGH |
| `GUARDIAN` | Guardian/proxy access for minors/incapacitated | HIGH |
| `ASSISTANT_SURGEON` | Assistant surgeon in procedures | MEDIUM |
| `ANESTHESIOLOGIST` | Anesthesia provider | MEDIUM |
| `MEDICAL_DIRECTOR` | Medical director oversight | MEDIUM |
| `RECEPTIONIST` | Reception staff (appointments, check-in) | MEDIUM |
| `PRACTICE_MANAGER` | Practice administration | MEDIUM |
| `BILLING_OFFICER` | Billing officer (senior billing) | LOW |
| `INSURANCE_OFFICER` | Insurance claims specialist | LOW |
| `AUDIT_OFFICER` | Compliance/audit specialist | LOW |

### 2.2 Missing Permissions

#### CONSENT Domain (Current: `consent:read`, `consent:write`, `consent:approve`)

**Missing Actions:**
- `consent:assign` - Assign consent template to patient
- `consent:sign` - Sign/acknowledge consent (patient/guardian)
- `consent:verify` - Verify consent signature validity
- `consent:lock` - Lock consent after signing (prevent modifications)
- `consent:view_history` - View consent history/audit trail
- `consent:revoke` - Revoke consent (already exists in controller but no permission)

**Recommendation:**
```typescript
// Current
consent:read
consent:write
consent:approve

// Add
consent:assign
consent:sign
consent:verify
consent:lock
consent:view_history
consent:revoke
```

#### CLINICAL_NOTES Domain (Currently under MEDICAL_RECORDS)

**Issue:** Clinical notes are part of medical records but have distinct operations (sign, co-sign).

**Recommendation:** Add new domain `CLINICAL_NOTES` or use resource-specific permissions:
- `medical_records:clinical_note:read`
- `medical_records:clinical_note:write`
- `medical_records:clinical_note:sign`
- `medical_records:clinical_note:cosign`
- `medical_records:clinical_note:amend`

**OR** (preferred for clarity):
- `clinical_notes:read`
- `clinical_notes:write`
- `clinical_notes:sign`
- `clinical_notes:cosign`
- `clinical_notes:amend`

#### SURGERY Domain (Currently under THEATER)

**Issue:** Surgery lifecycle operations are mixed with theater scheduling.

**Current:** `theater:read`, `theater:write`, `theater:book`, `theater:manage`

**Missing Actions:**
- `surgery:schedule` - Schedule surgical case
- `surgery:prep` - Prepare case (pre-op checklist)
- `surgery:perform` - Perform surgery (start case)
- `surgery:close_case` - Close case (post-op)
- `surgery:cancel` - Cancel scheduled case
- `surgery:view_schedule` - View surgical schedule

**Recommendation:** Keep theater scheduling separate, add surgery-specific permissions:
- `surgery:schedule`
- `surgery:prep`
- `surgery:perform`
- `surgery:close_case`
- `surgery:cancel`
- `surgery:view_schedule`

#### BILLING Domain (Current: `billing:read`, `billing:write`, `billing:approve`)

**Missing Actions:**
- `billing:adjust` - Adjust bill amounts
- `billing:refund` - Process refunds
- `billing:view_balances` - View patient balances
- `billing:submit_claim` - Submit insurance claims
- `billing:reconcile` - Reconcile payments

**Recommendation:**
```typescript
// Add
billing:adjust
billing:refund
billing:view_balances
billing:submit_claim
billing:reconcile
```

#### INVENTORY Domain (Current: `inventory:read`, `inventory:write`, `inventory:manage`)

**Missing Actions:**
- `inventory:audit` - Perform inventory audit
- `inventory:reorder` - Create reorder requests
- `inventory:receive` - Receive stock from vendor
- `inventory:consume` - Consume inventory in case
- `inventory:transfer` - Transfer between locations

**Recommendation:**
```typescript
// Add
inventory:audit
inventory:reorder
inventory:receive
inventory:consume
inventory:transfer
```

### 2.3 Controller Authorization Patterns

**✅ Good Examples:**
```typescript
// ConsentController - Uses permissions correctly
@UseGuards(RolesGuard, RlsGuard, PermissionsGuard)
@Roles('ADMIN', 'NURSE', 'DOCTOR')  // Coarse filter
@Permissions('consent:*:write')      // Fine-grained control
```

**⚠️ Issue:** Some controllers check roles in addition to permissions. While not wrong, it's redundant if permissions are properly assigned.

**Recommendation:** 
- Keep `@Roles()` for backward compatibility and coarse filtering
- **Always require `@Permissions()`** - this is the source of truth
- Consider making `@Roles()` optional in future (not breaking change)

---

## 3. Proposed Improvements

### 3.1 Add Missing Roles (Migration-Safe)

**File:** `backend/prisma/seed.ts`

Add to roles array:
```typescript
{
  code: 'PATIENT',
  name: 'Patient',
  description: 'Patient portal access, view own records',
  active: true,
},
{
  code: 'GUARDIAN',
  name: 'Guardian',
  description: 'Guardian/proxy access for minors or incapacitated patients',
  active: true,
},
{
  code: 'ASSISTANT_SURGEON',
  name: 'Assistant Surgeon',
  description: 'Assistant surgeon in surgical procedures',
  active: true,
},
{
  code: 'ANESTHESIOLOGIST',
  name: 'Anesthesiologist',
  description: 'Anesthesia provider for surgical cases',
  active: true,
},
{
  code: 'MEDICAL_DIRECTOR',
  name: 'Medical Director',
  description: 'Medical director with oversight responsibilities',
  active: true,
},
{
  code: 'RECEPTIONIST',
  name: 'Receptionist',
  description: 'Reception staff handling appointments and check-in',
  active: true,
},
{
  code: 'PRACTICE_MANAGER',
  name: 'Practice Manager',
  description: 'Practice administration and operations management',
  active: true,
},
{
  code: 'BILLING_OFFICER',
  name: 'Billing Officer',
  description: 'Senior billing staff with approval authority',
  active: true,
},
{
  code: 'INSURANCE_OFFICER',
  name: 'Insurance Officer',
  description: 'Insurance claims specialist and coordinator',
  active: true,
},
{
  code: 'AUDIT_OFFICER',
  name: 'Audit Officer',
  description: 'Compliance and audit specialist with read-only access to audit logs',
  active: true,
},
```

### 3.2 Add Missing Permissions

**File:** `backend/prisma/seed.ts`

Add to permissions array:

#### CONSENT Domain
```typescript
{
  code: 'consent:assign',
  name: 'Consent: Assign',
  description: 'Assign consent template to patient',
  domain: Domain.CONSENT,
  resource: 'PatientConsentInstance',
  action: 'assign',
},
{
  code: 'consent:sign',
  name: 'Consent: Sign',
  description: 'Sign/acknowledge consent (patient/guardian)',
  domain: Domain.CONSENT,
  resource: 'PatientConsentInstance',
  action: 'sign',
},
{
  code: 'consent:verify',
  name: 'Consent: Verify',
  description: 'Verify consent signature validity',
  domain: Domain.CONSENT,
  resource: 'PatientConsentInstance',
  action: 'verify',
},
{
  code: 'consent:lock',
  name: 'Consent: Lock',
  description: 'Lock consent after signing (prevent modifications)',
  domain: Domain.CONSENT,
  resource: 'PatientConsentInstance',
  action: 'lock',
},
{
  code: 'consent:view_history',
  name: 'Consent: View History',
  description: 'View consent history and audit trail',
  domain: Domain.CONSENT,
  resource: 'PatientConsentInstance',
  action: 'view_history',
},
{
  code: 'consent:revoke',
  name: 'Consent: Revoke',
  description: 'Revoke consent instance',
  domain: Domain.CONSENT,
  resource: 'PatientConsentInstance',
  action: 'revoke',
},
```

#### CLINICAL_NOTES Domain (New Domain)

**First, add to Domain enum in `schema/foundation.prisma`:**
```prisma
enum Domain {
  THEATER
  MEDICAL_RECORDS
  CONSENT
  RBAC
  AUDIT
  INVENTORY
  BILLING
  CLINICAL_NOTES  // ADD THIS
}
```

**Then add permissions:**
```typescript
{
  code: 'clinical_notes:read',
  name: 'Clinical Notes: Read',
  description: 'Read clinical notes',
  domain: Domain.CLINICAL_NOTES,
  resource: 'ClinicalNote',
  action: 'read',
},
{
  code: 'clinical_notes:write',
  name: 'Clinical Notes: Write',
  description: 'Create and update clinical notes',
  domain: Domain.CLINICAL_NOTES,
  resource: 'ClinicalNote',
  action: 'write',
},
{
  code: 'clinical_notes:sign',
  name: 'Clinical Notes: Sign',
  description: 'Sign clinical notes (author attestation)',
  domain: Domain.CLINICAL_NOTES,
  resource: 'ClinicalNote',
  action: 'sign',
},
{
  code: 'clinical_notes:cosign',
  name: 'Clinical Notes: Co-sign',
  description: 'Co-sign clinical notes (supervisor attestation)',
  domain: Domain.CLINICAL_NOTES,
  resource: 'ClinicalNote',
  action: 'cosign',
},
{
  code: 'clinical_notes:amend',
  name: 'Clinical Notes: Amend',
  description: 'Amend clinical notes (create amendment)',
  domain: Domain.CLINICAL_NOTES,
  resource: 'ClinicalNote',
  action: 'amend',
},
```

#### SURGERY Domain (New Domain)

**Add to Domain enum:**
```prisma
enum Domain {
  // ... existing
  SURGERY  // ADD THIS
}
```

**Add permissions:**
```typescript
{
  code: 'surgery:schedule',
  name: 'Surgery: Schedule',
  description: 'Schedule surgical case',
  domain: Domain.SURGERY,
  resource: 'SurgicalCase',
  action: 'schedule',
},
{
  code: 'surgery:prep',
  name: 'Surgery: Prep',
  description: 'Prepare surgical case (pre-op checklist)',
  domain: Domain.SURGERY,
  resource: 'SurgicalCase',
  action: 'prep',
},
{
  code: 'surgery:perform',
  name: 'Surgery: Perform',
  description: 'Perform surgery (start case)',
  domain: Domain.SURGERY,
  resource: 'SurgicalCase',
  action: 'perform',
},
{
  code: 'surgery:close_case',
  name: 'Surgery: Close Case',
  description: 'Close surgical case (post-op)',
  domain: Domain.SURGERY,
  resource: 'SurgicalCase',
  action: 'close_case',
},
{
  code: 'surgery:cancel',
  name: 'Surgery: Cancel',
  description: 'Cancel scheduled surgical case',
  domain: Domain.SURGERY,
  resource: 'SurgicalCase',
  action: 'cancel',
},
{
  code: 'surgery:view_schedule',
  name: 'Surgery: View Schedule',
  description: 'View surgical schedule',
  domain: Domain.SURGERY,
  resource: 'SurgicalCase',
  action: 'view_schedule',
},
```

#### BILLING Domain (Extend)
```typescript
{
  code: 'billing:adjust',
  name: 'Billing: Adjust',
  description: 'Adjust bill amounts',
  domain: Domain.BILLING,
  resource: 'Bill',
  action: 'adjust',
},
{
  code: 'billing:refund',
  name: 'Billing: Refund',
  description: 'Process refunds',
  domain: Domain.BILLING,
  resource: 'Payment',
  action: 'refund',
},
{
  code: 'billing:view_balances',
  name: 'Billing: View Balances',
  description: 'View patient account balances',
  domain: Domain.BILLING,
  resource: 'Bill',
  action: 'view_balances',
},
{
  code: 'billing:submit_claim',
  name: 'Billing: Submit Claim',
  description: 'Submit insurance claims',
  domain: Domain.BILLING,
  resource: 'InsuranceClaim',
  action: 'submit',
},
{
  code: 'billing:reconcile',
  name: 'Billing: Reconcile',
  description: 'Reconcile payments and allocations',
  domain: Domain.BILLING,
  resource: 'Payment',
  action: 'reconcile',
},
```

#### INVENTORY Domain (Extend)
```typescript
{
  code: 'inventory:audit',
  name: 'Inventory: Audit',
  description: 'Perform inventory audit',
  domain: Domain.INVENTORY,
  resource: 'InventoryStock',
  action: 'audit',
},
{
  code: 'inventory:reorder',
  name: 'Inventory: Reorder',
  description: 'Create reorder requests',
  domain: Domain.INVENTORY,
  resource: 'InventoryItem',
  action: 'reorder',
},
{
  code: 'inventory:receive',
  name: 'Inventory: Receive',
  description: 'Receive stock from vendor',
  domain: Domain.INVENTORY,
  resource: 'InventoryTransaction',
  action: 'receive',
},
{
  code: 'inventory:consume',
  name: 'Inventory: Consume',
  description: 'Consume inventory in surgical case',
  domain: Domain.INVENTORY,
  resource: 'InventoryUsage',
  action: 'consume',
},
{
  code: 'inventory:transfer',
  name: 'Inventory: Transfer',
  description: 'Transfer inventory between locations',
  domain: Domain.INVENTORY,
  resource: 'InventoryTransaction',
  action: 'transfer',
},
```

### 3.3 Role-Permission Assignments

**Recommended assignments (add to seed.ts after creating roles and permissions):**

```typescript
// PATIENT
const patientPermissions = [
  'medical_records:read',      // Own records only (RLS enforced)
  'consent:read',              // Own consents only
  'consent:sign',               // Sign own consents
  'billing:read',               // Own bills only
  'billing:view_balances',      // Own balances
];

// GUARDIAN
const guardianPermissions = [
  ...patientPermissions,         // All patient permissions
  'consent:sign',               // Sign on behalf of patient
  'consent:view_history',       // View consent history
];

// SURGEON (extend existing)
const surgeonPermissions = [
  'medical_records:read',
  'medical_records:write',
  'clinical_notes:read',
  'clinical_notes:write',
  'clinical_notes:sign',
  'theater:read',
  'theater:write',
  'theater:book',
  'surgery:schedule',
  'surgery:prep',
  'surgery:perform',
  'surgery:close_case',
  'surgery:view_schedule',
  'consent:read',
  'consent:write',
  'consent:assign',
  'consent:verify',
  'inventory:read',
  'inventory:consume',
  'billing:read',
];

// ASSISTANT_SURGEON
const assistantSurgeonPermissions = [
  'medical_records:read',
  'clinical_notes:read',
  'clinical_notes:write',
  'theater:read',
  'surgery:view_schedule',
  'surgery:prep',
  'surgery:perform',            // Assist in surgery
  'inventory:read',
  'inventory:consume',
];

// ANESTHESIOLOGIST
const anesthesiologistPermissions = [
  'medical_records:read',
  'clinical_notes:read',
  'clinical_notes:write',
  'theater:read',
  'surgery:view_schedule',
  'surgery:prep',
  'surgery:perform',
  'inventory:read',
  'inventory:consume',
];

// MEDICAL_DIRECTOR
const medicalDirectorPermissions = [
  'medical_records:read',
  'medical_records:write',
  'medical_records:*:manage',
  'clinical_notes:read',
  'clinical_notes:write',
  'clinical_notes:cosign',
  'theater:read',
  'surgery:view_schedule',
  'consent:read',
  'consent:verify',
  'audit:read',
];

// RECEPTIONIST
const receptionistPermissions = [
  'medical_records:read',       // Limited - patient lookup
  'theater:read',
  'surgery:view_schedule',
  'surgery:schedule',           // Schedule appointments
  'consent:read',
  'consent:assign',
  'billing:read',
];

// PRACTICE_MANAGER
const practiceManagerPermissions = [
  'medical_records:read',
  'theater:read',
  'theater:write',
  'surgery:view_schedule',
  'surgery:schedule',
  'surgery:cancel',
  'consent:read',
  'billing:read',
  'billing:view_balances',
  'inventory:read',
  'audit:read',
];

// BILLING_OFFICER (extend BILLING role)
const billingOfficerPermissions = [
  'billing:read',
  'billing:write',
  'billing:approve',
  'billing:adjust',
  'billing:refund',
  'billing:view_balances',
  'billing:submit_claim',
  'billing:reconcile',
  'medical_records:read',       // For billing context
];

// INSURANCE_OFFICER
const insuranceOfficerPermissions = [
  'billing:read',
  'billing:view_balances',
  'billing:submit_claim',
  'medical_records:read',       // For claim context
];

// AUDIT_OFFICER
const auditOfficerPermissions = [
  'audit:read',                 // Read-only audit access
  'medical_records:read',       // For audit context
  'consent:read',               // For audit context
  'billing:read',               // For audit context
];
```

### 3.4 Schema Improvements (Optional, Non-Breaking)

#### Add Index on Permission.domain

**File:** `backend/prisma/schema/rbac.prisma`

```prisma
model Permission {
  // ... existing fields
  
  @@index([code])
  @@index([domain])              // ADD THIS - for domain-based queries
  @@index([domain, resource, action])
  @@map("permissions")
}
```

**Migration:**
```sql
CREATE INDEX IF NOT EXISTS permissions_domain_idx ON permissions(domain);
```

#### Make Permission.resource Required (Breaking - Defer)

**⚠️ This is a breaking change - defer to future migration**

Current: `resource String? @db.VarChar(100)`  
Proposed: `resource String @db.VarChar(100)`

**Reason:** Most permissions have a resource. Making it required improves consistency.

**Migration Strategy:**
1. Add migration to set `resource = '*'` for existing permissions with null resource
2. Then make field required in next migration

---

## 4. Controller Authorization Patterns

### 4.1 Recommended Pattern

**✅ Best Practice:**
```typescript
@Controller('surgery')
@UseGuards(RolesGuard, RlsGuard, PermissionsGuard)
@UseInterceptors(DataAccessLogInterceptor)
export class SurgeryController {
  
  @Post('cases')
  @Roles('ADMIN', 'SURGEON', 'PRACTICE_MANAGER')  // Optional: coarse filter
  @Permissions('surgery:schedule')                // Required: fine-grained
  async scheduleCase(@Body() dto: CreateCaseDto, @CurrentUser() user: UserIdentity) {
    // Permission check ensures user has surgery:schedule
    // RLS ensures user can only schedule cases they're authorized for
    return this.surgeryService.scheduleCase(dto, user.id);
  }
  
  @Patch('cases/:id/prep')
  @Permissions('surgery:prep')
  async prepCase(@Param('id') id: string, @CurrentUser() user: UserIdentity) {
    // RLS ensures user can only prep cases they're assigned to
    return this.surgeryService.prepCase(id, user.id);
  }
  
  @Patch('cases/:id/perform')
  @Permissions('surgery:perform')
  async performCase(@Param('id') id: string, @CurrentUser() user: UserIdentity) {
    // RLS ensures user can only perform cases they're assigned to
    return this.surgeryService.performCase(id, user.id);
  }
  
  @Patch('cases/:id/close')
  @Permissions('surgery:close_case')
  async closeCase(@Param('id') id: string, @CurrentUser() user: UserIdentity) {
    // RLS ensures user can only close cases they're assigned to
    return this.surgeryService.closeCase(id, user.id);
  }
}
```

### 4.2 Consent Controller Example

**Current (Good):**
```typescript
@Patch('instances/:id/revoke')
@Roles('ADMIN', 'NURSE', 'DOCTOR')
@Permissions('consent:*:write')
revoke(...)
```

**Improved (More Specific):**
```typescript
@Patch('instances/:id/revoke')
@Roles('ADMIN', 'NURSE', 'DOCTOR', 'SURGEON')
@Permissions('consent:revoke')  // More specific permission
revoke(...)
```

### 4.3 Service Layer Authorization

**✅ Good Pattern (already in use):**
```typescript
@Injectable()
export class ConsentService {
  async revokeConsent(instanceId: string, reason: string, userId: string) {
    // Permission check already done by guard
    // Service layer focuses on business logic
    
    // RLS check: ensure user has access to this consent instance
    const instance = await this.consentRepository.findById(instanceId);
    if (!instance) {
      throw new NotFoundException();
    }
    
    // Additional business rule: only patient, guardian, or authorized staff can revoke
    if (instance.patientId !== userId && !this.isAuthorizedStaff(userId)) {
      throw new ForbiddenException('Not authorized to revoke this consent');
    }
    
    // ... revoke logic
  }
}
```

---

## 5. Migration Strategy

### 5.1 Phase 1: Add Roles (Zero Breaking Changes)

1. **Update seed.ts** - Add new roles
2. **Run seed** - `npm run db:seed`
3. **No migration needed** - Roles are created via seed, not migration

### 5.2 Phase 2: Add Permissions (Zero Breaking Changes)

1. **Update Domain enum** - Add `CLINICAL_NOTES`, `SURGERY`
2. **Generate migration** - `npx prisma migrate dev --name add_clinical_notes_surgery_domains`
3. **Update seed.ts** - Add new permissions
4. **Run seed** - `npm run db:seed`

### 5.3 Phase 3: Assign Permissions to Roles

1. **Update seed.ts** - Add role-permission assignments
2. **Run seed** - `npm run db:seed`
3. **No migration needed** - Assignments are created via seed

### 5.4 Phase 4: Update Controllers (Incremental)

1. **Update controllers one by one** - Add new permission decorators
2. **Test each controller** - Ensure backward compatibility
3. **No breaking changes** - Old permissions still work, new ones are additive

### 5.5 Phase 5: Add Index (Optional, Non-Breaking)

1. **Update schema** - Add index on `Permission.domain`
2. **Generate migration** - `npx prisma migrate dev --name add_permission_domain_index`
3. **No breaking changes** - Index addition is safe

---

## 6. Potential Pitfalls & Warnings

### 6.1 ⚠️ Role Hardcoding in Business Logic

**BAD:**
```typescript
if (user.roles.includes('SURGEON')) {
  // Allow action
}
```

**GOOD:**
```typescript
if (this.identityContext.hasPermission('surgery:perform')) {
  // Allow action
}
```

**Why:** Permissions are more flexible. A user can have `surgery:perform` without being a SURGEON (e.g., temporary assignment).

### 6.2 ⚠️ Missing RLS Checks

**BAD:**
```typescript
@Get(':id')
@Permissions('medical_records:read')
async findOne(@Param('id') id: string) {
  // Missing RLS check - user could access any record
  return this.medicalRecordsService.findOne(id);
}
```

**GOOD:**
```typescript
@Get(':id')
@UseGuards(RolesGuard, RlsGuard, PermissionsGuard)  // RlsGuard included
@Permissions('medical_records:read')
async findOne(@Param('id') id: string) {
  // RlsGuard ensures user can only access authorized records
  return this.medicalRecordsService.findOne(id);
}
```

### 6.3 ⚠️ Permission Code Typos

**BAD:**
```typescript
@Permissions('consent:write')  // Typo: should be 'consent:*:write' or 'consent:instance:write'
```

**GOOD:**
```typescript
@Permissions('consent:*:write')  // Clear and matches seed
```

**Mitigation:** Use constants for permission codes:
```typescript
// constants/permissions.ts
export const PERMISSIONS = {
  CONSENT: {
    READ: 'consent:*:read',
    WRITE: 'consent:*:write',
    SIGN: 'consent:sign',
    REVOKE: 'consent:revoke',
  },
  // ...
} as const;

// Usage
@Permissions(PERMISSIONS.CONSENT.WRITE)
```

### 6.4 ⚠️ Time-Bound Role Assignments

**Issue:** `UserRoleAssignment` has `validFrom` and `validUntil`, but current implementation may not check these.

**Recommendation:** Ensure `getUserRolesAndPermissions` in `auth.repository.ts` filters by:
- `active: true`
- `validFrom <= now()`
- `validUntil >= now()` OR `validUntil IS NULL`

**Check:** Review `backend/src/modules/auth/repositories/auth.repository.ts`

### 6.5 ⚠️ Permission Caching

**Issue:** Permissions are loaded into JWT token. If permissions change, users must re-login.

**Mitigation:**
- Short JWT expiration (15-30 minutes)
- Refresh token mechanism
- Consider permission refresh endpoint (optional)

---

## 7. Testing Recommendations

### 7.1 Unit Tests

```typescript
describe('PermissionsGuard', () => {
  it('should allow access when user has all required permissions', async () => {
    // Test permission check logic
  });
  
  it('should deny access when user missing any required permission', async () => {
    // Test missing permission scenario
  });
});
```

### 7.2 Integration Tests

```typescript
describe('SurgeryController', () => {
  it('should allow SURGEON with surgery:schedule permission to schedule case', async () => {
    // Test with proper role and permission
  });
  
  it('should deny access when user lacks surgery:schedule permission', async () => {
    // Test permission enforcement
  });
  
  it('should enforce RLS - user can only access own cases', async () => {
    // Test row-level security
  });
});
```

### 7.3 Seed Validation

```typescript
describe('Seed Data', () => {
  it('should create all required roles', async () => {
    const roles = await prisma.role.findMany();
    expect(roles).toHaveLength(expectedRoleCount);
  });
  
  it('should assign permissions to roles correctly', async () => {
    const surgeonRole = await prisma.role.findUnique({
      where: { code: 'SURGEON' },
      include: { permissions: true },
    });
    expect(surgeonRole.permissions).toContainEqual(
      expect.objectContaining({ code: 'surgery:perform' })
    );
  });
});
```

---

## 8. Summary & Next Steps

### ✅ What's Good
- Permission-driven architecture
- Proper guard chain
- Audit logging integrated
- Time-bound role assignments supported

### 🔧 What Needs Improvement
1. **Add 10 missing roles** (PATIENT, GUARDIAN, etc.)
2. **Add 30+ missing permissions** (consent actions, surgery lifecycle, etc.)
3. **Add 2 new domains** (CLINICAL_NOTES, SURGERY)
4. **Update role-permission assignments** for new roles
5. **Optional: Add index on Permission.domain**

### 📋 Implementation Checklist

- [ ] Update `Domain` enum in `schema/foundation.prisma`
- [ ] Add new roles to `seed.ts`
- [ ] Add new permissions to `seed.ts`
- [ ] Add role-permission assignments to `seed.ts`
- [ ] Run seed: `npm run db:seed`
- [ ] Update controllers to use new permissions (incremental)
- [ ] Add index on `Permission.domain` (optional)
- [ ] Test authorization flows
- [ ] Update documentation

### 🚀 Recommended Order

1. **Week 1:** Add roles and permissions (seed updates)
2. **Week 2:** Update controllers incrementally (one domain at a time)
3. **Week 3:** Testing and validation
4. **Week 4:** Documentation and training

---

## 9. Example: Complete Seed Update

See attached file: `RBAC_SEED_UPDATES.ts` (to be created separately)

---

**End of Audit Document**









