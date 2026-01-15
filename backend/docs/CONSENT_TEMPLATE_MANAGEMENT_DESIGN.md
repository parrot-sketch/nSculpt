# Consent Template Management - Design Document

## Overview

This document outlines the approach for creating digital consent templates from physical PDF forms, supporting both upload+parse and manual creation workflows.

---

## Problem Statement

**Challenge:** We have 3 physical consent PDFs that need to be digitized word-for-word while maintaining:
- Exact wording preservation
- Fill-in field support
- Structured data (tables, assessments)
- Page-level structure
- Legal defensibility

**Question:** Upload PDFs and parse, or manually recreate?

---

## Recommended Approach: **Hybrid Workflow**

### Strategy: Upload + Manual Structuring

**Why Hybrid?**
1. **PDF Upload** = Preserves original document (legal requirement)
2. **Manual Structuring** = Ensures accuracy and control
3. **Best of Both Worlds** = Reference + Precision

---

## Workflow Design

### Phase 1: Upload & Preserve Original

```
1. Admin uploads PDF consent form
   ↓
2. System stores PDF:
   - originalDocumentPath (file storage)
   - originalDocumentHash (SHA-256 for integrity)
   ↓
3. System extracts text (optional OCR):
   - Raw text extraction
   - Page boundaries detected
   - Used as reference only
   ↓
4. PDF preserved as immutable reference
```

### Phase 2: Manual Structuring (Admin Work)

```
5. Admin opens template builder
   ↓
6. System shows:
   - Uploaded PDF (side-by-side reference)
   - Structured editor (sections/clauses)
   ↓
7. Admin structures content:
   a. Break into pages (match PDF pages)
   b. Create sections (RISKS, ALTERNATIVES, etc.)
   c. Create clauses (individual points)
   d. Mark fill-in fields (___PROCEDURE_NAME___)
   e. Define structured data requirements
   ↓
8. Admin reviews:
   - Compare structured vs. PDF
   - Verify word-for-word accuracy
   - Test fill-in field rendering
   ↓
9. Save as ConsentTemplate
```

### Phase 3: Template Validation

```
10. System validates:
    - All required sections present
    - Fill-in fields properly marked
    - Page structure matches PDF
    - Content matches original (optional diff)
    ↓
11. Template ready for use
```

---

## Implementation Options

### Option A: Full Manual Creation (Recommended for Accuracy)

**Workflow:**
1. Admin uploads PDF (preserved as reference)
2. Admin manually types/structures content
3. System provides PDF viewer side-by-side
4. Admin verifies word-for-word accuracy

**Pros:**
- ✅ 100% accuracy (no OCR errors)
- ✅ Full control over structure
- ✅ Can improve formatting/clarity
- ✅ No parsing complexity

**Cons:**
- ⚠️ More time-consuming
- ⚠️ Requires careful review

**Best For:** Legal documents requiring exact wording

---

### Option B: PDF Parsing + Manual Review

**Workflow:**
1. Admin uploads PDF
2. System parses PDF (OCR + text extraction)
3. System auto-structures (sections, pages)
4. Admin reviews and corrects
5. Admin marks fill-in fields
6. Save template

**Pros:**
- ✅ Faster initial setup
- ✅ Good starting point

**Cons:**
- ⚠️ OCR errors need correction
- ⚠️ Structure may need adjustment
- ⚠️ Requires careful review anyway

**Best For:** Quick prototyping, less critical documents

---

### Option C: Hybrid (Recommended)

**Workflow:**
1. **Upload PDF** → Preserve original
2. **Extract text** → Use as reference only
3. **Manual structuring** → Admin creates structure
4. **Side-by-side comparison** → Verify accuracy
5. **Save template** → With PDF reference

**Pros:**
- ✅ Original preserved (legal requirement)
- ✅ Manual control (accuracy)
- ✅ Reference available (verification)
- ✅ Best of both worlds

**Cons:**
- ⚠️ Still requires manual work
- ⚠️ More complex UI

**Best For:** Production use (recommended)

---

## Recommended Implementation: Option C (Hybrid)

### Template Creation UI Flow

```
┌─────────────────────────────────────────────────────────┐
│  Create Consent Template                                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Step 1: Upload PDF                                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │  [Upload PDF Button]                              │  │
│  │  NSAC_CONSENT_GENERAL.pdf                        │  │
│  │  ✓ Uploaded • SHA-256: abc123...                 │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  Step 2: Basic Information                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Template Code: GENERAL_CONSENT_V1               │  │
│  │  Name: General Surgery Consent                   │  │
│  │  Type: [GENERAL] [PROCEDURE_SPECIFIC]            │  │
│  │  CPT Code: (if procedure-specific)               │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  Step 3: Structure Content                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │  [PDF Viewer]        │  [Structured Editor]      │  │
│  │  ┌──────────────┐    │  ┌────────────────────┐  │  │
│  │  │ Page 1       │    │  │ Pages              │  │  │
│  │  │ [PDF Image]  │    │  │ ├─ Page 1          │  │  │
│  │  │              │    │  │ │  ├─ Section 1    │  │  │
│  │  └──────────────┘    │  │ │  │  ├─ Clause 1 │  │  │
│  │                      │  │ │  │  └─ Clause 2 │  │  │
│  │                      │  │ │  └─ Section 2   │  │  │
│  │                      │  │ └─ Page 2          │  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  Step 4: Mark Fill-in Fields                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Content: "I authorize... upon ___PATIENT___"    │  │
│  │  [Mark as Fill-in] → Creates field               │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  Step 5: Define Structured Data                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  [ ] Botox Treatment Tracking                     │  │
│  │  [ ] CAPRINI Risk Assessment                      │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  Step 6: Review & Save                                  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  [Compare with PDF] [Save Template]              │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Technical Implementation

### 1. PDF Upload Service

```typescript
// services/consent-template-upload.service.ts

@Injectable()
export class ConsentTemplateUploadService {
  /**
   * Upload and process PDF
   */
  async uploadPDF(file: Express.Multer.File): Promise<{
    filePath: string;
    fileHash: string;
    extractedText?: string;
    pageCount: number;
  }> {
    // 1. Save file
    const filePath = await this.saveFile(file);
    
    // 2. Calculate hash
    const fileHash = await this.calculateHash(file.buffer);
    
    // 3. Extract text (optional)
    const extractedText = await this.extractText(file.buffer);
    
    // 4. Get page count
    const pageCount = await this.getPageCount(file.buffer);
    
    return { filePath, fileHash, extractedText, pageCount };
  }

  /**
   * Extract text from PDF (for reference)
   */
  private async extractText(buffer: Buffer): Promise<string> {
    // Use pdf-parse or similar library
    // Returns raw text for reference only
  }

  /**
   * Calculate SHA-256 hash
   */
  private async calculateHash(buffer: Buffer): Promise<string> {
    return createHash('sha256').update(buffer).digest('hex');
  }
}
```

### 2. Template Builder Service

```typescript
// services/consent-template-builder.service.ts

@Injectable()
export class ConsentTemplateBuilderService {
  /**
   * Create template from structured data
   */
  async createTemplate(data: {
    templateCode: string;
    name: string;
    templateType: string;
    originalDocumentPath: string;
    originalDocumentHash: string;
    pages: PageDefinition[];
    sections: SectionDefinition[];
    fillInFields: FillInFieldDefinition[];
    requiredParties: PartyDefinition[];
  }): Promise<ConsentTemplate> {
    // Create template with all structure
  }

  /**
   * Parse PDF for reference (optional)
   */
  async parsePDFForReference(pdfPath: string): Promise<{
    pages: Array<{ pageNumber: number; text: string }>;
    suggestedSections?: string[];
  }> {
    // Extract text per page
    // Suggest section breaks (optional)
  }
}
```

### 3. Template Editor UI Components

```
components/consent/
├── TemplateBuilder.tsx          # Main template builder
├── PDFViewer.tsx                # PDF viewer component
├── StructuredEditor.tsx         # Section/clause editor
├── FillInFieldMarker.tsx        # Mark fill-in fields
├── PageManager.tsx              # Page structure manager
└── TemplatePreview.tsx          # Preview with fill-ins
```

---

## Database Schema Support

### Already Supported ✅

- `ConsentTemplate.originalDocumentPath` - PDF file path
- `ConsentTemplate.originalDocumentHash` - SHA-256 hash
- `ConsentPage` - Page structure
- `ConsentSection` - Section structure
- `ConsentClause` - Clause structure
- `ConsentFillInField` - Fill-in field definitions

**No schema changes needed!** ✅

---

## Recommended Workflow for Your 3 PDFs

### For Each PDF:

#### 1. General Consent (19 sections)
```
1. Upload PDF → Store original
2. Create template: "GENERAL_CONSENT_V1"
3. Manually create 19 sections:
   - Section 1: Authorization
   - Section 2: Independent Contractors
   - Section 3: Explanation
   - ... (all 19)
4. Mark fill-ins:
   - ___PATIENT_NAME___
   - ___SURGEON_NAME___
   - ___PROCEDURE_NAME___
5. Define pages (match PDF pages)
6. Set required parties: PATIENT, SURGEON, WITNESS, ANESTHESIOLOGIST
7. Save template
```

#### 2. Botox Consent
```
1. Upload PDF → Store original
2. Create template: "BOTOX_CONSENT_V1"
3. Link to CPT code (if applicable)
4. Structure sections:
   - Introduction
   - Risks
   - Contraindications
   - Pre-treatment care
   - Post-treatment care
5. Mark fill-in fields
6. Define structured data: BOTOX_TRACKING
7. Set required parties: PATIENT, PRACTITIONER
8. Save template
```

#### 3. Aesthetic Procedures Consent (Most Complex)
```
1. Upload PDF → Store original
2. Create template: "AESTHETIC_PROCEDURES_V1"
3. Structure all sections:
   - Instructions
   - General Information
   - Alternative Treatments (with fill-ins)
   - Inherent Risks
   - Specific Risks (3 fill-in sections)
   - General Risks (detailed)
   - DVT/PE Risks
   - Communication
   - Disclaimer
   - Authorization (11 points)
   - Anesthesia
   - CAPRINI Assessment
4. Mark ALL fill-ins:
   - ___PROCEDURE_NAME___
   - ___SURGEON_NAME___
   - ___SPECIFIC_RISK_1___
   - ___SPECIFIC_RISK_2___
   - ___SPECIFIC_RISK_3___
   - ___ALTERNATIVE_1___
   - ___ALTERNATIVE_2___
   - ___ALTERNATIVE_3___
5. Define structured data: CAPRINI_ASSESSMENT
6. Create pages (match PDF pages with initials)
7. Set required parties: PATIENT, SURGEON, ANESTHESIOLOGIST, WITNESS
8. Save template
```

---

## API Endpoints Needed

### Template Management

```typescript
// Upload PDF
POST /consent/templates/upload
Body: FormData with PDF file
Response: { filePath, fileHash, pageCount, extractedText? }

// Create template from structure
POST /consent/templates
Body: {
  templateCode: string;
  name: string;
  templateType: string;
  originalDocumentPath: string;
  originalDocumentHash: string;
  pages: PageDefinition[];
  sections: SectionDefinition[];
  clauses: ClauseDefinition[];
  fillInFields: FillInFieldDefinition[];
  requiredParties: PartyDefinition[];
}

// Get template with full structure
GET /consent/templates/:id
Response: Full template with pages, sections, clauses, fillInFields

// Update template (creates new version)
PUT /consent/templates/:id
Body: Same as create

// Parse PDF for reference (optional helper)
POST /consent/templates/parse-pdf
Body: { pdfPath: string }
Response: { pages: [...], suggestedSections: [...] }
```

---

## Implementation Recommendation

### Phase 1: Manual Template Creation (Start Here)

**Why:** Most accurate, no parsing complexity

1. Build template builder UI
2. Support manual section/clause creation
3. PDF viewer for reference
4. Fill-in field marker tool
5. Save template

**Timeline:** 1-2 days per template (manual work)

### Phase 2: PDF Parsing (Optional Enhancement)

**Why:** Speed up future templates

1. Add PDF text extraction
2. Auto-suggest sections
3. Admin still reviews/corrects
4. Saves time but not required

**Timeline:** 1-2 weeks (optional)

---

## Answer to Your Question

**Q: Upload or design as-is?**

**A: Both!**

1. **Upload PDF** → Preserve original (legal requirement)
2. **Design/Structure Manually** → Ensure accuracy
3. **Use PDF as Reference** → Side-by-side comparison

**Workflow:**
```
Upload PDF (preserved)
    ↓
Manual structuring (accurate)
    ↓
Compare with PDF (verify)
    ↓
Save template (ready)
```

**This gives you:**
- ✅ Original preserved (legal)
- ✅ Accurate structure (manual)
- ✅ Fill-in fields (marked)
- ✅ Word-for-word match (verified)

---

## Next Steps

1. ⏭️ Build template upload endpoint
2. ⏭️ Build template builder UI
3. ⏭️ Create first template manually (General Consent)
4. ⏭️ Test with real workflow
5. ⏭️ Add PDF parsing (optional, later)

Should I proceed with building the template upload and builder services?









