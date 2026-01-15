# Consent Engine - Enterprise Design Document

## Overview

This document outlines the enterprise-grade consent engine design to support comprehensive, word-for-word digitization of NSAC consent forms while maintaining legal defensibility, auditability, and user experience.

---

## Requirements Analysis

### Document Characteristics

#### 1. General Consent (19 sections)
- Fixed content with blank fill-ins
- Multiple signature parties (Patient, Witness, Surgeon, Anesthesiologist)
- Initial checkpoints on each page
- Page-level structure

#### 2. Botox Consent
- Procedure-specific content
- Treatment tracking table (structured data)
- Lot numbers, expiration dates, units per site
- Single practitioner signature

#### 3. Aesthetic Procedures Consent (Most Comprehensive)
- Fill-in sections:
  - Procedure name: `_________________________`
  - Alternative treatments (3 lines)
  - Specific risks (3 sections)
  - Surgeon name: `Dr. _______________________________`
- Detailed risk sections (Seroma, Bleeding, Infection, etc.)
- CAPRINI Risk Assessment (clinical data, doctor-filled)
- Page-level initial checkpoints
- Multiple signature parties
- 11 authorization points

### Critical Requirements

1. **Word-for-Word Preservation**
   - Exact text capture at time of signing
   - Immutable snapshots
   - Version control

2. **Dynamic Fill-In Fields**
   - Procedure-specific customization
   - Pre-populate from ProcedurePlan
   - Allow doctor edits

3. **Structured Data Capture**
   - Treatment tracking tables (Botox)
   - CAPRINI risk scores
   - Clinical assessments

4. **Multi-Party Signatures**
   - Patient signs first
   - Surgeon certifies discussion
   - Anesthesiologist signs separately
   - Witness (optional)

5. **Page-Level Tracking**
   - Initial each page
   - Track which pages viewed/acknowledged
   - Enforce sequential review

6. **Understanding Checks**
   - Verify comprehension
   - Track questions asked
   - Discussion logs

---

## Database Schema Enhancements

### Current Schema Analysis

✅ Already Supports:
- Template → Section → Clause hierarchy
- Patient consent instances
- Section/clause acknowledgments
- Signatures with party types
- Document snapshots
- Version history

⚠️ Needs Enhancement:
- Fill-in/dynamic fields within content
- Structured data (tables, assessments)
- Page-level tracking
- Initial checkpoints
- Multi-part signature workflows

### Proposed Schema Additions

```prisma
// NEW: Fill-in fields within consent content
model ConsentFillInField {
  id          String   @id @default(uuid()) @db.Uuid
  templateId  String?  @db.Uuid // Template-level defaults
  sectionId   String?  @db.Uuid // Section-level field
  clauseId    String?  @db.Uuid // Clause-level field
  
  fieldCode   String   @db.VarChar(100) // e.g., "PROCEDURE_NAME", "SURGEON_NAME"
  fieldType   String   @db.VarChar(50)  // TEXT, DATE, NUMBER, SELECT
  label       String   @db.VarChar(500)
  placeholder String?  @db.VarChar(500)
  defaultValue String? @db.Text // Template default
  required    Boolean  @default(false)
  order       Int      @db.Integer
  
  // For SELECT type
  options     String[] // Available options
  
  // Position in content (for rendering)
  contentMarker String @db.VarChar(200) // e.g., "___PROCEDURE_NAME___"
  
  createdAt   DateTime @default(now()) @db.Timestamptz(6)
  version     Int      @default(1)
  
  // Relations
  template    ConsentTemplate? @relation(fields: [templateId], references: [id])
  section     ConsentSection?  @relation(fields: [sectionId], references: [id])
  clause      ConsentClause?   @relation(fields: [clauseId], references: [id])
  instanceValues ConsentFillInValue[]
  
  @@index([templateId])
  @@index([sectionId])
  @@index([clauseId])
  @@index([fieldCode])
  @@map("consent_fill_in_fields")
}

// Values filled in for a specific consent instance
model ConsentFillInValue {
  id          String   @id @default(uuid()) @db.Uuid
  instanceId  String   @db.Uuid
  fieldId     String   @db.Uuid
  
  value       String   @db.Text // The filled-in value
  filledBy    String   @db.Uuid // User who filled it (doctor/admin)
  filledAt    DateTime @default(now()) @db.Timestamptz(6)
  
  // Relations
  instance    PatientConsentInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)
  field       ConsentFillInField     @relation(fields: [fieldId], references: [id])
  
  @@unique([instanceId, fieldId]) // One value per field per instance
  @@index([instanceId])
  @@index([fieldId])
  @@map("consent_fill_in_values")
}

// NEW: Structured data tables (for Botox tracking, CAPRINI, etc.)
model ConsentStructuredData {
  id          String   @id @default(uuid()) @db.Uuid
  instanceId  String   @db.Uuid
  dataType    String   @db.VarChar(100) // "BOTOX_TRACKING", "CAPRINI_ASSESSMENT", etc.
  schema      String   @db.Text // JSON schema definition
  data        String   @db.Text // JSON data
  
  // Who created/filled this
  createdBy   String   @db.Uuid
  updatedBy   String?  @db.Uuid
  createdAt   DateTime @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime @updatedAt @db.Timestamptz(6)
  version     Int      @default(1)
  
  // Relations
  instance    PatientConsentInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)
  
  @@unique([instanceId, dataType]) // One structured data per type per instance
  @@index([instanceId])
  @@index([dataType])
  @@map("consent_structured_data")
}

// NEW: Page-level tracking
model ConsentPage {
  id          String   @id @default(uuid()) @db.Uuid
  templateId  String   @db.Uuid
  
  pageNumber  Int      @db.Integer // 1, 2, 3...
  title       String?  @db.VarChar(500)
  content     String   @db.Text // Full page content (markdown/HTML)
  
  // Which sections/clauses are on this page
  sectionIds  String[] // Array of section IDs
  clauseIds   String[] // Array of clause IDs
  
  requiresInitials Boolean @default(true) // Does this page need patient initials?
  
  order       Int      @db.Integer // Display order
  
  createdAt   DateTime @default(now()) @db.Timestamptz(6)
  version     Int      @default(1)
  
  // Relations
  template    ConsentTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  acknowledgments ConsentPageAcknowledgement[]
  
  @@index([templateId])
  @@index([pageNumber])
  @@map("consent_pages")
}

// Page-level acknowledgments (initials)
model ConsentPageAcknowledgement {
  id          String   @id @default(uuid()) @db.Uuid
  instanceId  String   @db.Uuid
  pageId      String   @db.Uuid
  
  acknowledgedBy String @db.Uuid // Patient
  acknowledgedAt DateTime @default(now()) @db.Timestamptz(6)
  
  // Digital initials (signature image/data)
  initialsData String? @db.Text // Base64 signature
  
  // Relations
  instance    PatientConsentInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)
  page        ConsentPage @relation(fields: [pageId], references: [id])
  
  @@unique([instanceId, pageId]) // One acknowledgment per page per instance
  @@index([instanceId])
  @@index([pageId])
  @@map("consent_page_acknowledgements")
}

// ENHANCED: Add fill-in support to existing models
// Add to ConsentTemplate:
//   fillInFields ConsentFillInField[] @relation("TemplateFillInFields")
//   pages        ConsentPage[]
//   structuredDataSchemas String[] // Available structured data types

// Add to ConsentSection:
//   fillInFields ConsentFillInField[] @relation("SectionFillInFields")
//   pages        ConsentPage[] // Which pages this section appears on

// Add to ConsentClause:
//   fillInFields ConsentFillInField[] @relation("ClauseFillInFields")

// Add to PatientConsentInstance:
//   fillInValues ConsentFillInValue[]
//   structuredData ConsentStructuredData[]
//   pageAcknowledgments ConsentPageAcknowledgement[]
```

---

## Content Storage Strategy

### Approach: Hybrid Content Storage

**1. Template Content (Base)**
- Stored as structured sections/clauses in database
- Supports markdown/HTML formatting
- Fill-in markers: `___FIELD_CODE___` or `{{FIELD_CODE}}`

**2. Instance Content (Filled)**
- Generated at instance creation time
- Fill-in markers replaced with actual values
- Stored in `ConsentDocumentSnapshot.fullDocumentText`
- Used for signing and PDF generation

**3. Page Rendering**
- Pages assembled from sections/clauses
- Fill-in values injected
- Structured data rendered as tables
- Final content served to signing interface

### Content Markup Example

```markdown
## PROCEDURE AUTHORIZATION

I authorize the performance of the following operation / surgical procedure(s) 
to be performed upon ___PATIENT_NAME___ by or under the direction of 
Dr. ___SURGEON_NAME___.

## SPECIFIC RISKS

1. ___SPECIFIC_RISK_1___
2. ___SPECIFIC_RISK_2___
3. ___SPECIFIC_RISK_3___
```

---

## Structured Data Schemas

### Botox Treatment Tracking Schema

```json
{
  "type": "BOTOX_TRACKING",
  "schema": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "location": { "type": "string" },
        "botoxLotNumber": { "type": "string" },
        "botoxExpirationDate": { "type": "string", "format": "date" },
        "unitsPerSite": { "type": "number" },
        "totalUnits": { "type": "number" }
      },
      "required": ["location", "botoxLotNumber", "unitsPerSite"]
    }
  },
  "data": [
    {
      "location": "Forehead",
      "botoxLotNumber": "BOT12345",
      "botoxExpirationDate": "2025-12-31",
      "unitsPerSite": 20,
      "totalUnits": 20
    }
  ]
}
```

### CAPRINI Risk Assessment Schema

```json
{
  "type": "CAPRINI_ASSESSMENT",
  "schema": {
    "type": "object",
    "properties": {
      "onePoint": { "type": "array", "items": { "type": "string" } },
      "twoPoints": { "type": "array", "items": { "type": "string" } },
      "threePoints": { "type": "array", "items": { "type": "string" } },
      "fivePoints": { "type": "array", "items": { "type": "string" } },
      "onePointSubtotal": { "type": "number" },
      "twoPointsSubtotal": { "type": "number" },
      "threePointsSubtotal": { "type": "number" },
      "fivePointsSubtotal": { "type": "number" },
      "totalScore": { "type": "number" },
      "assessedBy": { "type": "string" },
      "assessedAt": { "type": "string", "format": "date-time" }
    }
  },
  "data": {
    "onePoint": ["Age 41–60 years", "BMI >25 kg/m2"],
    "twoPoints": ["Major open surgery (>45 minutes)"],
    "threePoints": [],
    "fivePoints": [],
    "onePointSubtotal": 2,
    "twoPointsSubtotal": 2,
    "threePointsSubtotal": 0,
    "fivePointsSubtotal": 0,
    "totalScore": 4,
    "assessedBy": "Dr. Smith",
    "assessedAt": "2025-01-03T10:00:00Z"
  }
}
```

---

## Workflow Design

### Phase 1: Template Creation (Admin)

```
1. Upload PDF consent document
2. System extracts text (OCR if needed)
3. Admin structures content:
   a. Break into pages
   b. Break into sections
   c. Identify clauses
   d. Mark fill-in fields
   e. Define structured data requirements
4. Save as ConsentTemplate
```

### Phase 2: Instance Creation (Doctor/Admin)

```
1. From ProcedurePlan: Click "Create Consent"
2. System finds template by CPT code (or manual selection)
3. Pre-populate fill-in fields:
   - Patient name from Patient
   - Procedure name from ProcedurePlan
   - Surgeon name from User
   - CPT code from ProcedurePlan
4. Doctor reviews and edits:
   - Add specific risks
   - Add alternative treatments
   - Review all fields
5. System creates PatientConsentInstance (status: DRAFT)
```

### Phase 3: Patient Review & Signing

```
1. Open consent instance
2. Page-by-page review:
   a. Display page content
   b. Patient scrolls to bottom (tracked)
   c. Patient provides initials (digital signature)
   d. Progress to next page
3. Section acknowledgments:
   a. For each section/clause
   b. Check "I understand"
   c. Pass understanding check (if required)
4. Complete all pages
5. Final signature:
   a. Patient signs
   b. Surgeon signs (certifies discussion)
   c. Anesthesiologist signs (if applicable)
   d. Witness signs (if required)
6. Generate snapshot and PDF
```

### Phase 4: Post-Signature

```
1. Create ConsentDocumentSnapshot (full text with values)
2. Generate signed PDF artifact
3. Update status to SIGNED
4. Link to ProcedurePlan
5. Ready for surgery scheduling
```

---

## API Design

### Template Management

```typescript
// Create template from PDF
POST /api/v1/consent/templates
Body: {
  templateCode: string;
  name: string;
  templateType: 'GENERAL' | 'PROCEDURE_SPECIFIC';
  procedureCode?: string;
  pdfFile: File; // Upload PDF
  // Or structured content
  pages: PageDefinition[];
  sections: SectionDefinition[];
  fillInFields: FillInFieldDefinition[];
}

// Get template with full structure
GET /api/v1/consent/templates/:id
Response: ConsentTemplate with pages, sections, clauses, fillInFields

// Update template (creates new version)
PUT /api/v1/consent/templates/:id
```

### Instance Management

```typescript
// Create instance from template
POST /api/v1/consent/instances
Body: {
  templateId: string;
  patientId: string;
  procedurePlanId?: string;
  consultationId?: string;
  fillInValues: { fieldCode: string; value: string }[];
}

// Get instance with all data
GET /api/v1/consent/instances/:id
Response: {
  instance: PatientConsentInstance;
  template: ConsentTemplate;
  fillInValues: ConsentFillInValue[];
  structuredData: ConsentStructuredData[];
  pages: ConsentPage[];
  sections: ConsentSection[];
  currentPageAcknowledged: boolean;
}

// Fill in structured data (Botox tracking, CAPRINI)
POST /api/v1/consent/instances/:id/structured-data
Body: {
  dataType: 'BOTOX_TRACKING' | 'CAPRINI_ASSESSMENT';
  data: object; // Validated against schema
}

// Acknowledge page (initials)
POST /api/v1/consent/instances/:id/pages/:pageId/acknowledge
Body: {
  initialsData: string; // Base64 signature
}

// Acknowledge section/clause
POST /api/v1/consent/instances/:id/acknowledge
Body: {
  sectionId?: string;
  clauseId?: string;
  understandingCheckPassed: boolean;
  discussionRequired?: boolean;
}

// Sign consent (multi-party)
POST /api/v1/consent/instances/:id/sign
Body: {
  partyType: 'PATIENT' | 'SURGEON' | 'ANESTHESIOLOGIST' | 'WITNESS';
  signatureData: string; // Base64 signature
  signatureMethod: 'DIGITAL' | 'ELECTRONIC';
}
```

---

## Frontend Component Architecture

### Components

```
consent/
├── ConsentTemplateEditor.tsx       // Admin: Create/edit templates
├── ConsentInstanceBuilder.tsx      // Doctor: Create instance from template
├── ConsentSigningFlow.tsx          // Patient: Multi-step signing
│   ├── ConsentPageView.tsx         // Single page display
│   ├── ConsentPageInitials.tsx     // Capture initials per page
│   ├── ConsentSectionView.tsx      // Section content
│   ├── UnderstandingCheck.tsx      // Understanding verification
│   └── DigitalSignature.tsx        // Final signature capture
├── ConsentFillInEditor.tsx         // Edit fill-in fields
├── StructuredDataEditor.tsx        // Botox tracking, CAPRINI
│   ├── BotoxTrackingTable.tsx
│   └── CapriniAssessmentForm.tsx
├── ConsentDocumentViewer.tsx       // View completed consent
└── ConsentPDFGenerator.tsx         // Generate signed PDF
```

---

## Security & Compliance

### Audit Requirements

1. **Immutable Snapshots**
   - Content frozen at signing time
   - Hash verification
   - Version tracking

2. **Complete Audit Trail**
   - Every page view logged
   - Every acknowledgment timestamped
   - Every signature captured with device/IP
   - Discussion logs preserved

3. **Access Control**
   - RLS on all consent data
   - Role-based access (doctor vs patient)
   - Encryption at rest

4. **Legal Defensibility**
   - Time-stamped signatures
   - Device fingerprinting
   - IP address logging
   - Session recording (optional)

---

## Implementation Phases

### Phase 1: Schema & Backend Foundation
1. Add new models to schema
2. Create migrations
3. Implement repositories
4. Build template parsing service (PDF → structured)

### Phase 2: Template Management
1. Template creation UI
2. Content structuring tools
3. Fill-in field definition
4. Page management

### Phase 3: Instance Creation
1. Instance builder
2. Fill-in field editor
3. Structured data editors
4. Pre-population from ProcedurePlan

### Phase 4: Signing Flow
1. Page-by-page viewer
2. Initials capture
3. Section acknowledgments
4. Understanding checks
5. Multi-party signatures
6. PDF generation

### Phase 5: Integration
1. Link to ProcedurePlan
2. Pre-op validation
3. Surgery scheduling integration

---

## Next Steps

1. ✅ Review and approve design
2. ⏭️ Update Prisma schema with new models
3. ⏭️ Create migrations
4. ⏭️ Build backend services
5. ⏭️ Build frontend components

Ready to proceed with implementation? 🚀









