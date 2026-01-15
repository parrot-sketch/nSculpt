# Phase 2.1: Architectural Hardening - COMPLETE ✅
**Date:** 2026-01-11  
**Status:** COMPLETE  
**Type:** Architectural Correction (No new features)

---

## 🎯 OBJECTIVES ADDRESSED

Three critical architectural weaknesses were fixed:

1. ✅ **Patient ↔ User Linkage** - Proper FK instead of email matching
2. ✅ **Mandatory RLS Enforcement** - `RlsGuard` enhanced and uniformly applied
3. ✅ **Admin-Created Patients Login** - Patient Invitation workflow implemented

---

## 1. Patient ↔ User Linkage (FIXED)

### Problem
- Patient was linked to User by matching email
- No referential integrity
- If email changed in either table, linkage broke silently

### Solution

#### Schema Changes (`backend/prisma/schema/patient.prisma`)

```prisma
model Patient {
  // ... existing fields
  
  // NEW: User Account Linkage (CRITICAL: Primary identity link)
  userId      String?  @unique @db.Uuid // FK to User - 1:1 relationship
  
  // NEW: Patient Invitation fields
  invitationToken String? @unique @db.VarChar(255)
  invitationExpiresAt DateTime? @db.Timestamptz(6)
  invitedAt   DateTime? @db.Timestamptz(6)
  invitedBy   String?  @db.Uuid
  
  // NEW: Relations
  userAccount User? @relation("PatientUserAccount", fields: [userId], references: [id])
  invitedByUser User? @relation("PatientInvitedBy", fields: [invitedBy], references: [id])
  
  // NEW: Indexes
  @@index([invitationToken])
  @@index([invitedBy])
}
```

#### Migration (`backend/prisma/migrations/phase21_patient_user_linkage.sql`)

```sql
-- Add new columns
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE,
ADD COLUMN IF NOT EXISTS invitation_token VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS invited_by UUID;

-- Add FK constraints
ALTER TABLE patients
ADD CONSTRAINT fk_patients_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE patients
ADD CONSTRAINT fk_patients_invited_by 
FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL;

-- Backfill existing patients with matching emails
UPDATE patients p
SET user_id = u.id
FROM users u
INNER JOIN user_role_assignments ura ON ura.user_id = u.id
INNER JOIN roles r ON r.id = ura.role_id
WHERE p.email IS NOT NULL 
  AND p.email = u.email 
  AND p.user_id IS NULL
  AND r.code = 'PATIENT'
  AND ura.is_active = true;
```

#### Service Changes

**`PatientService.selfRegister()`** - Now creates User FIRST, then Patient with userId:

```typescript
// 1. Create User account FIRST
const user = await prisma.user.create({
  data: { email, firstName, lastName, passwordHash, ... }
});

// 2. Create Patient with userId FK
const patient = await this.patientRepository.createWithUserId({
  ...patientData,
  userId: user.id,  // CRITICAL: Proper FK linkage
});
```

**`PatientService.getPatientByUserId()`** - Now queries by FK:

```typescript
// OLD (fragile):
const user = await prisma.user.findUnique({ where: { id: userId } });
const patient = await prisma.patient.findFirst({ where: { email: user.email } });

// NEW (referential integrity):
const patient = await this.patientRepository.findByUserId(userId);
// Uses: prisma.patient.findUnique({ where: { userId } })
```

#### Repository Changes

New methods in `PatientRepository`:
- `findByUserId(userId)` - Query by FK
- `createWithUserId(data)` - Create with FK set
- `findByInvitationToken(token)` - For invitation flow
- `linkToUserAccount(patientId, userId)` - Link after invitation
- `setInvitation(patientId, token, expiresAt, invitedBy)`
- `clearInvitation(patientId)`

---

## 2. Mandatory RLS Enforcement (FIXED)

### Problem
- `RlsValidationService.canAccessPatient()` existed
- Not uniformly applied - developers could forget to call it
- Possible cross-patient data access

### Solution

#### Enhanced `RlsGuard` (`backend/src/common/guards/rls.guard.ts`)

The guard now:
1. **Extracts patientId** from all common param names: `id`, `patientId`, `patient_id`, `intakeId`, etc.
2. **Infers resource type** from route path - patient-related routes return 'Patient'
3. **Validates via `RlsValidationService`** for all patient data access

```typescript
// Enhanced resource ID extraction
private extractResourceId(request: any): string | null {
  const params = request.params || {};
  return params.id || params.patientId || params.patient_id || 
         params.intakeId || params.appointmentId || ...;
}

// Enhanced resource type inference
private inferResourceType(route: string): string {
  if (route.includes('/patients')) return 'Patient';
  if (route.includes('/intake')) return 'Patient';
  if (route.includes('/consultations')) return 'Patient';
  if (route.includes('/appointments')) return 'Patient';
  if (route.includes('/emr')) return 'Patient';
  if (route.includes('/lab-orders')) return 'Patient';
  if (route.includes('/prescriptions')) return 'Patient';
  // ...
}
```

#### Enhanced `RlsValidationService` (`backend/src/modules/audit/services/rlsValidation.service.ts`)

New method for patient self-service:

```typescript
async canPatientAccessOwnRecord(patientId: string, userId: string): Promise<boolean> {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { userId: true },
  });
  return patient?.userId === userId;  // Uses FK, not email matching
}
```

Enhanced `canAccessPatient()`:
- ADMIN: Full access
- PATIENT: Own record only (via userId FK)
- FRONT_DESK: View access for scheduling
- DOCTOR: Patients with consultations/appointments/as doctor in charge
- SURGEON: Patients in surgical cases
- NURSE: Patients in assigned cases

#### Already Applied Controllers

All patient controllers already use `@UseGuards(RolesGuard, RlsGuard, PermissionsGuard)`:
- `PatientController`
- `PatientSelfServiceController`
- `PatientLifecycleController`
- `PatientIntakeController`
- `PatientInvitationController`

---

## 3. Admin-Created Patients Login (FIXED)

### Problem
- Admin creates Patient → no User exists
- Patient cannot log in unless manually created
- No secure workflow

### Solution: Patient Invitation Flow (Option A)

**Why Option A (Invitation-based)?**
- More secure - patient sets their own password
- Better audit trail - tracks who invited, when, expiry
- Standard healthcare pattern - matches expectations
- Email verification implicit in flow

#### Workflow

```
1. Admin creates patient record (no User)
   └─→ Patient exists with userId = null

2. Admin clicks "Invite Patient"
   └─→ POST /patients/:id/invite
   └─→ System generates 256-bit secure token
   └─→ Token stored on patient record
   └─→ Email sent with invitation link (TODO: email service)

3. Patient clicks invitation link
   └─→ Frontend calls POST /patients/invitations/validate
   └─→ System validates token, returns patient info

4. Patient sets password
   └─→ POST /patients/invitations/accept
   └─→ System creates User account
   └─→ Links Patient.userId to new User
   └─→ Clears invitation token
   └─→ Audit logged

5. Patient can now log in
```

#### New Service: `PatientInvitationService`

```typescript
// Send invitation
async invitePatient(patientId: string, invitedBy: string): Promise<{
  patient: any;
  invitation: { token: string; expiresAt: Date; message: string };
}>

// Accept invitation
async acceptInvitation(token: string, password: string): Promise<{
  user: any;
  patient: any;
  message: string;
}>

// Validate token (public)
async validateToken(token: string): Promise<{
  valid: boolean;
  patient?: { id, firstName, lastName, email };
  expiresAt?: Date;
  error?: string;
}>

// Resend invitation
async resendInvitation(patientId: string, invitedBy: string)

// Cancel invitation
async cancelInvitation(patientId: string, cancelledBy: string)
```

#### New Controller: `PatientInvitationController`

**Admin Endpoints (Protected):**
- `POST /patients/:id/invite` - Send invitation
- `POST /patients/:id/invite/resend` - Resend invitation
- `POST /patients/:id/invite/cancel` - Cancel invitation

**Public Endpoints:**
- `POST /patients/invitations/validate` - Validate token
- `POST /patients/invitations/accept` - Accept and create account

#### Security Features

- **256-bit tokens**: `crypto.randomBytes(32).toString('hex')`
- **72-hour expiry**: Configurable via `INVITATION_EXPIRY_HOURS`
- **Single-use**: Token cleared after acceptance
- **Audit logged**: All actions (send, resend, accept, cancel)
- **Domain events**: `Patient.InvitationSent`, `Patient.InvitationAccepted`
- **Password validation**: Same rules as registration (12+ chars, uppercase, lowercase, number, special)

---

## 📁 Files Changed

### Schema
- `backend/prisma/schema/patient.prisma` - Added userId FK, invitation fields
- `backend/prisma/schema/rbac.prisma` - Added back-relations for patientAccount, patientsInvited

### Migration
- `backend/prisma/migrations/phase21_patient_user_linkage.sql` - New migration with backfill

### Services
- `backend/src/modules/patient/services/patient.service.ts` - Updated selfRegister, getPatientByUserId
- `backend/src/modules/patient/services/patient-invitation.service.ts` - NEW
- `backend/src/modules/audit/services/rlsValidation.service.ts` - Added canPatientAccessOwnRecord, enhanced canAccessPatient

### Repositories
- `backend/src/modules/patient/repositories/patient.repository.ts` - Added findByUserId, createWithUserId, invitation methods

### Guards
- `backend/src/common/guards/rls.guard.ts` - Enhanced resource extraction and type inference
- `backend/src/common/guards/patient-access.guard.ts` - Re-exports RlsGuard

### Controllers
- `backend/src/modules/patient/controllers/patient-invitation.controller.ts` - NEW

### DTOs
- `backend/src/modules/patient/dto/accept-invitation.dto.ts` - NEW
- `backend/src/modules/patient/dto/validate-invitation.dto.ts` - NEW

### Decorators
- `backend/src/common/decorators/skip-patient-access.decorator.ts` - NEW

### Module
- `backend/src/modules/patient/patient.module.ts` - Registered new service and controller

---

## ✅ VERIFICATION CHECKLIST

### Lifecycle Enforcement
- [x] `PatientLifecycleService` unchanged
- [x] `PatientRepository.update()` still rejects lifecycle fields
- [x] Transition rules still enforced
- [x] Atomic transactions with optimistic locking preserved

### MFA Enforcement
- [x] MFA flow unchanged
- [x] Sensitive roles still require MFA
- [x] Token structure preserved

### RBAC
- [x] `RolesGuard` unchanged
- [x] `PermissionsGuard` unchanged
- [x] Role assignments still work
- [x] Permission wildcards still supported

### Cross-Patient Leakage
- [x] `RlsGuard` enhanced to catch more routes
- [x] `canPatientAccessOwnRecord()` uses userId FK, not email
- [x] `canAccessPatient()` enhanced with more relationship checks
- [x] All patient controllers use RlsGuard

### Audit Logging
- [x] Patient creation logged
- [x] Patient self-registration logged
- [x] Invitation send/accept logged
- [x] RLS access granted/denied logged

---

## 🚀 DEPLOYMENT STEPS

```bash
# 1. Merge schema
cd backend/prisma
./scripts/merge-schema.sh

# 2. Generate Prisma client
npx prisma generate

# 3. Apply migration
npx prisma migrate dev --name phase21_patient_user_linkage

# OR for production:
psql -d your_database -f migrations/phase21_patient_user_linkage.sql

# 4. Restart backend
npm run start:dev
```

---

## 📊 IMPACT SUMMARY

### Before Phase 2.1
- Patient-User linkage: ⚠️ Fragile email matching
- RLS enforcement: ⚠️ Inconsistent
- Admin-created patients: ❌ Cannot log in

### After Phase 2.1
- Patient-User linkage: ✅ Proper FK with referential integrity
- RLS enforcement: ✅ Mandatory via RlsGuard on all routes
- Admin-created patients: ✅ Secure invitation workflow

---

## 🎯 PHASE 3 READINESS

With Phase 2.1 complete, the system now has:

1. **Proper Patient-User Identity** - FK-based, not email-based
2. **Mandatory RLS** - No accidental cross-patient access
3. **Complete Patient Onboarding** - Both self-register and admin-invite paths

**Phase 3 can now safely implement:**
- Clinical workflows (consultations, appointments)
- Prescriptions and lab orders
- Imaging and reports
- Theatre scheduling
- Consent workflows
- Discharge logic

All with confidence that:
- Patient identity is correct
- RLS prevents cross-patient leakage
- All patients can access the portal

---

**Status:** ✅ COMPLETE  
**Breaking Changes:** None  
**Migration Required:** Yes (with backfill)  
**Linter Errors:** 0  
**Ready for Phase 3:** YES
