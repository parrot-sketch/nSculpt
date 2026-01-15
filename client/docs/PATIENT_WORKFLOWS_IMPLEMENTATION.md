# Patient Workflows Implementation Plan

## Overview

This document outlines the implementation plan for **Consent** and **Procedure Planning** workflows in the frontend, with a focus on ultimate UX for admins first, then role-based distribution later.

---

## Current State

### ✅ Implemented
- Patient registration (multi-step wizard)
- Patient CRUD operations
- Patient list/search
- Patient profile view
- Patient edit

### ❌ Not Implemented
- **Consent workflows** (backend ready, frontend missing)
- **Procedure planning** (backend ready, frontend missing)
- **Integration workflows** (consultation → procedure → consent → surgery)

---

## User Stories - Consent Workflows

### US-CONSENT-001: View Patient Consent History

**As an** admin  
**I want to** see all consent instances for a patient  
**So that** I can track what consents they've signed and their status

**Acceptance Criteria:**
- Display list of consent instances with:
  - Template name (e.g., "Breast Augmentation Consent v2.0")
  - Status badge (DRAFT, IN_PROGRESS, SIGNED, REVOKED, EXPIRED)
  - Signed date (if signed)
  - Expiration date (if applicable)
  - Related procedure plan (if any)
- Click to view full consent details
- Filter by status, template type, date range
- Sort by date (newest first)

**UX Priority:** HIGH  
**Complexity:** MEDIUM

---

### US-CONSENT-002: Create Procedure-Specific Consent

**As an** admin  
**I want to** create a new consent instance for a procedure plan  
**So that** the patient can sign consent before surgery

**Acceptance Criteria:**
- Start from patient profile or procedure plan
- System auto-finds consent template by CPT code
- Show template preview before creating instance
- Create consent instance linked to:
  - Patient
  - Procedure plan
  - Consultation (if available)
- Initialize with required parties from template
- Status starts as DRAFT

**UX Priority:** HIGH  
**Complexity:** MEDIUM

**Workflow:**
```
1. Admin clicks "Create Consent" from procedure plan
2. System finds matching template by CPT code
3. Show template preview with sections
4. Admin reviews and confirms
5. System creates PatientConsentInstance (DRAFT)
6. Redirect to consent signing interface
```

---

### US-CONSENT-003: Patient Signs Consent (Digital Signing Flow)

**As an** admin (acting on behalf of patient)  
**I want to** guide patient through consent signing  
**So that** all required sections are acknowledged and signed legally

**Acceptance Criteria:**
- Multi-step interface showing consent sections
- Each section must be:
  - Viewed (tracked)
  - Acknowledged (checkbox)
  - Understanding check (if required)
- Progress indicator (e.g., "Section 2 of 6")
- Can't proceed until current section acknowledged
- Forced scrolling to bottom (prevents skipping)
- All required parties must sign:
  - Patient signs first
  - Surgeon signs (confirms discussion)
  - Witness signs (if required)
- Digital signature capture
- Generate immutable snapshot on completion
- Download signed PDF artifact

**UX Priority:** CRITICAL  
**Complexity:** HIGH

**Workflow:**
```
1. Open consent instance (status: DRAFT)
2. Show section 1 with content
3. Patient reads, acknowledges, passes understanding check
4. Progress to section 2, repeat...
5. After all sections: Show signature screen
6. Patient signs digitally
7. Admin/surgeon signs
8. Witness signs (if required)
9. System generates:
   - ConsentDocumentSnapshot (exact wording)
   - ConsentArtifact (signed PDF)
   - Updates status to SIGNED
10. Show confirmation screen
```

---

### US-CONSENT-004: View Consent Details & Signed Document

**As an** admin  
**I want to** view complete consent details and download signed PDF  
**So that** I can review what patient consented to and provide documentation

**Acceptance Criteria:**
- View all sections with acknowledged status
- Show timestamps for each acknowledgment
- Display all signatures with:
  - Who signed (name, role)
  - When signed
  - Signature method (digital, electronic, physical)
  - Device type (tablet, phone, desktop)
- Download signed PDF artifact
- View consent snapshot (exact wording at time of signing)
- Show version history if consent was superseded

**UX Priority:** HIGH  
**Complexity:** MEDIUM

---

### US-CONSENT-005: Revoke Consent

**As an** admin (with patient request)  
**I want to** revoke a signed consent  
**So that** patient can withdraw consent (legal requirement)

**Acceptance Criteria:**
- Only patient or authorized person can request revocation
- Require reason (minimum 10 characters)
- Create revocation event (domain event)
- Update status to REVOKED
- Prevent re-signing same instance
- Show revocation in consent history
- If surgery already scheduled, show warning

**UX Priority:** MEDIUM  
**Complexity:** LOW

---

## User Stories - Procedure Planning Workflows

### US-PROC-001: Create Procedure Plan from Consultation

**As an** admin  
**I want to** create a procedure plan during or after consultation  
**So that** I can plan the surgery with all details, codes, and inventory needs

**Acceptance Criteria:**
- Start from patient profile or consultation
- Multi-step wizard:
  - Step 1: Procedure details (name, type, description)
  - Step 2: Coding (CPT codes, diagnosis codes)
  - Step 3: Pricing (estimated cost, insurance coverage)
  - Step 4: Inventory requirements
- Auto-generate plan number (PLAN-2024-001)
- Link to consultation and patient
- Status starts as DRAFT
- Can save and continue later

**UX Priority:** CRITICAL  
**Complexity:** HIGH

**Workflow:**
```
1. From patient profile: "Create Procedure Plan"
2. Step 1: Basic Info
   - Procedure name (e.g., "Breast Augmentation")
   - Procedure type (COSMETIC, RECONSTRUCTIVE, HYBRID)
   - Description
3. Step 2: Coding
   - Primary CPT code (searchable dropdown)
   - Additional CPT codes (array)
   - Diagnosis codes (ICD-10, array)
4. Step 3: Pricing
   - Estimated cost (calculate from fee schedule or manual)
   - Insurance coverage? (toggle)
   - If hybrid: split insurance/patient portions
5. Step 4: Inventory Requirements
   - Add items needed (search inventory catalog)
   - For implants: size, shape, serial number requirement
   - Quantity for each item
   - Mark as required or optional
6. Review & Create
   - Show summary
   - Create plan (status: DRAFT)
   - Option to "Create Consent" next
```

---

### US-PROC-002: View Procedure Plans List

**As an** admin  
**I want to** see all procedure plans for a patient  
**So that** I can track planned procedures and their status

**Acceptance Criteria:**
- Display list with:
  - Plan number
  - Procedure name
  - Status badge (DRAFT, QUOTED, APPROVED, SCHEDULED, COMPLETED)
  - Created date
  - Estimated cost
  - Link to consent (if exists)
  - Link to surgical case (if exists)
- Filter by status, procedure type, date
- Sort by date (newest first)
- Click to view full plan details

**UX Priority:** HIGH  
**Complexity:** LOW

---

### US-PROC-003: View Procedure Plan Details

**As an** admin  
**I want to** see complete procedure plan details  
**So that** I can review all information before scheduling surgery

**Acceptance Criteria:**
- Display all plan information:
  - Basic details (name, type, description)
  - CPT codes and diagnosis codes
  - Pricing breakdown
  - Inventory requirements (with availability check)
  - Status and workflow timeline
  - Related consent (with status)
  - Related surgical case (if scheduled)
- Actions available:
  - Edit (if DRAFT)
  - Generate Quote (if DRAFT/QUOTED)
  - Approve Plan (if QUOTED)
  - Create Consent (if not exists)
  - Schedule Surgery (if APPROVED + consent signed)

**UX Priority:** HIGH  
**Complexity:** MEDIUM

---

### US-PROC-004: Generate Quote for Procedure Plan

**As an** admin  
**I want to** generate a quote from a procedure plan  
**So that** I can send pricing to patient for approval

**Acceptance Criteria:**
- Calculate total from:
  - Procedure fee (from fee schedule)
  - Inventory costs (implants, supplies)
  - Facility fee
  - Anesthesia (if applicable)
- Show breakdown
- Generate quote document (PDF)
- Update plan status to QUOTED
- Send quote to patient (email/SMS) - future

**UX Priority:** MEDIUM  
**Complexity:** MEDIUM

---

### US-PROC-005: Approve Procedure Plan

**As an** admin (or patient)  
**I want to** approve a procedure plan  
**So that** it's ready for scheduling

**Acceptance Criteria:**
- Can approve if status is QUOTED
- Require confirmation
- Update status to APPROVED
- Set approvedAt timestamp
- Can now create surgical case
- Show validation:
  - ✅ Plan approved
  - ✅ Consent signed (if required)
  - ✅ Prior authorization (if reconstructive)
  - ✅ Inventory available (if pre-allocation needed)

**UX Priority:** HIGH  
**Complexity:** LOW

---

### US-PROC-006: Add/Edit Inventory Requirements

**As an** admin  
**I want to** add or edit inventory requirements for a procedure plan  
**So that** I can ensure all needed items are available

**Acceptance Criteria:**
- Add inventory item (search catalog)
- Set quantity
- For implants: specify size, shape, serial number requirement
- Mark as required or optional
- Check availability (real-time stock check)
- Pre-allocate specific batches (if needed)
- Remove requirements
- Edit quantities/specifications

**UX Priority:** MEDIUM  
**Complexity:** MEDIUM

---

## Integration Workflows

### INTEGRATION-001: Complete Patient Journey Flow

**As an** admin  
**I want to** guide a patient through the complete journey from consultation to surgery  
**So that** nothing is missed and all requirements are met

**Workflow:**
```
1. Consultation Created
   ↓
2. Create Procedure Plan (from consultation)
   - Fill in procedure details
   - Add CPT codes
   - Set pricing
   - Add inventory requirements
   ↓
3. Generate Quote (optional)
   - Send to patient
   ↓
4. Patient Approves Plan
   - Status: APPROVED
   ↓
5. Create Consent (auto-triggered or manual)
   - System finds template by CPT code
   - Create consent instance
   ↓
6. Patient Signs Consent
   - Multi-step signing flow
   - All parties sign
   - Status: SIGNED
   ↓
7. Validate Pre-Op Requirements
   - ✅ Plan approved
   - ✅ Consent signed
   - ✅ Prior auth (if needed)
   - ✅ Inventory available
   ↓
8. Schedule Surgery
   - Create SurgicalCase
   - Link to procedure plan
   - Link to consent
   ↓
9. Pre-Op Checklist
   - Review consent
   - Verify inventory
   - Confirm patient identity
   ↓
10. Surgery
    - Record inventory consumption
    - Document procedure
    ↓
11. Billing
    - Auto-generate from procedure plan CPT codes
    - Link to inventory consumption
```

---

## Implementation Priority

### Phase 1: Foundation (Week 1)
1. ✅ Procedure Plan List View (patient profile)
2. ✅ Procedure Plan Detail View
3. ✅ Consent List View (patient profile)
4. ✅ Consent Detail View

### Phase 2: Creation Workflows (Week 2)
5. ✅ Create Procedure Plan (multi-step wizard)
6. ✅ Create Consent Instance (from procedure plan)
7. ✅ Add Inventory Requirements

### Phase 3: Signing Flow (Week 3)
8. ✅ Consent Signing Interface (multi-step)
9. ✅ Digital Signature Capture
10. ✅ Generate Signed PDF

### Phase 4: Integration (Week 4)
11. ✅ Link Procedure Plan → Consent → Surgery
12. ✅ Pre-op Validation
13. ✅ Quote Generation
14. ✅ Plan Approval Workflow

---

## UX Design Principles

### 1. Progressive Disclosure
- Don't overwhelm users
- Show one thing at a time
- Multi-step wizards for complex forms
- Expandable sections for details

### 2. Clear Status Indicators
- Visual badges for status
- Progress bars for multi-step flows
- Timeline view for workflow states

### 3. Contextual Actions
- Actions available based on current state
- Disable actions that aren't valid
- Show why actions are disabled

### 4. Validation & Feedback
- Real-time validation
- Clear error messages
- Success confirmations
- Loading states

### 5. Mobile Responsive
- All workflows work on tablet (for bedside signing)
- Touch-friendly buttons
- Readable text sizes

---

## File Structure

```
client/
├── app/(protected)/
│   └── admin/
│       └── patients/
│           ├── [id]/
│           │   ├── page.tsx (existing - enhance)
│           │   ├── procedures/
│           │   │   ├── page.tsx (list)
│           │   │   ├── new/
│           │   │   │   └── page.tsx (wizard)
│           │   │   └── [planId]/
│           │   │       └── page.tsx (detail)
│           │   └── consent/
│           │       ├── page.tsx (list)
│           │       ├── [consentId]/
│           │       │   ├── page.tsx (detail)
│           │       │   └── sign/
│           │       │       └── page.tsx (signing flow)
│           │       └── new/
│           │           └── page.tsx (create)
│
├── components/
│   ├── procedures/
│   │   ├── ProcedurePlanCard.tsx
│   │   ├── ProcedurePlanForm.tsx (multi-step)
│   │   ├── ProcedurePlanDetail.tsx
│   │   ├── InventoryRequirementForm.tsx
│   │   └── ProcedurePlanStatusBadge.tsx
│   ├── consent/
│   │   ├── ConsentCard.tsx
│   │   ├── ConsentDetailView.tsx
│   │   ├── ConsentSigningFlow.tsx (multi-step)
│   │   ├── ConsentSectionView.tsx
│   │   ├── UnderstandingCheck.tsx
│   │   ├── DigitalSignature.tsx
│   │   └── ConsentStatusBadge.tsx
│   └── workflows/
│       ├── ProcedureToConsentFlow.tsx
│       └── PreOpValidation.tsx
│
├── services/
│   ├── procedure.service.ts
│   └── consent.service.ts
│
└── types/
    ├── procedure.ts
    └── consent.ts
```

---

## Next Steps

1. ✅ Review this plan
2. ✅ Create TypeScript types for ProcedurePlan and Consent
3. ✅ Create API services (procedure.service.ts, consent.service.ts)
4. ✅ Build Procedure Plan list and detail views
5. ✅ Build Consent list and detail views
6. ✅ Build Procedure Plan creation wizard
7. ✅ Build Consent signing flow
8. ✅ Integrate everything together

Let's start! 🚀









