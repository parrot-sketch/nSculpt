# Digital Consent System Design - Aesthetic Surgery EHR

## Executive Summary

This document designs a **legally defensible, patient-friendly digital consent system** for aesthetic surgery that goes beyond PDF uploads. The system ensures patient understanding, provides complete audit trails, and integrates seamlessly with the EHR workflow.

---

## 1. Design Principles

### 1.1 Legal Defensibility
- ✅ Complete audit trail (who, what, when, why)
- ✅ Version control (which version was signed)
- ✅ Understanding checks (not just signatures)
- ✅ Time-stamped interactions
- ✅ Immutable records after signing

### 1.2 Patient Understanding
- ✅ Structured sections (not walls of text)
- ✅ Plain language (8th grade reading level)
- ✅ Progress indicators
- ✅ Understanding checkpoints
- ✅ Ability to ask questions before signing

### 1.3 Clinical Support
- ✅ Links to procedures and consultations
- ✅ Pre-op checklist integration
- ✅ Alerts for missing/expired consent
- ✅ Re-consent workflow for plan changes
- ✅ Multi-language support

---

## 2. Schema Design

### 2.1 Consent Template (Master Template)

```prisma
model ConsentTemplate {
  id          String   @id @default(uuid()) @db.Uuid
  templateCode String  @unique @db.VarChar(100) // e.g., "BREAST_AUG_CONSENT_V2"
  name        String   @db.VarChar(500) // "Breast Augmentation - Informed Consent"
  description String?  @db.Text
  
  // Template scope
  procedureType String @db.VarChar(50) // COSMETIC, RECONSTRUCTIVE, HYBRID
  applicableCPTCodes String[] // CPT codes this template applies to
  
  // Versioning
  version     String   @db.VarChar(20) // "1.0", "2.0", etc.
  isActive    Boolean  @default(true)
  effectiveDate DateTime @default(now()) @db.Date
  expirationDate DateTime? @db.Date
  
  // Legal
  legalReviewDate DateTime? @db.Date
  reviewedBy String? @db.Uuid // Legal/compliance team member
  
  // Sections (ordered)
  sections    ConsentSection[]
  
  // Instances created from this template
  instances   PatientConsentInstance[]
  
  createdAt   DateTime @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime @updatedAt @db.Timestamptz(6)
  createdBy   String?  @db.Uuid
  version     Int      @default(1)
  
  @@index([templateCode])
  @@index([procedureType])
  @@index([isActive])
  @@map("consent_templates")
}
```

### 2.2 Consent Section (Structured Content)

```prisma
model ConsentSection {
  id          String   @id @default(uuid()) @db.Uuid
  templateId  String   @db.Uuid
  sectionCode String   @db.VarChar(50) // "PROCEDURE_EXPLANATION", "RISKS", etc.
  title       String   @db.VarChar(500)
  order       Int      @db.Integer // Display order (1, 2, 3...)
  
  // Content
  content     String   @db.Text // Structured content (markdown or HTML)
  plainLanguageContent String? @db.Text // Simplified version
  
  // Understanding check
  requiresAcknowledgment Boolean @default(false)
  acknowledgmentPrompt String? @db.VarChar(500) // "Do you understand that results cannot be guaranteed?"
  
  // Display
  isExpandable Boolean @default(false) // Can be collapsed/expanded
  showTooltip  Boolean @default(false) // Show help tooltip
  
  // Relations
  template    ConsentTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  acknowledgements ConsentSectionAcknowledgement[]
  
  createdAt   DateTime @default(now()) @db.Timestamptz(6)
  version     Int      @default(1)
  
  @@index([templateId])
  @@index([order])
  @@map("consent_sections")
}
```

### 2.3 Patient Consent Instance (Patient-Specific)

```prisma
model PatientConsentInstance {
  id          String   @id @default(uuid()) @db.Uuid
  patientId    String   @db.Uuid
  templateId  String   @db.Uuid
  
  // Context
  consultationId String? @db.Uuid
  procedurePlanId String? @db.Uuid
  caseId      String?  @db.Uuid // Surgical case
  
  // Status
  status      ConsentStatus @default(DRAFT)
  // DRAFT, IN_PROGRESS, SIGNED, EXPIRED, WITHDRAWN, SUPERSEDED
  
  // Version tracking
  templateVersion String @db.VarChar(20) // Which template version was used
  signedVersion String? @db.VarChar(20) // Version at time of signing
  
  // Signatures
  patientSignedAt DateTime? @db.Timestamptz(6)
  patientSignedBy String?  @db.Uuid // Patient user ID
  clinicianSignedAt DateTime? @db.Timestamptz(6)
  clinicianSignedBy String?  @db.Uuid // Surgeon/doctor
  witnessSignedAt DateTime? @db.Timestamptz(6)
  witnessSignedBy String?  @db.Uuid // Witness/nurse
  
  // Understanding checks
  understandingChecksPassed Boolean @default(false)
  questionsRaised Boolean @default(false) // Patient flagged questions
  
  // Language
  language    String   @default("en") @db.VarChar(10)
  translated  Boolean  @default(false)
  
  // Expiration
  expiresAt   DateTime? @db.Timestamptz(6) // If consent expires
  validUntil  DateTime? @db.Date // Procedure must occur before this date
  
  // Re-consent
  supersededBy String? @db.Uuid // If this consent was replaced
  supersedesId String? @db.Uuid // Previous consent this replaces
  
  // Relations
  patient     Patient  @relation(fields: [patientId], references: [id], onDelete: Restrict)
  template    ConsentTemplate @relation(fields: [templateId], references: [id])
  consultation Consultation? @relation(fields: [consultationId], references: [id])
  procedurePlan ProcedurePlan? @relation(fields: [procedurePlanId], references: [id])
  case        SurgicalCase? @relation(fields: [caseId], references: [id])
  
  sections    ConsentSectionAcknowledgement[]
  interactions ConsentInteraction[]
  artifacts   ConsentArtifact[]
  
  createdAt   DateTime @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime @updatedAt @db.Timestamptz(6)
  version     Int      @default(1)
  
  @@index([patientId])
  @@index([templateId])
  @@index([consultationId])
  @@index([caseId])
  @@index([status])
  @@index([patientSignedAt])
  @@map("patient_consent_instances")
}

enum ConsentStatus {
  DRAFT
  IN_PROGRESS
  SIGNED
  EXPIRED
  WITHDRAWN
  SUPERSEDED
}
```

### 2.4 Section Acknowledgement (Understanding Checks)

```prisma
model ConsentSectionAcknowledgement {
  id          String   @id @default(uuid()) @db.Uuid
  instanceId  String   @db.Uuid
  sectionId   String   @db.Uuid
  
  // Acknowledgment
  acknowledged Boolean @default(false)
  acknowledgedAt DateTime? @db.Timestamptz(6)
  acknowledgedBy String?  @db.Uuid // Patient user ID
  
  // Understanding check
  understandingCheckPassed Boolean @default(false)
  understandingResponse String? @db.VarChar(50) // "YES", "NEED_DISCUSSION", "NO"
  discussionRequired Boolean @default(false)
  discussionCompleted Boolean @default(false)
  discussedWith String? @db.Uuid // Clinician who discussed
  
  // Time tracking
  timeSpentSeconds Int? @db.Integer // How long patient spent on section
  scrollDepth Int? @db.Integer // Percentage of content scrolled (0-100)
  
  // Relations
  instance    PatientConsentInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)
  section     ConsentSection @relation(fields: [sectionId], references: [id])
  
  createdAt   DateTime @default(now()) @db.Timestamptz(6)
  version     Int      @default(1)
  
  @@unique([instanceId, sectionId])
  @@index([instanceId])
  @@index([sectionId])
  @@map("consent_section_acknowledgements")
}
```

### 2.5 Consent Interaction (Audit Trail)

```prisma
model ConsentInteraction {
  id          String   @id @default(uuid()) @db.Uuid
  instanceId  String   @db.Uuid
  
  // Interaction details
  interactionType String @db.VarChar(50) 
  // VIEWED_SECTION, ACKNOWLEDGED_SECTION, ASKED_QUESTION, 
  // REQUESTED_CLARIFICATION, SIGNED, WITHDRAWN, UPDATED
  
  sectionId   String?  @db.Uuid // Which section (if applicable)
  
  // User
  userId      String   @db.Uuid // Who performed action
  userRole    String   @db.VarChar(50) // PATIENT, SURGEON, NURSE, etc.
  
  // Details
  details     Json?    // Additional context (questions asked, etc.)
  ipAddress   String?  @db.VarChar(50)
  userAgent   String?  @db.VarChar(500)
  deviceType  String?  @db.VarChar(50) // TABLET, PHONE, DESKTOP
  
  // Timestamp
  occurredAt  DateTime @default(now()) @db.Timestamptz(6)
  
  // Relations
  instance    PatientConsentInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)
  
  @@index([instanceId])
  @@index([userId])
  @@index([interactionType])
  @@index([occurredAt])
  @@map("consent_interactions")
}
```

### 2.6 Enhanced Consent Artifact (Signed PDF + Evidence)

```prisma
model ConsentArtifact {
  id          String   @id @default(uuid()) @db.Uuid
  instanceId  String   @db.Uuid
  
  // Artifact type
  artifactType String  @db.VarChar(50) 
  // SIGNED_PDF, SCREENSHOT, VIDEO_RECORDING, AUDIO_RECORDING
  
  // File storage
  fileName    String   @db.VarChar(500)
  filePath    String   @db.VarChar(1000)
  fileSize    BigInt   @db.BigInt
  mimeType    String   @db.VarChar(100)
  
  // Integrity
  fileHash    String   @db.VarChar(64) // SHA-256
  checksumVerifiedAt DateTime? @db.Timestamptz(6)
  
  // Content
  content     Json?    // Structured data (signatures, timestamps, etc.)
  
  // Metadata
  generatedAt DateTime @default(now()) @db.Timestamptz(6)
  generatedBy String   @db.Uuid
  description String?  @db.Text
  
  // Relations
  instance    PatientConsentInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)
  
  @@index([instanceId])
  @@index([fileHash])
  @@index([generatedAt])
  @@map("consent_artifacts")
}
```

---

## 3. Workflow Design

### 3.1 Consent Creation Flow

```
1. CONSULTATION → Procedure Plan Created
   ↓
2. SYSTEM: Determine Required Consent Template
   ├─> Match CPT code to ConsentTemplate
   ├─> Check if patient has active consent
   └─> Create PatientConsentInstance (status: DRAFT)
   ↓
3. CLINICIAN: Review Consent with Patient
   ├─> Open consent instance
   ├─> Log interaction: VIEWED_SECTION
   └─> Guide patient through sections
   ↓
4. PATIENT: Review Sections
   ├─> View section 1 → Log: VIEWED_SECTION
   ├─> Acknowledge section 1 → Log: ACKNOWLEDGED_SECTION
   ├─> Understanding check → Log: UNDERSTANDING_CHECK
   └─> Repeat for all sections
   ↓
5. PATIENT: Ask Questions (if needed)
   ├─> Flag section → Log: REQUESTED_CLARIFICATION
   ├─> CLINICIAN: Discuss → Log: DISCUSSION_COMPLETED
   └─> Patient acknowledges after discussion
   ↓
6. SIGNATURES
   ├─> Patient signs → Log: SIGNED (patient)
   ├─> Clinician signs → Log: SIGNED (clinician)
   └─> Witness signs (if required) → Log: SIGNED (witness)
   ↓
7. FINALIZATION
   ├─> Status: SIGNED
   ├─> Generate signed PDF artifact
   ├─> Store hash for integrity
   └─> Link to SurgicalCase
```

### 3.2 Re-Consent Flow (Plan Changes)

```
1. PROCEDURE PLAN UPDATED
   ↓
2. SYSTEM: Check if consent needs update
   ├─> Compare new plan to signed consent
   └─> If significant changes → Flag: NEEDS_RE_CONSENT
   ↓
3. CREATE NEW CONSENT INSTANCE
   ├─> Link to previous: supersedesId
   ├─> Mark previous: SUPERSEDED
   └─> Status: DRAFT
   ↓
4. PATIENT: Review Updated Sections
   ├─> Highlight what changed
   └─> Re-sign updated sections
   ↓
5. SIGN NEW CONSENT
   └─> Previous consent remains in history
```

### 3.3 Pre-Op Checklist Integration

```
PRE-OP CHECKLIST:
├─> [ ] Consent signed and verified
│   ├─> Check: PatientConsentInstance.status = SIGNED
│   ├─> Check: Valid for procedure (not expired)
│   └─> Check: Matches current procedure plan
├─> [ ] Understanding checks passed
├─> [ ] All sections acknowledged
└─> [ ] Signed PDF artifact generated
```

---

## 4. Section Structure for Aesthetic Surgery

### 4.1 Standard Sections

**Section 1: Procedure Explanation**
- What the procedure does
- What it cannot guarantee
- Expected outcomes
- Recovery timeline

**Section 2: Benefits & Limitations**
- Potential benefits
- Limitations and realistic expectations
- What results cannot be guaranteed

**Section 3: Risks & Complications**
- Common risks
- Serious but rare risks
- Anesthesia risks
- Individual risk factors

**Section 4: Alternatives**
- Alternative procedures
- Non-surgical options
- Option to do nothing

**Section 5: Responsibilities**
- Pre-op requirements
- Post-op care
- Follow-up appointments
- What to do if problems arise

**Section 6: Photos & Data**
- Clinical photography consent
- Use for medical records
- Use for teaching (optional)
- Marketing use (explicit opt-in)

**Section 7: Privacy & Records**
- How records are stored
- Who can access
- Patient rights

**Section 8: Final Acknowledgment**
- Patient confirms understanding
- Time to ask questions
- Voluntary participation
- Signature

### 4.2 Understanding Check Examples

**For Section 1 (Procedure Explanation):**
```
"Do you understand that this procedure cannot guarantee specific results?"
☐ Yes, I understand
☐ I want to discuss this more
```

**For Section 3 (Risks):**
```
"Do you understand that all surgery carries risks, including serious complications?"
☐ Yes, I understand
☐ I want to discuss this more
```

**For Section 6 (Photos):**
```
"Do you consent to clinical photography for your medical record?"
☐ Yes
☐ No
```

---

## 5. API Design

### 5.1 Consent Instance Management

```typescript
// Create consent instance from procedure plan
POST /api/v1/consents/instances
{
  "patientId": "...",
  "procedurePlanId": "...",
  "consultationId": "...",
  "templateCode": "BREAST_AUG_CONSENT_V2"
}

// Get consent instance
GET /api/v1/consents/instances/:id

// Get consent for patient/procedure
GET /api/v1/consents/instances?patientId=...&procedurePlanId=...

// Update consent status
PATCH /api/v1/consents/instances/:id/status
{
  "status": "IN_PROGRESS"
}
```

### 5.2 Section Interaction

```typescript
// Acknowledge section
POST /api/v1/consents/instances/:id/sections/:sectionId/acknowledge
{
  "acknowledged": true,
  "understandingCheckPassed": true,
  "understandingResponse": "YES"
}

// Request clarification
POST /api/v1/consents/instances/:id/sections/:sectionId/clarification
{
  "question": "Can you explain the risk of capsular contracture?",
  "discussionRequired": true
}

// Complete discussion
POST /api/v1/consents/instances/:id/sections/:sectionId/discussion-complete
{
  "discussedWith": "...", // clinician ID
  "discussionNotes": "..."
}
```

### 5.3 Signing

```typescript
// Patient signs
POST /api/v1/consents/instances/:id/sign/patient
{
  "signatureData": "...", // Base64 signature image or digital signature
  "signedAt": "2024-01-15T10:30:00Z"
}

// Clinician signs
POST /api/v1/consents/instances/:id/sign/clinician
{
  "clinicianId": "...",
  "signatureData": "..."
}

// Witness signs (if required)
POST /api/v1/consents/instances/:id/sign/witness
{
  "witnessId": "...",
  "signatureData": "..."
}
```

### 5.4 Artifact Generation

```typescript
// Generate signed PDF
POST /api/v1/consents/instances/:id/generate-pdf

// Get consent artifact
GET /api/v1/consents/instances/:id/artifacts/:artifactId
```

---

## 6. Integration Points

### 6.1 Consultation Module
- Create consent instance during consultation
- Link to consultation record
- Track consent status in consultation workflow

### 6.2 Procedure Planning
- Auto-select consent template based on CPT code
- Validate consent before procedure approval
- Re-consent if procedure plan changes

### 6.3 Surgical Case
- Require signed consent before scheduling
- Link consent to surgical case
- Pre-op checklist validation

### 6.4 Patient Module
- Consent history in patient profile
- Photo consent tracking
- Marketing consent management

---

## 7. Legal Defensibility Features

### 7.1 Complete Audit Trail
- Every interaction logged with timestamp
- User identification (who did what)
- IP address and device tracking
- Immutable records after signing

### 7.2 Version Control
- Template versioning
- Track which version was signed
- History of all versions

### 7.3 Understanding Evidence
- Time spent on each section
- Scroll depth tracking
- Understanding check responses
- Discussion logs

### 7.4 Integrity Protection
- SHA-256 hashes for all artifacts
- Checksum verification
- Immutable records
- Tamper-evident design

---

## 8. Implementation Phases

### Phase 1: Core Schema & Templates
1. Create ConsentTemplate and ConsentSection models
2. Build template management (CRUD)
3. Create section content structure
4. Version control system

### Phase 2: Instance Management
1. Create PatientConsentInstance workflow
2. Section acknowledgment system
3. Understanding checks
4. Interaction logging

### Phase 3: Signing & Artifacts
1. Digital signature capture
2. PDF generation
3. Artifact storage
4. Integrity verification

### Phase 4: Integration
1. Consultation integration
2. Procedure plan integration
3. Pre-op checklist
4. Alerts and notifications

### Phase 5: Advanced Features
1. Multi-language support
2. Accessibility features
3. Analytics and insights
4. Re-consent automation

---

## 9. Key Validation Rules

### 9.1 Before Signing
- ✅ All sections viewed
- ✅ All required sections acknowledged
- ✅ All understanding checks passed (or discussed)
- ✅ Patient had opportunity to ask questions

### 9.2 Before Surgery
- ✅ Consent status = SIGNED
- ✅ Consent not expired
- ✅ Consent matches current procedure plan
- ✅ Signed PDF artifact exists
- ✅ All required signatures present

### 9.3 Re-Consent Triggers
- Procedure plan significantly changed
- New risks identified
- Patient condition changed
- Template updated (major changes)

---

## 10. Next Steps

1. **Review Schema Design** - Validate with legal/compliance
2. **Create Migrations** - Implement schema changes
3. **Build Services** - Consent management services
4. **Design UI/UX** - Patient-facing consent interface
5. **Integration** - Connect to existing modules
6. **Testing** - Legal review and user testing









