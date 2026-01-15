# Aesthetic Surgery Center - Clinical Workflow Analysis

## Executive Summary

This document analyzes the clinical workflows of an aesthetic surgical center, identifies gaps in the current implementation, and proposes solutions to ensure chronological accuracy and logical flow from patient registration through surgery completion.

---

## 🏥 IDEAL AESTHETIC SURGERY WORKFLOW

### Phase 1: Patient Registration (Privacy-First)
```
1. New Patient Arrives
   ↓
2. Front Desk Initiates Self-Registration
   ↓
3. Patient Self-Registers (Privacy Compliance)
   - Personal Information
   - Contact Details
   - Medical History (Basic)
   - Insurance Information (if applicable)
   ↓
4. Patient Account Created
   - Patient Record (MRN assigned)
   - Patient User Account (for portal access)
   ↓
5. Registration Complete
```

**Current Status**: ❌ NOT IMPLEMENTED
- No patient self-registration workflow
- No patient user account creation
- No patient portal

---

### Phase 2: Consultation & Procedure Planning
```
1. Consultation Scheduled
   - Patient selects available time slot
   - Surgeon assigned
   ↓
2. Consultation Occurs
   - Surgeon meets patient
   - Discusses goals, expectations
   - Reviews medical history
   - Examines patient
   ↓
3. Procedure Plan Created
   - Specific procedure(s) identified
   - Procedure details documented
   - Estimated costs discussed
   - Timeline established
   ↓
4. Procedure Plan Approved
   - Surgeon approves plan
   - Patient acknowledges understanding
```

**Current Status**: ⚠️ PARTIALLY IMPLEMENTED
- Consultation model exists ✅
- ProcedurePlan model exists ✅
- Missing: Workflow enforcement
- Missing: Status transitions
- Missing: Patient acknowledgment

---

### Phase 3: Consent Process (CRITICAL)
```
1. Procedure Plan Approved
   ↓
2. Consent Template Selected
   - Based on procedure code
   - Procedure-specific consent
   ↓
3. Consent Instance Created
   - Linked to ProcedurePlan (REQUIRED)
   - Linked to Consultation
   - Linked to Patient
   ↓
4. Patient Reviews Consent
   - Patient accesses consent via portal
   - Reviews all sections/clauses
   - Asks questions if needed
   ↓
5. Patient Signs Consent
   - Digital signature
   - All required parties sign
   - Consent locked (immutable)
   ↓
6. Consent Status: SIGNED
```

**Current Status**: ⚠️ PARTIALLY IMPLEMENTED
- Consent model exists ✅
- Consent can be created without ProcedurePlan ❌
- Missing: Workflow enforcement (consent requires procedure)
- Missing: Patient portal for consent review

---

### Phase 4: Pre-Operative Preparation
```
1. Consent Signed
   ↓
2. Pre-Operative Requirements
   - Lab orders (if needed)
   - Pre-op medications
   - Pre-op instructions
   ↓
3. Inventory Reservation
   - Required items identified from ProcedurePlan
   - Items reserved for surgery date
   ↓
4. Pre-Operative Clearance
   - All requirements met
   - Patient cleared for surgery
```

**Current Status**: ⚠️ PARTIALLY IMPLEMENTED
- Lab orders exist ✅
- Prescriptions exist ✅
- ProcedureInventoryRequirement exists ✅
- Missing: Pre-op workflow orchestration
- Missing: Clearance status tracking

---

### Phase 5: Surgery Scheduling
```
1. Consent Signed + Pre-Op Clearance
   ↓
2. Surgical Case Created
   - Linked to ProcedurePlan (REQUIRED)
   - Linked to Patient
   - Procedure details copied from plan
   ↓
3. Theater Booking
   - Available theater selected
   - Time slot reserved
   - Staff allocated
   ↓
4. Case Status: SCHEDULED
```

**Current Status**: ❌ WORKFLOW GAP
- SurgicalCase exists ✅
- TheaterReservation exists ✅
- Missing: Link between SurgicalCase and ProcedurePlan
- Missing: Validation that consent is signed before scheduling
- Missing: Workflow enforcement

---

### Phase 6: Surgery Day
```
1. Surgery Day Arrives
   ↓
2. Case Status: IN_PROGRESS
   ↓
3. Inventory Consumption
   - Items used from reserved inventory
   - Batch/lot numbers recorded
   - Linked to SurgicalCase
   ↓
4. Procedure Performed
   - Surgeon performs procedure
   - Notes documented
   ↓
5. Case Status: COMPLETED
   ↓
6. Post-Operative Care
   - Immediate post-op instructions
   - Medications prescribed
   - Follow-up scheduled
```

**Current Status**: ⚠️ PARTIALLY IMPLEMENTED
- InventoryUsage exists ✅
- Status tracking exists ✅
- Missing: Workflow orchestration
- Missing: Automatic status transitions

---

### Phase 7: Billing
```
1. Case Completed
   ↓
2. Billing Event Triggered
   - Procedure charges (from ProcedurePlan)
   - Inventory charges (from InventoryUsage)
   - Anesthesia charges (if applicable)
   ↓
3. Bill Created
   - All charges grouped
   - Insurance applied (if applicable)
   - Patient responsibility calculated
   ↓
4. Payment Processing
   - Patient pays (before or after surgery)
   - Payment allocated to bill
   - Receipt generated
```

**Current Status**: ✅ WELL IMPLEMENTED
- Event-driven billing ✅
- BillLineItem with event anchoring ✅
- Payment processing ✅

---

## 🔴 CRITICAL WORKFLOW GAPS

### 1. **Consent Without Procedure** (CRITICAL)
**Issue**: `PatientConsentInstance` can be created without `procedurePlanId`.

**Impact**:
- Consent can exist without a procedure
- Violates clinical logic
- Legal defensibility compromised
- Workflow doesn't make sense

**Current Schema**:
```prisma
model PatientConsentInstance {
  procedurePlanId String? @unique @db.Uuid // ❌ OPTIONAL
  consultationId String? @db.Uuid // ❌ OPTIONAL
}
```

**Fix Required**:
```prisma
model PatientConsentInstance {
  procedurePlanId String @unique @db.Uuid // ✅ REQUIRED
  consultationId String @db.Uuid // ✅ REQUIRED
}
```

**Business Rule**: Consent MUST be tied to a specific procedure plan.

---

### 2. **SurgicalCase Not Linked to ProcedurePlan** (CRITICAL)
**Issue**: `SurgicalCase` has no direct link to `ProcedurePlan`.

**Impact**:
- Cannot trace which procedure plan led to surgery
- Duplicate data (procedureName in both)
- No workflow enforcement
- Cannot validate consent before scheduling

**Current Schema**:
```prisma
model SurgicalCase {
  patientId String @db.Uuid
  procedureName String @db.VarChar(500) // ❌ Duplicated from ProcedurePlan
  // ❌ No procedurePlanId
}
```

**Fix Required**:
```prisma
model SurgicalCase {
  patientId String @db.Uuid
  procedurePlanId String @db.Uuid // ✅ REQUIRED
  procedureName String @db.VarChar(500) // Denormalized for queries
  // ... rest
}
```

**Business Rule**: SurgicalCase MUST be created from an approved ProcedurePlan.

---

### 3. **No Workflow State Machine** (HIGH)
**Issue**: No enforcement of chronological workflow.

**Missing Validations**:
- ❌ Cannot create ProcedurePlan without Consultation
- ❌ Cannot create Consent without ProcedurePlan
- ❌ Cannot create SurgicalCase without signed Consent
- ❌ Cannot schedule surgery without pre-op clearance
- ❌ Cannot complete case without inventory consumption

**Fix Required**: Add workflow state machine with validations.

---

### 4. **Patient Self-Registration Missing** (HIGH)
**Issue**: No patient-facing registration workflow.

**Impact**:
- Privacy concerns (front desk sees all data)
- Poor patient experience
- HIPAA compliance concerns
- Manual data entry errors

**Fix Required**:
- Patient self-registration portal
- Patient user account creation
- Secure data entry
- Validation and confirmation

---

### 5. **Patient Portal Missing** (HIGH)
**Issue**: No patient-facing interface.

**Missing Features**:
- ❌ View consultation history
- ❌ Review and sign consents
- ❌ View procedure plans
- ❌ View bills and payments
- ❌ Schedule follow-ups
- ❌ Access medical records

**Fix Required**: Complete patient portal implementation.

---

## 📊 CURRENT WORKFLOW ANALYSIS

### What Works ✅
1. **Patient Registration** (Backend)
   - Patient model complete
   - MRN generation working
   - Duplicate detection working

2. **Consultation Management**
   - Consultation model exists
   - Links to patient
   - Status tracking

3. **Procedure Planning**
   - ProcedurePlan model exists
   - Links to consultation
   - Inventory requirements tracked

4. **Consent Management**
   - Comprehensive consent model
   - Multi-party signatures
   - Immutable snapshots

5. **Theater Management**
   - Theater booking
   - Resource allocation
   - Double-booking prevention

6. **Inventory Management**
   - Event-driven transactions
   - Batch tracking
   - Clinical traceability

7. **Billing**
   - Event-driven billing
   - Complete audit trail
   - Payment processing

### What's Broken ❌
1. **Workflow Enforcement**
   - No validation that consent requires procedure
   - No validation that surgery requires consent
   - No chronological enforcement

2. **Data Relationships**
   - SurgicalCase not linked to ProcedurePlan
   - Consent can exist without procedure
   - Missing links in workflow chain

3. **Patient Experience**
   - No self-registration
   - No patient portal
   - No patient-facing workflows

4. **Workflow Orchestration**
   - No state machine
   - No automatic transitions
   - No workflow validation

---

## 🔧 PROPOSED FIXES

### Fix 1: Make Consent Require ProcedurePlan
```prisma
model PatientConsentInstance {
  // ... existing fields
  procedurePlanId String @unique @db.Uuid // ✅ REQUIRED (not optional)
  consultationId String @db.Uuid // ✅ REQUIRED (not optional)
  
  // Validation: Consent must have procedure plan
  @@index([procedurePlanId])
}
```

### Fix 2: Link SurgicalCase to ProcedurePlan
```prisma
model SurgicalCase {
  // ... existing fields
  procedurePlanId String @db.Uuid // ✅ ADD THIS
  procedureName String @db.VarChar(500) // Keep for denormalization
  
  // Relations
  procedurePlan ProcedurePlan @relation(fields: [procedurePlanId], references: [id])
  
  @@index([procedurePlanId])
}
```

### Fix 3: Add Workflow State Machine
```typescript
enum ProcedurePlanStatus {
  DRAFT           // Created but not approved
  PENDING_APPROVAL // Waiting for surgeon approval
  APPROVED         // Approved, ready for consent
  CONSENT_PENDING  // Waiting for consent signature
  CONSENT_SIGNED   // Consent signed, ready for scheduling
  SCHEDULED        // Surgery scheduled
  COMPLETED        // Surgery completed
  CANCELLED        // Cancelled
}

// Validation rules:
// - Cannot move to CONSENT_PENDING without APPROVED
// - Cannot move to SCHEDULED without CONSENT_SIGNED
// - Cannot create SurgicalCase without CONSENT_SIGNED
```

### Fix 4: Patient Self-Registration Workflow
```typescript
// New endpoint: POST /api/public/patients/register
// - No authentication required (public)
// - Patient enters own data
// - Creates patient record
// - Creates patient user account
// - Sends confirmation email
// - Returns patient credentials
```

### Fix 5: Patient Portal
```typescript
// Patient-facing endpoints:
// - GET /api/patient/me (own profile)
// - GET /api/patient/consultations (own consultations)
// - GET /api/patient/procedure-plans (own plans)
// - GET /api/patient/consents (own consents)
// - POST /api/patient/consents/:id/sign (sign consent)
// - GET /api/patient/bills (own bills)
// - POST /api/patient/bills/:id/pay (make payment)
```

---

## 🎯 CHRONOLOGICAL WORKFLOW VALIDATION

### Correct Flow ✅
```
Patient Registration
  ↓
Consultation Scheduled
  ↓
Consultation Completed
  ↓
Procedure Plan Created (DRAFT)
  ↓
Procedure Plan Approved (APPROVED)
  ↓
Consent Created (linked to ProcedurePlan) ← REQUIRED
  ↓
Consent Signed (CONSENT_SIGNED)
  ↓
Pre-Op Requirements Met
  ↓
Surgical Case Created (linked to ProcedurePlan) ← REQUIRED
  ↓
Theater Booked
  ↓
Surgery Day: Inventory Consumed
  ↓
Case Completed
  ↓
Billing Generated
  ↓
Payment Processed
```

### Current Broken Flow ❌
```
Patient Registration
  ↓
Consultation (optional)
  ↓
Consent Created (without procedure!) ← ❌ WRONG
  ↓
Surgical Case Created (without procedure plan!) ← ❌ WRONG
  ↓
Theater Booked
  ↓
... rest
```

---

## 🔒 PRIVACY & SECURITY CONSIDERATIONS

### Patient Self-Registration
- ✅ Patient enters own data (privacy)
- ✅ Data encrypted in transit
- ✅ Minimal data exposure to front desk
- ✅ Patient controls own information

### Patient Portal
- ✅ Patient can only see own data
- ✅ Role-based access (PATIENT role)
- ✅ Audit logging for all access
- ✅ Secure consent signing

### Consent Workflow
- ✅ Patient reviews consent privately
- ✅ Patient signs consent digitally
- ✅ Immutable consent records
- ✅ Complete audit trail

---

## 📋 IMPLEMENTATION PRIORITY

### Phase 1: Critical Fixes (Immediate)
1. ✅ Make `procedurePlanId` required in Consent
2. ✅ Add `procedurePlanId` to SurgicalCase
3. ✅ Add workflow validation logic
4. ✅ Add state machine for ProcedurePlan

### Phase 2: Patient Experience (High Priority)
1. ✅ Patient self-registration endpoint
2. ✅ Patient user account creation
3. ✅ Patient portal foundation
4. ✅ Consent review/signing interface

### Phase 3: Workflow Orchestration (Medium Priority)
1. ✅ Workflow state machine
2. ✅ Automatic status transitions
3. ✅ Workflow validation middleware
4. ✅ Workflow dashboard

### Phase 4: Enhanced Features (Future)
1. ⏳ Patient mobile app
2. ⏳ Automated reminders
3. ⏳ Online payment integration
4. ⏳ Telemedicine integration

---

## ✅ SUMMARY

**Current State**: Backend models exist but workflow is not enforced chronologically.

**Critical Gaps**:
1. Consent can exist without procedure ❌
2. SurgicalCase not linked to ProcedurePlan ❌
3. No workflow state machine ❌
4. No patient self-registration ❌
5. No patient portal ❌

**Next Steps**:
1. Fix schema relationships (make procedurePlanId required)
2. Add workflow validation
3. Implement patient self-registration
4. Build patient portal
5. Add workflow state machine

**Goal**: Ensure every workflow step makes chronological sense and is properly enforced at the database and application layers.






