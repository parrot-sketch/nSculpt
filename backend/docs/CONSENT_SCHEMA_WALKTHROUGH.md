# Consent Schema Walkthrough - Complete Explanation

## Overview

This document walks through the Prisma schema design for the consent system, explaining **why each table exists** and **how they work together**.

---

## Table 1: ConsentTemplate

### What It Is
The "master copy" of consent wording. Think of it as a form template.

### Why It Exists
- **Reusability:** One template can be used for many patients
- **Consistency:** Ensures all patients see the same wording
- **Version Control:** Track changes over time
- **Two Types:** General (one-time) and Procedure-specific (per-procedure)

### Key Fields Explained

```prisma
templateType String // GENERAL or PROCEDURE_SPECIFIC
```
**Why:** Different workflows:
- GENERAL = Signed once, applies forever (privacy, photography)
- PROCEDURE_SPECIFIC = Must sign before each surgery

```prisma
procedureCode String? // CPT code (e.g., "19325")
applicableCPTCodes String[] // Array of codes
```
**Why:** System automatically selects correct template based on procedure CPT code.

```prisma
originalDocumentPath String? // Path to uploaded PDF
originalDocumentHash String? // SHA-256 hash
```
**Why:** Preserves exact wording as reviewed by legal. If someone questions the wording, we can show the original document.

### Relationships
- `sections[]` - Structured sections (for digital display)
- `instances[]` - Patient consent instances created from this template
- `requiredParties[]` - Which parties must sign (NEW - dynamic)
- `documentSnapshots[]` - Exact wording snapshots when signed

---

## Table 2: ConsentTemplateRequiredParty ⭐ NEW

### What It Is
Configuration table: Defines which parties must sign for each template.

### Why It Exists
**Problem:** Different procedures need different signers.

**Examples:**
- Breast augmentation: Patient + Surgeon + Witness
- Minor's rhinoplasty: Guardian + Patient (if 16+) + Surgeon
- Complex case: Patient + Surgeon + Anesthesiologist + Witness

**Solution:** Configure per template, not hardcode in schema.

### Key Fields

```prisma
partyType String // PATIENT, GUARDIAN, SURGEON, ANESTHESIOLOGIST, WITNESS, ADMIN
required Boolean // Must sign (true) or optional (false)?
order Int // Signing order (1 = first, 2 = second)
```

**Example Data:**
```
Template: "BREAST_AUG_V1"
Parties:
  1. PATIENT (required=true, order=1)
  2. SURGEON (required=true, order=2)
  3. WITNESS (required=true, order=3)
```

### Why Not Hardcode?
- ✅ Add new party types without schema change
- ✅ Different templates = different requirements
- ✅ Admin can configure via UI, not code

---

## Table 3: ConsentSection

### What It Is
Structured sections within a consent (e.g., "Risks", "Benefits", "Alternatives").

### Why It Exists
- **Digital UX:** Break long consent into manageable sections
- **Understanding Checks:** Can require acknowledgment per section
- **Progressive Disclosure:** Patient reviews section-by-section

### Key Fields

```prisma
content String? // Structured content (markdown/HTML)
plainLanguageContent String? // Simplified version
```
**Why:** Two versions:
- Structured content = For display
- Plain language = For better comprehension

**Note:** This is the **structured** version. Exact wording is preserved in `ConsentDocumentSnapshot`.

---

## Table 4: ConsentClause

### What It Is
Granular clauses within sections (e.g., "Risk of Infection", "Risk of Scarring").

### Why It Exists
- **Granular Tracking:** Track acknowledgment at clause level
- **Recall:** Can ask "Did patient acknowledge specific risk?"
- **Legal Defense:** Show patient saw and acknowledged specific risks

---

## Table 5: PatientConsentInstance

### What It Is
A patient-specific consent created from a template. This is the actual consent a patient signs.

### Why It Exists
- **One template, many patients:** Template is master, instance is patient-specific
- **Track status:** DRAFT → IN_PROGRESS → PENDING_SIGNATURES → SIGNED
- **Link to procedures:** Connect to ProcedurePlan and SurgicalCase

### Key Fields Explained

```prisma
templateVersion String // "1.0.0" - version at time of consent
```
**Why:** If template changes later, we know which version patient signed.

```prisma
status String // DRAFT, IN_PROGRESS, PENDING_SIGNATURES, SIGNED, etc.
```
**Why:** 
- PENDING_SIGNATURES = Some parties signed, waiting for others
- Tracks progress through workflow

```prisma
procedurePlanId String? // Links to ProcedurePlan
relatedCaseId String? // Links to SurgicalCase
```
**Why:** Connects consent to the actual procedure being consented to.

### Relationships
- `signatures[]` - All signatures (patient, surgeon, witness, etc.) ⭐ NEW
- `documentSnapshot` - Exact wording preservation ⭐ NEW
- `versionHistory` - Re-consent tracking ⭐ NEW

### Removed Fields (Moved to ConsentSignature)
- ❌ `signedBy` - Now in ConsentSignature
- ❌ `clinicianSignedBy` - Now in ConsentSignature
- ❌ `witnessedBy` - Now in ConsentSignature

---

## Table 6: ConsentSignature ⭐ NEW

### What It Is
Individual signature record for each party (patient, surgeon, witness, etc.).

### Why It Exists
**Problem:** Old schema hardcoded signature fields. Can't handle:
- Multiple surgeons
- Guardian separate from patient
- Different party combinations

**Solution:** One signature record per party.

### Key Fields

```prisma
partyType String // PATIENT, GUARDIAN, SURGEON, etc.
signedBy String // User ID (who signed)
signedAt DateTime // When they signed
```

```prisma
guardianRelationship String? // "PARENT", "LEGAL_GUARDIAN"
guardianConsentFor String? // Patient ID if guardian signing for minor
```
**Why:** For minors, guardian signs. This tracks who the guardian is and who they're consenting for.

```prisma
signatureHash String? // SHA-256 of signature
```
**Why:** Legal integrity - verify signature hasn't been tampered with.

### Example Usage

**Breast Augmentation Consent:**
```
Instance ID: CONSENT-2024-001
Signatures:
  1. PATIENT (signedBy: patient-user-id, signedAt: 2024-01-15 10:00)
  2. SURGEON (signedBy: surgeon-user-id, signedAt: 2024-01-15 10:05)
  3. WITNESS (signedBy: nurse-user-id, signedAt: 2024-01-15 10:06)
```

---

## Table 7: ConsentDocumentSnapshot ⭐ NEW

### What It Is
Exact wording of consent document at time patient signed.

### Why It Exists
**Legal Requirement:** Courts need to see EXACT text patient signed, not a template that might have changed later.

**Problem:** If template changes, we can't rely on template content to show what patient signed.

**Solution:** Snapshot exact wording at signing time.

### Key Fields

```prisma
fullDocumentText String @db.Text // ENTIRE consent text
```
**Why:** TEXT field (not JSON) - preserves exact wording as string. This is the source of truth.

```prisma
sectionSnapshots Json?
```
**Why:** JSON for queryability (find specific section), but fullDocumentText is primary.

### When Created
- Created once when consent is fully signed (status = SIGNED)
- Never modified after creation (immutable)

---

## Table 8: ConsentVersionHistory ⭐ NEW

### What It Is
Tracks re-consents - when a consent is replaced by a new consent.

### Why It Exists
**Scenario:** Patient signs consent. Procedure plan changes. Patient must re-sign.

**Need:** Track that consent #2 supersedes consent #1, and why.

### Key Fields

```prisma
versionNumber Int // 1, 2, 3...
previousInstanceId String? // Previous consent ID
changeReason String? // Why re-consent was needed
```

### Example
```
Consent #1: Initial breast augmentation (version 1)
Consent #2: Plan changed to larger implants (version 2)
  - previousInstanceId = Consent #1 ID
  - changeReason = "Procedure plan changed: implant size increased"
```

---

## Table 9: PatientConsentAcknowledgement

### What It Is
Tracks when patient acknowledges understanding of sections/clauses.

### Why It Exists
- **Legal Defense:** Show patient read and understood each section
- **Understanding Checks:** Force acknowledgment before signing
- **Audit Trail:** Track engagement (time spent, scroll depth)

### Key Fields

```prisma
understandingCheckPassed Boolean
discussionRequired Boolean
discussedWith String? // Clinician ID if discussion needed
```
**Why:** Not just "clicked yes" - tracks if patient understood or needed discussion.

```prisma
timeSpentSeconds Int?
scrollDepth Int? // 0-100
```
**Why:** Legal evidence - patient spent time reading, not just clicked through.

---

## Table 10: ConsentArtifact

### What It Is
Generated PDF of signed consent (immutable record).

### Why It Exists
- **Legal Requirement:** Signed PDF for records
- **Evidence:** Can print/share signed consent
- **Integrity:** SHA-256 hash to verify not tampered

---

## Table 11: ConsentInteraction

### What It Is
Complete audit trail of every user interaction.

### Why It Exists
**Legal Requirement:** Know exactly who did what, when.

### Interaction Types
- VIEWED_SECTION - Patient viewed a section
- ACKNOWLEDGED_SECTION - Patient acknowledged section
- ASKED_QUESTION - Patient asked a question
- SIGNED - Party signed
- etc.

---

## How They Work Together: Example Flow

### Scenario: Patient needs breast augmentation consent

**Step 1: Template Configuration (Admin)**
```
ConsentTemplate: "BREAST_AUG_V1"
  - templateType: PROCEDURE_SPECIFIC
  - procedureCode: "19325"
  - Sections: [Risks, Benefits, Alternatives, Photos, Privacy]
  
ConsentTemplateRequiredParty:
  - PATIENT (required=true, order=1)
  - SURGEON (required=true, order=2)
  - WITNESS (required=true, order=3)
```

**Step 2: Create Instance (System)**
```
Consultation → Procedure Plan Created (CPT: 19325)
  → System finds template matching CPT code
  → Creates PatientConsentInstance
      - templateId: "BREAST_AUG_V1"
      - procedurePlanId: [procedure plan ID]
      - status: DRAFT
```

**Step 3: Patient Reviews (Patient)**
```
Patient views sections:
  → ConsentInteraction: VIEWED_SECTION (Risks)
  → PatientConsentAcknowledgement: acknowledged section
  → Understanding check: Passed
  → Repeat for all sections
```

**Step 4: Signatures (Multiple Parties)**
```
1. Patient signs:
   → ConsentSignature: partyType=PATIENT, signedBy=patient-id
   
2. Surgeon signs:
   → ConsentSignature: partyType=SURGEON, signedBy=surgeon-id
   
3. Witness signs:
   → ConsentSignature: partyType=WITNESS, signedBy=nurse-id
```

**Step 5: Finalization (System)**
```
All required parties signed:
  → Status: SIGNED
  → ConsentDocumentSnapshot: Create exact wording snapshot
  → ConsentArtifact: Generate signed PDF
  → Instance.signedAt: Set timestamp
```

**Step 6: Pre-Op Check (System)**
```
Surgical Case scheduled:
  → Check: consent.status = SIGNED
  → Check: All required parties signed
  → Check: Consent not expired
  → Proceed with surgery
```

---

## Integration with Procedures

### General Consent Workflow

```
Consultation (First Visit)
  ↓
System creates General Consent Instance
  ↓
Patient signs (one-time)
  ↓
Applies to all future procedures
```

### Procedure-Specific Consent Workflow

```
Consultation → Procedure Plan Created
  ↓
System matches CPT code to template
  ↓
System creates Procedure-Specific Consent Instance
  ↓
Links to ProcedurePlan
  ↓
Patient + Required Parties Sign
  ↓
Surgical Case Scheduled
  ↓
Pre-op validates signed consent
  ↓
Surgery proceeds
```

### Re-Consent Workflow

```
Procedure Plan Changed
  ↓
System detects significant changes
  ↓
Create new Consent Instance
  ↓
Link to previous: supersedesId
  ↓
Mark previous: SUPERSEDED
  ↓
ConsentVersionHistory: Track change reason
  ↓
Patient re-signs new consent
```

---

## Why This Design Works

### ✅ Prisma is Single Source of Truth
- All consent data in PostgreSQL
- No external document stores
- Queryable, auditable, version-controlled

### ✅ Dynamic Parties
- Configure via UI, not code
- Flexible for different procedures
- No hardcoding

### ✅ Exact Wording Preserved
- `fullDocumentText` = Exact wording (TEXT field)
- `sectionSnapshots` = Queryable structure (JSON)
- Original document hash stored

### ✅ Immutable Records
- Signatures can't be modified
- Snapshots can't be changed
- Complete audit trail

### ✅ Procedure Integration
- Links to ProcedurePlan and SurgicalCase
- Automatic template selection by CPT code
- Pre-op validation

---

## Next: Implementation Steps

1. ✅ Schema design complete
2. ⏭️ Create ProcedurePlan model (referenced but not yet created)
3. ⏭️ Run migration: `npx prisma migrate dev --name add_consent_dynamic_parties`
4. ⏭️ Build repositories
5. ⏭️ Build services
6. ⏭️ Build controllers
7. ⏭️ Integration testing

Ready to proceed with implementation?









