# Consent Schema Design - Step-by-Step

## Design Philosophy

**Prisma is the single source of truth** - All consent data lives in PostgreSQL via Prisma. No external document stores, no file-only workflows.

**Incremental Enhancement** - Build on existing schema, don't rewrite. Enhance what works, add what's missing.

---

## Part 1: Understanding Consents & Procedures

### Are Consents Related to Procedures?

**YES - Consents are tightly coupled to procedures in aesthetic surgery:**

1. **General Consents** - General clinic consent (privacy, photography, data use)
   - One-time, applies to all future procedures
   - Signed during initial registration/consultation

2. **Procedure-Specific Consents** - Consent for a specific surgical procedure
   - Required for each procedure (breast augmentation, rhinoplasty, etc.)
   - Must be signed before surgery
   - Links to: Consultation → Procedure Plan → Surgical Case

### Integration Workflow

```
Consultation (Initial Visit)
  ↓
[General Consent] ← Signed here (one-time)
  ↓
Procedure Plan Created
  ↓
[Procedure-Specific Consent] ← Required for this procedure
  ↓
Surgical Case Scheduled
  ↓
Pre-Op Check: Verify consent is SIGNED
  ↓
Surgery Performed
```

**Key Point:** A patient can have:
- 1 General Consent (applies forever)
- Multiple Procedure-Specific Consents (one per procedure)

---

## Part 2: Schema Design - Core Models

### Step 1: ConsentTemplate (Already Exists - Enhance It)

**Why this exists:** Template is the "master copy" of consent wording. Multiple templates = General + Procedure-specific.

**Current state:** ✅ Good foundation

**Enhancement needed:**
1. Support both General and Procedure-specific templates
2. Preserve exact uploaded document text

```prisma
model ConsentTemplate {
  id          String   @id @default(uuid()) @db.Uuid
  templateCode String  @unique @db.VarChar(100) // e.g., "GENERAL_CONSENT_V1", "BREAST_AUG_V2"
  name        String   @db.VarChar(500)
  description String?  @db.Text
  
  // Template Type
  templateType String  @db.VarChar(50) // GENERAL, PROCEDURE_SPECIFIC
  // GENERAL = applies to all procedures (one-time)
  // PROCEDURE_SPECIFIC = requires per-procedure consent
  
  // Procedure linkage (if procedure-specific)
  procedureCode String? @db.VarChar(50) // CPT code (e.g., "19325" for breast augmentation)
  applicableCPTCodes String[] // Array of CPT codes this template applies to
  
  // Versioning
  version     String   @db.VarChar(50) // Semantic: "1.0.0"
  versionNumber Int    @default(1) // Incremental: 1, 2, 3...
  isActive    Boolean  @default(true)
  effectiveFrom DateTime @default(now()) @db.Timestamptz(6)
  effectiveUntil DateTime? @db.Timestamptz(6)
  
  // Legal metadata
  legalReviewDate DateTime? @db.Timestamptz(6)
  approvedBy      String?   @db.VarChar(200) // Legal/compliance reviewer
  
  // Source document preservation (NEW - preserves exact wording)
  originalDocumentPath String? @db.VarChar(1000) // Path to original uploaded PDF
  originalDocumentHash String? @db.VarChar(64) // SHA-256 of original
  
  // Audit
  createdAt   DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime  @updatedAt @db.Timestamptz(6)
  createdBy   String?   @db.Uuid
  version     Int       @default(1) // Optimistic locking
  
  // Relations
  sections    ConsentSection[]
  instances   PatientConsentInstance[]
  requiredParties ConsentTemplateRequiredParty[] // NEW - dynamic parties
  
  @@index([templateCode, version])
  @@index([templateType])
  @@index([isActive])
  @@index([procedureCode])
  @@map("consent_templates")
}
```

**Why preserve original document?**
- Legal requirement: Exact wording as reviewed by legal/compliance
- Audit: Can compare structured sections to original
- Version tracking: Know which original document version this template came from

---

### Step 2: ConsentSection (Already Exists - Keep It)

**Why this exists:** Breaks consent into logical sections (Risks, Benefits, Alternatives, etc.). This is the structured version for digital display.

**Current state:** ✅ Good - has content fields

**Note:** Sections are the **structured, digital-friendly** version. Original document is preserved separately.

---

### Step 3: Dynamic Parties Model (NEW - Critical)

**Problem:** Current schema hardcodes parties (presentedBy, witnessedBy, signedBy, clinicianSignedBy).

**Solution:** Make parties **configurable per template** and **track per instance**.

```prisma
// What parties are REQUIRED for a template
model ConsentTemplateRequiredParty {
  id          String   @id @default(uuid()) @db.Uuid
  templateId  String   @db.Uuid
  partyType   String   @db.VarChar(50) 
  // PATIENT, GUARDIAN, SURGEON, ANESTHESIOLOGIST, WITNESS, ADMIN
  
  required    Boolean  @default(true) // Must sign, or optional?
  order       Int      @db.Integer // Display/signing order
  
  createdAt   DateTime @default(now()) @db.Timestamptz(6)
  version     Int      @default(1)
  
  template    ConsentTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  
  @@unique([templateId, partyType])
  @@index([templateId])
  @@map("consent_template_required_parties")
}
```

**Why this exists:** 
- **Flexibility:** Different procedures need different signers
  - Cosmetic surgery: Patient + Surgeon + Witness (often)
  - Minor patient: Guardian + Surgeon + Patient (if age-appropriate)
  - Complex case: Patient + Surgeon + Anesthesiologist + Witness
- **Toggle per template:** Admin configures which parties are required
- **No hardcoding:** System adapts to requirements

---

### Step 4: Consent Signature Model (NEW - Critical)

**Problem:** Current schema has signature fields on instance (signedBy, clinicianSignedBy) but no separate signature records.

**Solution:** Separate signature records per party per instance.

```prisma
// Individual signature by each party
model ConsentSignature {
  id          String   @id @default(uuid()) @db.Uuid
  instanceId  String   @db.Uuid
  
  // Who signed
  partyType   String   @db.VarChar(50) 
  // PATIENT, GUARDIAN, SURGEON, ANESTHESIOLOGIST, WITNESS, ADMIN
  signedBy    String   @db.Uuid // User ID (patient, surgeon, etc.)
  
  // Signature details
  signedAt    DateTime @default(now()) @db.Timestamptz(6)
  signatureMethod String @db.VarChar(50) // DIGITAL, ELECTRONIC, PHYSICAL
  signatureData String? @db.Text // Base64 signature image, or digital signature hash
  
  // Context
  ipAddress   String?  @db.VarChar(50)
  userAgent   String?  @db.VarChar(500)
  deviceType  String?  @db.VarChar(50) // TABLET, PHONE, DESKTOP
  
  // Legal evidence
  signatureHash String? @db.VarChar(64) // SHA-256 of signature for integrity
  
  // For guardian signatures
  guardianRelationship String? @db.VarChar(100) // "PARENT", "LEGAL_GUARDIAN", etc.
  guardianConsentFor String? @db.Uuid // Patient ID if guardian signing for minor
  
  // Audit
  createdAt   DateTime @default(now()) @db.Timestamptz(6)
  version     Int      @default(1) // Always 1 - immutable after creation
  
  // Relations
  instance    PatientConsentInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)
  
  @@unique([instanceId, partyType]) // One signature per party type per instance
  @@index([instanceId])
  @@index([signedBy])
  @@index([partyType])
  @@index([signedAt])
  @@map("consent_signatures")
}
```

**Why this exists:**
- **One signature record per party:** Clean separation
- **Immutable:** Once created, cannot be modified (legal requirement)
- **Complete audit trail:** Who signed, when, from where
- **Flexibility:** Guardian can sign for minor (guardianConsentFor)

---

### Step 5: PatientConsentInstance (Enhance Existing)

**Current state:** ✅ Good foundation, but needs party management

**Enhancement:** Remove hardcoded signature fields, use ConsentSignature relation instead.

```prisma
model PatientConsentInstance {
  id          String   @id @default(uuid()) @db.Uuid
  instanceNumber String @unique @db.VarChar(50) // "CONSENT-2024-001"
  templateId  String   @db.Uuid
  templateVersion String @db.VarChar(50) // "1.0.0" - version at time of consent
  patientId   String   @db.Uuid
  
  // Status lifecycle
  status      String   @default("DRAFT") @db.VarChar(50) 
  // DRAFT, IN_PROGRESS, PENDING_SIGNATURES, SIGNED, REVOKED, EXPIRED, SUPERSEDED
  
  signedAt    DateTime? @db.Timestamptz(6) // When ALL required parties signed
  revokedAt   DateTime? @db.Timestamptz(6)
  expiresAt   DateTime? @db.Timestamptz(6)
  validUntil  DateTime? @db.Date // Procedure must occur before this date
  
  // Event anchoring
  revocationEventId String? @db.Uuid
  
  // Relationships
  consultationId String? @db.Uuid
  procedurePlanId String? @db.Uuid // NEW - links to procedure plan
  relatedCaseId String? @db.Uuid // SurgicalCase
  
  // Context
  presentedBy String   @db.Uuid // Who presented consent to patient
  
  // Understanding tracking
  understandingChecksPassed Boolean @default(false)
  questionsRaised Boolean @default(false)
  allSectionsAcknowledged Boolean @default(false)
  
  // Language
  language    String   @default("en") @db.VarChar(10)
  translated  Boolean  @default(false)
  
  // Re-consent
  supersededBy String? @db.Uuid
  supersedesId String? @db.Uuid
  
  notes       String?  @db.Text
  
  // Audit
  createdAt   DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime  @updatedAt @db.Timestamptz(6)
  createdBy   String?   @db.Uuid
  version     Int       @default(1)
  
  // Relations
  template    ConsentTemplate @relation(fields: [templateId], references: [id])
  consultation Consultation? @relation(fields: [consultationId], references: [id])
  procedurePlan ProcedurePlan? @relation(fields: [procedurePlanId], references: [id])
  signatures  ConsentSignature[] // NEW - all signatures for this instance
  acknowledgments PatientConsentAcknowledgement[]
  artifacts   ConsentArtifact[]
  interactions ConsentInteraction[]
  revocationEvent DomainEvent? @relation("ConsentRevocationEvent", fields: [revocationEventId], references: [id])
  
  @@index([instanceNumber])
  @@index([templateId])
  @@index([patientId])
  @@index([status])
  @@index([procedurePlanId])
  @@index([consultationId])
  @@map("patient_consent_instances")
}
```

**Key Changes:**
- ✅ Removed: `signedBy`, `clinicianSignedBy`, `witnessedBy` (moved to ConsentSignature)
- ✅ Added: `procedurePlanId` relation
- ✅ Added: `signatures[]` relation
- ✅ Status: `PENDING_SIGNATURES` (some parties signed, waiting for others)

---

## Part 3: Preserving Exact Document Wording

### The Challenge

**Requirement:** Preserve exact wording of uploaded consent documents.

**Problem:** We have structured sections (for digital display), but need original document text.

### Solution: Two-Level Storage

**Level 1: Structured Sections** (for digital UX)
- `ConsentSection.content` - Structured, editable content
- Used for step-by-step display, understanding checks

**Level 2: Original Document** (for legal preservation)
- `ConsentTemplate.originalDocumentPath` - Original uploaded PDF
- `ConsentArtifact` - Generated signed PDF (immutable)

**Level 3: Document Content Snapshot** (NEW - preserves exact text)

```prisma
// Snapshot of exact document content at time consent was signed
model ConsentDocumentSnapshot {
  id          String   @id @default(uuid()) @db.Uuid
  instanceId  String   @db.Uuid
  templateId  String   @db.Uuid // Template used
  
  // Full document text (exact wording as signed)
  fullDocumentText String @db.Text // Entire consent text as it appeared
  
  // Section snapshots (preserve exact section text)
  sectionSnapshots Json? // Array of {sectionCode, exactText, order}
  // Example: [
  //   {sectionCode: "RISKS", exactText: "The risks include...", order: 1},
  //   {sectionCode: "ALTERNATIVES", exactText: "Alternatives include...", order: 2}
  // ]
  
  // Original template version
  templateVersion String @db.VarChar(50)
  
  // When this snapshot was created (at signing)
  snapshottedAt DateTime @default(now()) @db.Timestamptz(6)
  
  // Relations
  instance    PatientConsentInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)
  template    ConsentTemplate @relation(fields: [templateId], references: [id])
  
  @@index([instanceId])
  @@index([templateId])
  @@map("consent_document_snapshots")
}
```

**Why this exists:**
- **Legal requirement:** Court needs to see EXACT text patient signed
- **Version safety:** If template changes later, we preserve what was signed
- **Immutable:** Created once at signing, never modified

**Note:** `fullDocumentText` is TEXT (not JSON) - preserves exact wording. Section snapshots are JSON for queryability, but full text is primary.

---

## Part 4: Version History & Audit

### Version History Model

```prisma
// Version history of consent instances (for re-consent tracking)
model ConsentVersionHistory {
  id          String   @id @default(uuid()) @db.Uuid
  instanceId  String   @db.Uuid
  
  // Version details
  versionNumber Int    @db.Integer // 1, 2, 3...
  previousInstanceId String? @db.Uuid // Previous consent instance
  
  // What changed
  changeReason String? @db.Text // Why re-consent was needed
  changesSummary String? @db.Text // Summary of changes
  
  // When
  versionCreatedAt DateTime @default(now()) @db.Timestamptz(6)
  
  // Relations
  instance    PatientConsentInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)
  previousInstance PatientConsentInstance? @relation("ConsentVersionHistoryPrevious", fields: [previousInstanceId], references: [id])
  
  @@index([instanceId])
  @@index([previousInstanceId])
  @@map("consent_version_history")
}
```

**Why this exists:**
- Track re-consents: If patient needs to re-sign (plan changed), we track versions
- Link previous consent to new consent
- Audit trail: Why was re-consent needed?

---

## Part 5: Integration with Procedures

### How Consents Link to Procedures

**General Consent:**
- Links to: `Consultation` (first visit)
- Applies to: All future procedures
- Status: One-time sign, stays active

**Procedure-Specific Consent:**
- Links to: `ProcedurePlan` → `SurgicalCase`
- Applies to: One specific procedure
- Status: Required before surgery, can be procedure-specific

### Procedure Plan Model (Referenced but Not Created Yet)

```prisma
// This will be created in procedure planning module
model ProcedurePlan {
  id          String   @id @default(uuid()) @db.Uuid
  patientId   String   @db.Uuid
  consultationId String? @db.Uuid
  procedureName String @db.VarChar(500)
  procedureCode String? @db.VarChar(50) // CPT code
  
  // ... other fields ...
  
  // Relations
  patient     Patient  @relation(fields: [patientId], references: [id])
  consultation Consultation? @relation(fields: [consultationId], references: [id])
  consentInstance PatientConsentInstance? // One consent per plan
  
  @@index([patientId])
  @@index([consultationId])
  @@map("procedure_plans")
}
```

**Workflow Integration:**
```
1. Consultation → Procedure Plan Created
2. System checks: Does procedure need consent? (by CPT code)
3. System creates: PatientConsentInstance linked to ProcedurePlan
4. Patient signs: Consent
5. Surgical Case scheduled: Requires signed consent
6. Pre-op check: Verify consent.status = SIGNED
```

---

## Part 6: Complete Schema Summary

### Models Overview

1. **ConsentTemplate** - Master templates (General + Procedure-specific)
2. **ConsentTemplateRequiredParty** - Dynamic party requirements per template
3. **ConsentSection** - Structured sections (for digital display)
4. **ConsentClause** - Granular clauses within sections
5. **PatientConsentInstance** - Patient-specific consent instance
6. **ConsentSignature** - Individual signatures by each party
7. **ConsentDocumentSnapshot** - Exact wording preservation
8. **ConsentVersionHistory** - Re-consent version tracking
9. **PatientConsentAcknowledgement** - Section/clause acknowledgments
10. **ConsentArtifact** - Signed PDF artifacts
11. **ConsentInteraction** - Complete audit trail

### Key Design Decisions

**✅ Dynamic Parties:** Not hardcoded, configured per template
**✅ Exact Wording:** Full document text preserved (not just JSON)
**✅ Version History:** Track re-consents and changes
**✅ Procedure Integration:** Links to ProcedurePlan and SurgicalCase
**✅ Immutable Signatures:** Once signed, cannot be modified
**✅ Complete Audit:** Every interaction logged

---

## Next: Implementation Steps

1. **Enhance ConsentTemplate** - Add templateType, originalDocumentPath
2. **Create ConsentTemplateRequiredParty** - Dynamic parties
3. **Create ConsentSignature** - Replace hardcoded signature fields
4. **Create ConsentDocumentSnapshot** - Preserve exact wording
5. **Create ConsentVersionHistory** - Version tracking
6. **Update PatientConsentInstance** - Remove hardcoded fields, add relations
7. **Create ProcedurePlan model** (separate module)

Should I proceed with implementing these schema changes step-by-step?









