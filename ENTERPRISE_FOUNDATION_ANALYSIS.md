# Enterprise Clinical Workflow Foundation Analysis
## Aesthetic Surgery Center - Comprehensive System Review

---

## Executive Summary

This document provides a comprehensive analysis of the current system foundation, focusing on:
1. **RBAC (Role-Based Access Control)** - Current roles, permissions, and access patterns
2. **Patient Intake Workflow** - Complete role-based analysis
3. **EMR Concerns** - HIPAA compliance, data privacy, audit trails
4. **Workflow Integration** - Consultation, Consent, Theater, Billing, Inventory
5. **Gaps & Recommendations** - What's missing and what needs improvement

---

## 1. RBAC SYSTEM ANALYSIS

### 1.1 Current Roles (from seed.ts)

| Role Code | Name | Description | Key Permissions |
|-----------|------|-------------|-----------------|
| **ADMIN** | System Administrator | Full system access | All permissions |
| **DOCTOR** | Doctor | Medical professional | Medical records read/write, Consent read/write/approve, Theater read |
| **SURGEON** | Surgeon | Surgical specialist | Medical records read/write, Theater full access, Consent full access |
| **NURSE** | Nurse | Nursing staff | Medical records read, Theater read, Consent read |
| **THEATER_MANAGER** | Theater Manager | Theater scheduling | Theater full access, Medical records read |
| **INVENTORY_MANAGER** | Inventory Manager | Inventory management | Inventory full access |
| **BILLING** | Billing Staff | Billing operations | Billing full access |
| **FRONT_DESK** | Front Desk | Patient registration | ⚠️ **ONLY READ ACCESS** - Missing write permissions |

### 1.2 Permission Structure

**Domain-Based Permissions:**
- `Domain.RBAC` - Admin functions
- `Domain.MEDICAL_RECORDS` - Patient and medical records
- `Domain.THEATER` - Theater scheduling
- `Domain.CONSENT` - Consent management
- `Domain.INVENTORY` - Inventory management
- `Domain.BILLING` - Billing operations
- `Domain.AUDIT` - Audit logs

**Permission Format:**
```
{domain}:{resource}:{action}
Examples:
- patients:*:read
- patients:*:write
- patients:*:delete
- medical_records:read
- theater:book
- consent:approve
```

### 1.3 Critical Gap: FRONT_DESK Role

**Current State:**
- FRONT_DESK role exists
- Has only READ permissions:
  - `medical_records:read`
  - `theater:read`
  - `billing:read`
- **MISSING**: `patients:*:write` permission

**Impact:**
- Front desk staff cannot create patients
- Patient creation limited to ADMIN, NURSE, DOCTOR
- Contradicts the role description: "Front desk staff with patient registration access"

**Recommendation:**
```typescript
// In seed.ts, add to FRONT_DESK permissions:
const frontDeskPermissions = [
  'patients:*:read',    // ✅ ADD THIS
  'patients:*:write',   // ✅ ADD THIS (for registration)
  'medical_records:read',
  'theater:read',
  'billing:read',
];
```

---

## 2. PATIENT INTAKE WORKFLOW - ROLE ANALYSIS

### 2.1 Current Patient Creation Endpoints

#### A. Admin/Staff Creation (`POST /api/v1/patients`)
**Controller**: `PatientController.create()`
**Guards**: `RolesGuard`, `RlsGuard`, `PermissionsGuard`
**Required Roles**: `ADMIN`, `NURSE`, `DOCTOR`
**Required Permission**: `patients:*:write`

**Current Flow:**
1. ✅ Role check (ADMIN, NURSE, DOCTOR)
2. ✅ Permission check (`patients:*:write`)
3. ✅ RLS validation (via RlsGuard)
4. ✅ Data validation (CreatePatientDto)
5. ✅ Duplicate checking
6. ✅ Patient record creation
7. ✅ Next of kin/emergency contact creation (in `patient_contacts` table)
8. ✅ Domain event emission
9. ✅ Audit logging (DataAccessLogInterceptor)

**Who Can Use:**
- ✅ ADMIN - Full access
- ✅ NURSE - Can create patients
- ✅ DOCTOR - Can create patients
- ❌ FRONT_DESK - **CANNOT** (missing permission)
- ❌ SURGEON - **CANNOT** (not in role list, but has medical_records:write)

#### B. Patient Self-Registration (`POST /api/v1/public/patients/register`)
**Controller**: `PatientPublicController.selfRegister()`
**Guards**: `@Public()` - No authentication required
**Status**: ⚠️ **NOT IMPLEMENTED** (throws error)

**Intended Flow:**
1. Patient enters own information
2. Patient record created
3. Patient user account created (with PATIENT role)
4. Confirmation email sent
5. Patient receives portal credentials

**Current Status:**
- ❌ Service method exists but throws "not yet implemented"
- ❌ PATIENT role doesn't exist in seed
- ❌ User account creation not implemented
- ❌ Email service not integrated

---

## 3. PATIENT INTAKE WORKFLOW - DETAILED ROLE BREAKDOWN

### 3.1 ADMIN Role

**Can Do:**
- ✅ Create patients (via `/api/v1/patients`)
- ✅ View all patients (no filtering)
- ✅ Update any patient
- ✅ Delete/archive patients
- ✅ Merge duplicate patients
- ✅ Restrict/unrestrict patients
- ✅ View all consents (including archived)

**Access Pattern:**
- No RLS filtering (sees all patients)
- Full CRUD operations
- Administrative functions

**EMR Concerns:**
- ✅ All actions logged (DataAccessLogInterceptor)
- ✅ Domain events emitted
- ✅ Audit trail complete

### 3.2 DOCTOR Role

**Can Do:**
- ✅ Create patients
- ✅ View patients (filtered by surgical case assignments)
- ✅ Update patients
- ❌ Cannot delete patients
- ❌ Cannot merge patients
- ✅ View consents (active and revoked)

**Access Pattern:**
- RLS filtering: Only sees patients via:
  - Surgical case assignments (as primary surgeon)
  - Resource allocations (as assigned staff)
- Cannot see all patients (unlike ADMIN)

**EMR Concerns:**
- ✅ Access logged
- ✅ Limited to assigned patients
- ✅ Cannot perform administrative actions

### 3.3 NURSE Role

**Can Do:**
- ✅ Create patients
- ✅ View patients (filtered by surgical case assignments)
- ✅ Update patients
- ❌ Cannot delete patients
- ❌ Cannot merge patients
- ✅ View consents (active only, not revoked)

**Access Pattern:**
- Same RLS filtering as DOCTOR
- More limited consent access (no revoked consents)

**EMR Concerns:**
- ✅ Access logged
- ✅ Limited scope appropriate for role

### 3.4 SURGEON Role

**Can Do:**
- ❌ **CANNOT CREATE PATIENTS** (not in role list)
- ✅ View patients (via medical_records:read)
- ❌ Cannot update patients directly (no patients:*:write)
- ✅ Full theater access
- ✅ Full consent access

**Access Pattern:**
- Has `medical_records:write` but not `patients:*:write`
- Can access patients via surgical cases
- Cannot create new patient records

**Gap Identified:**
- Surgeon should be able to create patients if needed
- Currently must rely on NURSE or DOCTOR

### 3.5 FRONT_DESK Role

**Can Do:**
- ❌ **CANNOT CREATE PATIENTS** (missing permission)
- ✅ View patients (via medical_records:read)
- ❌ Cannot update patients
- ✅ View consents (active only)
- ✅ View theater schedules
- ✅ View billing information

**Access Pattern:**
- Read-only access
- Cannot perform registration (contradicts role description)

**Critical Gap:**
- Role description says "patient registration access" but lacks write permission
- Front desk is primary patient intake point but cannot register

### 3.6 BILLING Role

**Can Do:**
- ❌ Cannot create patients
- ❌ Cannot view patients directly (no patients:*:read)
- ✅ Can view bills (which contain patient info)
- ✅ Full billing operations

**Access Pattern:**
- Indirect patient access via bills
- No direct patient record access

**EMR Concerns:**
- ⚠️ Billing staff may need patient read access for billing operations
- Currently must access patient data through bills only

---

## 4. ROW-LEVEL SECURITY (RLS) ANALYSIS

### 4.1 RLS Implementation

**Guard**: `RlsGuard`
**Service**: `RlsValidationService`
**Location**: `backend/src/modules/audit/services/rlsValidation.service.ts`

**How It Works:**
1. Extracts resource ID from route parameters
2. Infers resource type from route path
3. Calls appropriate validation method:
   - `canAccessPatient(patientId, userId)`
   - `canAccessSurgicalCase(caseId, userId)`
   - `canModifySurgicalCase(caseId, userId)`
   - etc.

**Patient Access Logic:**
- ADMIN: Always allowed
- Others: Check via surgical case assignments
- Department-based access (if implemented)

### 4.2 Patient Filtering in Repository

**Method**: `findAllFiltered(skip, take, userId)`
**Logic:**
1. Find surgical cases where user is:
   - Primary surgeon (`primarySurgeonId = userId`)
   - OR assigned staff (`resourceAllocations.resourceId = userId`)
2. Extract patient IDs from cases
3. Query patients by those IDs
4. Exclude merged patients (`mergedInto: null`)

**Gaps:**
- ⚠️ No department-based filtering
- ⚠️ No direct patient assignment mechanism
- ⚠️ FRONT_DESK cannot see patients they register (no case assignment yet)

---

## 5. EMR CONCERNS & HIPAA COMPLIANCE

### 5.1 Data Access Logging ✅

**Implementation**: `DataAccessLogInterceptor`
**Logs:**
- User ID
- Resource type and ID
- Action (READ, CREATE, WRITE, DELETE)
- IP address
- User agent
- Session ID
- Timestamp
- Success/failure
- PHI access flag

**Coverage:**
- ✅ All patient endpoints
- ✅ Automatic logging via interceptor
- ✅ PHI resources identified

### 5.2 Audit Trail ✅

**Domain Events:**
- Patient created/updated/merged/restricted
- All events include:
  - Correlation ID
  - Causation ID
  - Session ID
  - Request ID
  - User ID
  - Timestamp

**Immutable Records:**
- Patient merge history
- Data access logs
- Domain events

### 5.3 Privacy Controls ⚠️

**Current:**
- ✅ Patient restriction mechanism exists
- ✅ RLS filtering by case assignments
- ✅ Access logging

**Missing:**
- ⚠️ No field-level permissions (all or nothing)
- ⚠️ No patient consent for data sharing
- ⚠️ No patient portal for self-service access
- ⚠️ No data export controls

### 5.4 Data Integrity ✅

**Current:**
- ✅ Duplicate detection (email, phone, name+DOB)
- ✅ Merge tracking (immutable history)
- ✅ Version control (optimistic locking)
- ✅ Soft deletes (archived status)

---

## 6. WORKFLOW INTEGRATION ANALYSIS

### 6.1 Patient Intake → Consultation

**Current State:**
- ✅ Patient can be created
- ✅ Consultation can be created
- ✅ Consultation links to patient
- ⚠️ No validation that patient exists before consultation

**Recommendation:**
- Add validation in ConsultationService to ensure patient exists
- Check patient status (not merged, not archived)

### 6.2 Consultation → Procedure Plan

**Current State:**
- ✅ `PatientWorkflowService.validateProcedurePlanCreation()` exists
- ✅ Validates consultation is completed
- ⚠️ Not integrated into ProcedurePlanService

**Gap:**
- Validation service exists but not called
- Need to integrate into create endpoint

### 6.3 Procedure Plan → Consent

**Current State:**
- ✅ `PatientWorkflowService.validateConsentCreation()` exists
- ✅ Validates procedure plan is APPROVED
- ✅ Validates consultation is completed
- ✅ Schema requires `procedurePlanId` and `consultationId`
- ⚠️ Validation not enforced in ConsentService

**Gap:**
- Validation exists but needs integration

### 6.4 Consent → Surgical Case

**Current State:**
- ✅ `PatientWorkflowService.validateSurgicalCaseCreation()` exists
- ✅ Validates consent is SIGNED
- ✅ Validates consent not expired/revoked
- ✅ Schema requires `procedurePlanId`
- ⚠️ Validation not enforced in TheaterService

**Gap:**
- Validation exists but needs integration

---

## 7. CRITICAL GAPS & RECOMMENDATIONS

### 7.1 Immediate Fixes Required

#### Gap 1: FRONT_DESK Cannot Register Patients ❌
**Impact**: Front desk staff cannot perform primary function
**Fix**: Add `patients:*:write` permission to FRONT_DESK role

#### Gap 2: SURGEON Cannot Create Patients ❌
**Impact**: Surgeons must rely on others for patient creation
**Fix**: Add SURGEON to patient creation role list OR add `patients:*:write` permission

#### Gap 3: Patient Self-Registration Not Implemented ❌
**Impact**: Privacy-first workflow not available
**Fix**: 
1. Create PATIENT role
2. Implement user account creation
3. Complete `selfRegister()` method
4. Add email service integration

#### Gap 4: Workflow Validation Not Integrated ⚠️
**Impact**: Workflow rules exist but not enforced
**Fix**: Integrate `PatientWorkflowService` into:
- ProcedurePlanService.create()
- ConsentService.create()
- TheaterService.createCase()

### 7.2 EMR Enhancements Needed

#### Enhancement 1: Field-Level Permissions
**Current**: All-or-nothing patient access
**Need**: Granular field access (e.g., billing staff sees financial fields only)

#### Enhancement 2: Patient Portal
**Current**: No patient-facing interface
**Need**: 
- Patient login
- View own records
- Sign consents
- View appointments
- Update contact information

#### Enhancement 3: Department-Based Access
**Current**: Only surgical case-based filtering
**Need**: Department-based patient access for non-surgical staff

#### Enhancement 4: Patient Assignment
**Current**: No direct patient-to-staff assignment
**Need**: Assign patients to care teams/coordinators

---

## 8. AESTHETIC SURGERY CENTER SPECIFIC CONSIDERATIONS

### 8.1 Patient Intake Workflow (Ideal)

```
┌─────────────────────────────────────────────────────────┐
│ OPTION 1: Self-Registration (Privacy-First)            │
└─────────────────────────────────────────────────────────┘
1. Patient arrives at clinic
2. Front desk hands tablet/device
3. Patient self-registers:
   - Personal demographics
   - Medical history
   - Contact information
   - Creates account password
4. System creates:
   - Patient record (MRN assigned)
   - Patient user account (PATIENT role)
5. Confirmation email sent
6. Patient can access portal immediately

┌─────────────────────────────────────────────────────────┐
│ OPTION 2: Front Desk Registration (Traditional)        │
└─────────────────────────────────────────────────────────┘
1. Patient arrives at clinic
2. Front desk staff registers patient:
   - Enters patient information
   - Collects required documents
   - Verifies identity
3. System creates:
   - Patient record (MRN assigned)
   - No patient account (created later if needed)
4. Patient proceeds to consultation

┌─────────────────────────────────────────────────────────┐
│ OPTION 3: Pre-Registration (Online)                    │
└─────────────────────────────────────────────────────────┘
1. Patient registers online before visit
2. Patient completes intake forms
3. System creates:
   - Patient record (MRN assigned)
   - Patient user account
4. Patient arrives with pre-registration complete
```

### 8.2 Role Requirements for Aesthetic Surgery Center

**Essential Roles:**
1. **ADMIN** - System administration
2. **SURGEON** - Primary care provider (aesthetic procedures)
3. **DOCTOR** - Medical consultations, pre-op clearance
4. **NURSE** - Patient care, pre-op prep, post-op care
5. **FRONT_DESK** - Patient registration, scheduling, check-in
6. **BILLING** - Payment processing, insurance claims
7. **THEATER_MANAGER** - Surgery scheduling, resource allocation
8. **INVENTORY_MANAGER** - Medical supplies, implants, equipment
9. **PATIENT** - Patient portal access (needs to be created)

**Aesthetic Surgery Specific:**
- High patient volume
- Privacy-sensitive (VIP patients, celebrities)
- Multiple procedures per patient
- Before/after photo management (future)
- Consultation → Procedure → Surgery workflow
- Payment often upfront (before surgery)

---

## 9. RECOMMENDED FIXES - PRIORITY ORDER

### Priority 1: Critical (Blocks Core Functionality)

1. **Fix FRONT_DESK Permissions**
   - Add `patients:*:write` to FRONT_DESK role
   - Update seed.ts
   - Test patient creation by front desk staff

2. **Add SURGEON to Patient Creation**
   - Add SURGEON to `@Roles('ADMIN', 'NURSE', 'DOCTOR', 'SURGEON')`
   - OR add `patients:*:write` permission to SURGEON role

3. **Implement Patient Self-Registration**
   - Create PATIENT role
   - Implement user account creation
   - Complete `selfRegister()` method
   - Add email service

### Priority 2: High (Workflow Integrity)

4. **Integrate Workflow Validation**
   - Add validation to ProcedurePlanService
   - Add validation to ConsentService
   - Add validation to TheaterService

5. **Add BILLING Patient Read Access**
   - Add `patients:*:read` to BILLING role
   - Needed for billing operations

### Priority 3: Medium (EMR Enhancements)

6. **Department-Based Access**
   - Extend RLS to support department filtering
   - Add department assignments to users

7. **Patient Assignment**
   - Add patient-to-staff assignment model
   - Extend RLS to include assigned patients

8. **Field-Level Permissions**
   - Implement PatientFieldPermissionService
   - Add field-level access control

---

## 10. PATIENT INTAKE WORKFLOW - COMPLETE ROLE MATRIX

| Action | ADMIN | DOCTOR | SURGEON | NURSE | FRONT_DESK | BILLING | PATIENT |
|--------|-------|--------|---------|-------|------------|---------|---------|
| **Create Patient (Staff)** | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | N/A |
| **Self-Register** | N/A | N/A | N/A | N/A | N/A | N/A | ❌ |
| **View All Patients** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **View Assigned Patients** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ (own) |
| **Update Patient** | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ⚠️ (limited) |
| **Delete Patient** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Merge Patients** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Restrict Patient** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **View Consents (Active)** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ (own) |
| **View Consents (Revoked)** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

**Legend:**
- ✅ = Allowed
- ❌ = Not allowed (missing permission/role)
- ⚠️ = Partially allowed (limited fields)
- N/A = Not applicable

---

## 11. NEXT STEPS - IMPLEMENTATION PLAN

### Phase 1: Foundation Fixes (Week 1)
1. Update seed.ts with correct FRONT_DESK permissions
2. Add SURGEON to patient creation roles
3. Create PATIENT role
4. Implement patient self-registration
5. Test all role-based access patterns

### Phase 2: Workflow Integration (Week 2)
1. Integrate workflow validation into services
2. Add validation to all workflow endpoints
3. Test chronological workflow enforcement
4. Document workflow rules

### Phase 3: EMR Enhancements (Week 3-4)
1. Implement department-based access
2. Add patient assignment mechanism
3. Build patient portal foundation
4. Add field-level permissions

### Phase 4: Aesthetic Surgery Customization (Ongoing)
1. Before/after photo management
2. Procedure-specific workflows
3. Payment workflow integration
4. Consultation → Procedure → Surgery optimization

---

## 12. TESTING CHECKLIST

### Role-Based Access Testing
- [ ] ADMIN can create/view/update/delete patients
- [ ] DOCTOR can create/view/update assigned patients
- [ ] SURGEON can create/view patients (after fix)
- [ ] NURSE can create/view/update assigned patients
- [ ] FRONT_DESK can create patients (after fix)
- [ ] BILLING can view patient billing info
- [ ] PATIENT can self-register and view own records

### Workflow Testing
- [ ] Cannot create ProcedurePlan without completed Consultation
- [ ] Cannot create Consent without APPROVED ProcedurePlan
- [ ] Cannot create SurgicalCase without SIGNED Consent
- [ ] Cannot consume inventory before case IN_PROGRESS

### EMR Compliance Testing
- [ ] All patient access is logged
- [ ] RLS prevents unauthorized access
- [ ] Domain events are emitted
- [ ] Audit trail is complete

---

## Conclusion

The foundation is solid but has critical gaps in role-based access for patient intake. The workflow validation exists but needs integration. EMR concerns are mostly addressed but could be enhanced with field-level permissions and patient portal.

**Immediate Action Required:**
1. Fix FRONT_DESK permissions
2. Add SURGEON to patient creation
3. Implement patient self-registration
4. Integrate workflow validation

This will create a robust, enterprise-grade foundation for the Aesthetic Surgery Center workflows.






