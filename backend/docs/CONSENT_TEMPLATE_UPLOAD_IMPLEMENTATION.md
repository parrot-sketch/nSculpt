# Consent Template Upload & Creation - Implementation Complete ✅

## Summary

Template management system implemented to support **PDF upload + manual structuring** workflow for digitizing physical consent forms.

---

## Answer to Your Question

**Q: Upload or design as-is?**

**A: Both! Hybrid Approach**

1. **Upload PDF** → Preserves original document (legal requirement)
2. **Manual Structuring** → You create the structure (ensures accuracy)
3. **Use PDF as Reference** → Side-by-side comparison during creation

**Why This Approach?**
- ✅ **Original preserved** → Legal defensibility
- ✅ **Manual control** → 100% accuracy (no OCR errors)
- ✅ **Reference available** → Verify word-for-word match
- ✅ **Fill-in fields** → Marked precisely where needed

---

## Workflow

### Step 1: Upload PDF

```bash
POST /api/v1/consent/templates/upload
Content-Type: multipart/form-data

file: [PDF file]
```

**Response:**
```json
{
  "success": true,
  "filePath": "./uploads/consent-templates/1234567890_abc123_NSAC_CONSENT_GENERAL.pdf",
  "fileHash": "a1b2c3d4e5f6...",  // SHA-256 hash
  "fileName": "1234567890_abc123_NSAC_CONSENT_GENERAL.pdf",
  "fileSize": 245678,
  "mimeType": "application/pdf",
  "pageCount": null,  // Optional (requires pdf-parse library)
  "message": "PDF uploaded successfully. Use this filePath and fileHash when creating template."
}
```

**What Happens:**
- PDF saved to `./uploads/consent-templates/`
- SHA-256 hash calculated (for integrity verification)
- File path returned for template creation

---

### Step 2: Create Template Structure

You manually structure the content:

```bash
POST /api/v1/consent/templates
Content-Type: application/json

{
  "templateCode": "GENERAL_CONSENT_V1",
  "name": "General Surgery Consent",
  "templateType": "GENERAL",
  "description": "General consent form for all surgical procedures",
  
  // Reference to uploaded PDF
  "originalDocumentPath": "./uploads/consent-templates/1234567890_abc123_NSAC_CONSENT_GENERAL.pdf",
  "originalDocumentHash": "a1b2c3d4e5f6...",
  
  // Pages (match PDF pages)
  "pages": [
    {
      "pageNumber": 1,
      "title": "Page 1",
      "content": "...",
      "sectionIds": ["section-1-id", "section-2-id"]
    },
    {
      "pageNumber": 2,
      "title": "Page 2",
      "sectionIds": ["section-3-id"]
    }
  ],
  
  // Sections (19 sections for General Consent)
  "sections": [
    {
      "sectionCode": "AUTHORIZATION",
      "title": "Authorization",
      "content": "I authorize...",
      "order": 1,
      "clauses": [
        {
          "clauseCode": "AUTH_1",
          "content": "I authorize the performance...",
          "order": 1
        }
      ]
    },
    {
      "sectionCode": "INDEPENDENT_CONTRACTORS",
      "title": "Independent Contractors",
      "content": "...",
      "order": 2
    }
    // ... all 19 sections
  ],
  
  // Fill-in fields
  "fillInFields": [
    {
      "fieldCode": "PATIENT_NAME",
      "label": "Patient Name",
      "fieldType": "TEXT",
      "required": true,
      "order": 1
    },
    {
      "fieldCode": "SURGEON_NAME",
      "label": "Surgeon Name",
      "fieldType": "TEXT",
      "required": true,
      "order": 2
    },
    {
      "fieldCode": "PROCEDURE_NAME",
      "label": "Procedure Name",
      "fieldType": "TEXT",
      "required": true,
      "order": 3
    }
  ],
  
  // Required parties
  "requiredParties": [
    {
      "partyType": "PATIENT",
      "required": true,
      "order": 1
    },
    {
      "partyType": "SURGEON",
      "required": true,
      "order": 2
    },
    {
      "partyType": "WITNESS",
      "required": true,
      "order": 3
    },
    {
      "partyType": "ANESTHESIOLOGIST",
      "required": true,
      "order": 4
    }
  ]
}
```

**What Happens:**
- Template created in database
- All pages, sections, clauses, fill-in fields saved
- Original PDF path and hash stored
- Template ready for use

---

## Implementation Details

### ✅ Services Created

1. **ConsentTemplateUploadService**
   - `uploadPDF()` - Upload and process PDF
   - `getFileInfo()` - Get file metadata
   - `deleteFile()` - Delete uploaded file
   - SHA-256 hash calculation
   - File storage management

2. **ConsentTemplateController**
   - `POST /templates/upload` - Upload PDF
   - `POST /templates` - Create template
   - `GET /templates/:id` - Get template with full structure
   - `GET /templates` - List all templates

### ✅ DTOs Created

- `CreateConsentTemplateDto` - Full template structure
- `PageDefinitionDto` - Page structure
- `SectionDefinitionDto` - Section structure
- `ClauseDefinitionDto` - Clause structure
- `FillInFieldDefinitionDto` - Fill-in field definitions
- `RequiredPartyDefinitionDto` - Required parties

---

## Recommended Workflow for Your 3 PDFs

### For Each PDF:

#### 1. General Consent (19 sections)

```
1. Upload PDF
   POST /consent/templates/upload
   → Get filePath and fileHash

2. Create template structure
   POST /consent/templates
   {
     templateCode: "GENERAL_CONSENT_V1",
     name: "General Surgery Consent",
     originalDocumentPath: "...",
     originalDocumentHash: "...",
     pages: [19 pages],
     sections: [19 sections with clauses],
     fillInFields: [
       { fieldCode: "PATIENT_NAME" },
       { fieldCode: "SURGEON_NAME" },
       { fieldCode: "PROCEDURE_NAME" }
     ],
     requiredParties: [
       { partyType: "PATIENT", required: true },
       { partyType: "SURGEON", required: true },
       { partyType: "WITNESS", required: true },
       { partyType: "ANESTHESIOLOGIST", required: true }
     ]
   }
```

#### 2. Botox Consent

```
1. Upload PDF
2. Create template with:
   - Sections (Introduction, Risks, Contraindications, etc.)
   - Fill-in fields
   - Structured data: BOTOX_TRACKING
   - Required parties: PATIENT, PRACTITIONER
```

#### 3. Aesthetic Procedures Consent (Most Complex)

```
1. Upload PDF
2. Create template with:
   - All sections (Instructions, General Info, Alternatives, Risks, etc.)
   - Multiple fill-in fields:
     * PROCEDURE_NAME
     * SURGEON_NAME
     * SPECIFIC_RISK_1, SPECIFIC_RISK_2, SPECIFIC_RISK_3
     * ALTERNATIVE_1, ALTERNATIVE_2, ALTERNATIVE_3
   - Structured data: CAPRINI_ASSESSMENT
   - Pages with initials (page-by-page acknowledgment)
   - Required parties: PATIENT, SURGEON, ANESTHESIOLOGIST, WITNESS
```

---

## Frontend UI Needed

### Template Builder Interface

```
┌─────────────────────────────────────────────────────────┐
│  Create Consent Template                                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Step 1: Upload PDF                                      │
│  [Upload PDF] → Shows filePath, fileHash                │
│                                                          │
│  Step 2: Basic Info                                      │
│  Template Code: [GENERAL_CONSENT_V1]                    │
│  Name: [General Surgery Consent]                        │
│  Type: [GENERAL ▼]                                      │
│                                                          │
│  Step 3: Structure Content                              │
│  ┌──────────────────┬──────────────────────────────┐  │
│  │ PDF Viewer       │ Structured Editor            │  │
│  │ [PDF Pages]      │ Pages:                       │  │
│  │                  │  ├─ Page 1                   │  │
│  │                  │  │  ├─ Section 1            │  │
│  │                  │  │  │  ├─ Clause 1          │  │
│  │                  │  │  │  └─ Clause 2          │  │
│  │                  │  │  └─ Section 2            │  │
│  │                  │  └─ Page 2                  │  │
│  └──────────────────┴──────────────────────────────┘  │
│                                                          │
│  Step 4: Mark Fill-ins                                  │
│  Content: "I authorize... upon ___PATIENT___"          │
│  [Mark as Fill-in] → Creates field                     │
│                                                          │
│  Step 5: Define Parties                                 │
│  [✓] Patient (required)                                 │
│  [✓] Surgeon (required)                                │
│  [✓] Witness (required)                                │
│  [✓] Anesthesiologist (required)                       │
│                                                          │
│  [Save Template]                                        │
└─────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Upload PDF
```
POST /api/v1/consent/templates/upload
Content-Type: multipart/form-data
Body: { file: PDF }
Response: { filePath, fileHash, ... }
```

### Create Template
```
POST /api/v1/consent/templates
Content-Type: application/json
Body: CreateConsentTemplateDto
Response: Full template with relations
```

### Get Template
```
GET /api/v1/consent/templates/:id
Response: Full template with pages, sections, clauses, fillInFields
```

### List Templates
```
GET /api/v1/consent/templates
Response: List of all active templates
```

---

## Next Steps

### Immediate (Backend Ready ✅)
- ✅ PDF upload endpoint
- ✅ Template creation endpoint
- ✅ Template retrieval endpoint

### Frontend Needed
1. ⏭️ PDF upload component
2. ⏭️ Template builder UI
3. ⏭️ Section/clause editor
4. ⏭️ Fill-in field marker
5. ⏭️ Page structure manager

### Optional Enhancements
1. ⏭️ PDF text extraction (install `pdf-parse` library)
2. ⏭️ Auto-suggest sections from PDF
3. ⏭️ Side-by-side PDF viewer in UI

---

## Summary

**You asked:** "Upload or design as-is?"

**Answer:** **Both!**

1. **Upload PDF** → Preserves original (legal requirement)
2. **Manual Structuring** → You create structure (accurate)
3. **Reference PDF** → Verify word-for-word match

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

**The backend is ready!** You can now:
- Upload PDFs
- Create templates with full structure
- Preserve original documents
- Mark fill-in fields
- Define required parties

**Next:** Build the frontend template builder UI! 🚀









