# Consent Viewing Workflow

## Overview

This document explains how the consent viewing workflow works from patient listing to PDF viewer display.

## Workflow Steps

### 1. Template Upload (Admin - One-Time Setup)

**When**: Admin uploads a PDF template (one-time setup)

**Process**:
```
Admin → Upload PDF Template
  ↓
PDFConsentTemplateService.createTemplate()
  ↓
- PDF file saved to disk (./uploads/consent-templates/)
- Template metadata saved to database (name, description, fileUrl)
- Placeholders parsed from PDF ({{PATIENT_NAME}}, {{DATE}}, etc.)
- Template record created with fileUrl pointing to PDF file
```

**Key Points**:
- Template PDF is stored on disk (not in database)
- `fileUrl` field stores the path/URL to the template PDF
- Templates are reusable - one template can generate many consents

---

### 2. Consent Generation (Admin Action)

**When**: Admin generates a patient-specific consent from a template

**Frontend Flow**:
```
Patient Listing Page
  ↓
Admin clicks "Generate Consent" button
  ↓
GenerateConsentModal opens
  ↓
Admin selects template from dropdown
  ↓ (optional)
Admin fills placeholder values (e.g., {{PATIENT_NAME}})
  ↓
Admin clicks "Generate Consent"
  ↓
POST /api/v1/consents/generate
  {
    templateId: "...",
    patientId: "...",
    consultationId: "...",
    placeholderValues: { PATIENT_NAME: "John Doe", ... }
  }
```

**Backend Flow** (`PDFConsentService.generateConsent()`):
```
1. Validate patient access (RLS check)
2. Load template from database
3. Load template PDF file from disk (using template.fileUrl)
4. Merge placeholder values into PDF:
   - Replace {{PATIENT_NAME}} with "John Doe"
   - Replace {{DATE}} with current date
   - etc.
5. Create NEW patient-specific PDF (generated PDF)
6. Save generated PDF to disk (./uploads/consents/)
7. Create PDFConsent record:
   - generatedPdfUrl: "/uploads/consents/consent-{id}-generated-{timestamp}.pdf"
   - status: "DRAFT"
   - templateId: reference to template
   - patientId: reference to patient
8. Emit domain event: PDF_CONSENT_CREATED
9. Return consent object
```

**Key Points**:
- **Template PDF is NOT modified** - it remains unchanged
- **New PDF is created** - the generated/patient-specific version
- Generated PDF has placeholders filled with actual patient data
- Generated PDF is stored separately from template

---

### 3. Consent Viewing (Admin/Doctor Viewing Existing Consent)

**When**: Admin/Doctor views an existing consent

**Frontend Flow**:
```
Patient Listing Page
  ↓
Admin clicks "View Consent" on existing consent
  ↓
ConsentViewer component renders
  ↓
useQuery fetches consent:
  GET /api/v1/consents/{consentId}
  ↓
Consent object returned with:
  - generatedPdfUrl (if DRAFT/READY_FOR_SIGNATURE)
  - finalPdfUrl (if SIGNED)
  - downloadUrl (secure API endpoint)
  ↓
PDF URL determined:
  pdfUrl = downloadUrl || finalPdfUrl || generatedPdfUrl
  ↓
PDF displayed in iframe:
  <iframe src={pdfUrl} />
```

**Backend Flow** (`PDFConsentService.findOne()`):
```
1. Load PDFConsent from database
2. Validate access (RLS check)
3. Add downloadUrl: "/api/v1/consents/{id}/download"
4. Return consent object with URLs
```

**PDF Display**:
```
ConsentViewer.tsx (line 207-214)
  ↓
<iframe src={pdfUrl} />
  ↓
Browser requests PDF from URL
  ↓
If downloadUrl: Goes through secure API endpoint (RBAC/RLS)
If finalPdfUrl/generatedPdfUrl: Direct file access (backward compatibility)
  ↓
PDF loads in iframe
```

---

## Important Distinctions

### Template vs Generated Consent PDF

1. **Template PDF** (Uploaded by Admin):
   - Stored at: `./uploads/consent-templates/template-{timestamp}.pdf`
   - Contains placeholders: `{{PATIENT_NAME}}`, `{{DATE}}`, etc.
   - **Never modified** - used as a blueprint
   - Referenced by: `ConsentTemplate.fileUrl`

2. **Generated Consent PDF** (Created when consent is generated):
   - Stored at: `./uploads/consents/consent-{id}-generated-{timestamp}.pdf`
   - Contains **filled values**: "John Doe", "2024-01-15", etc.
   - **Patient-specific** - one per consent
   - Referenced by: `PDFConsent.generatedPdfUrl`

3. **Final Consent PDF** (Created when consent is signed):
   - Stored at: `./uploads/consents/consent-{id}-final-{timestamp}.pdf`
   - Contains annotations + signatures embedded
   - **Immutable** - cannot be modified after signing
   - Referenced by: `PDFConsent.finalPdfUrl`
   - Has hash: `PDFConsent.finalPdfHash`

---

## URL Resolution Priority

When viewing a consent, the PDF URL is resolved in this order:

```typescript
// ConsentViewer.tsx (line 144-146)
const pdfUrl = 
  consent.downloadUrl  // 1. Preferred: Secure API endpoint
    ? `${API_URL}${consent.downloadUrl}`
    : consent.finalPdfUrl      // 2. Final PDF (if signed)
    || consent.generatedPdfUrl // 3. Generated PDF (if not signed)
```

**Why downloadUrl is preferred**:
- Goes through RBAC/RLS checks
- Access is logged for audit
- More secure than direct file access

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    TEMPLATE UPLOAD (One-Time)               │
└─────────────────────────────────────────────────────────────┘
                        │
                        │ Admin uploads PDF
                        ↓
        ┌───────────────────────────────┐
        │  ConsentTemplate (Database)   │
        │  - id                         │
        │  - name                       │
        │  - fileUrl: "/uploads/..."    │  ← Template PDF on disk
        │  - placeholders: [...]        │
        └───────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│              CONSENT GENERATION (Per Patient)               │
└─────────────────────────────────────────────────────────────┘
                        │
                        │ Admin selects template + patient
                        ↓
        ┌───────────────────────────────┐
        │  Load Template PDF            │
        │  (from template.fileUrl)      │
        └───────────────────────────────┘
                        │
                        │ Merge placeholders
                        ↓
        ┌───────────────────────────────┐
        │  Create Generated PDF         │
        │  (NEW file on disk)           │
        └───────────────────────────────┘
                        │
                        │ Save PDFConsent record
                        ↓
        ┌───────────────────────────────┐
        │  PDFConsent (Database)        │
        │  - id                         │
        │  - generatedPdfUrl: "/..."    │  ← Generated PDF on disk
        │  - templateId: "..."          │  ← Reference to template
        │  - patientId: "..."           │
        │  - status: "DRAFT"            │
        └───────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│                    CONSENT VIEWING                          │
└─────────────────────────────────────────────────────────────┘
                        │
                        │ Admin clicks "View Consent"
                        ↓
        ┌───────────────────────────────┐
        │  GET /api/v1/consents/{id}    │
        │  → Returns PDFConsent object  │
        └───────────────────────────────┘
                        │
                        │ Extract PDF URL
                        ↓
        ┌───────────────────────────────┐
        │  pdfUrl = generatedPdfUrl     │
        │  (or finalPdfUrl if signed)   │
        └───────────────────────────────┘
                        │
                        │ Load PDF in iframe
                        ↓
        ┌───────────────────────────────┐
        │  <iframe src={pdfUrl} />      │
        │  → PDF displays in viewer     │
        └───────────────────────────────┘
```

---

## Key Code Locations

### Frontend
- **Template Selection**: `client/components/consents/GenerateConsentModal.tsx`
- **Consent Viewing**: `client/components/consents/ConsentViewer.tsx`
- **PDF Display**: `ConsentViewer.tsx` line 207-214 (iframe)

### Backend
- **Template Upload**: `backend/src/modules/consent/services/pdf-consent-template.service.ts`
- **Consent Generation**: `backend/src/modules/consent/services/pdf-consent.service.ts` → `generateConsent()`
- **PDF Processing**: `backend/src/modules/consent/services/pdf-processing.service.ts`
- **Consent Retrieval**: `backend/src/modules/consent/services/pdf-consent.service.ts` → `findOne()`

---

## Summary

**To answer your question directly**:

1. **Template Upload**: Admin uploads PDF template → saved to disk → template record created
2. **Consent Generation**: Admin selects template → system creates NEW patient-specific PDF → consent record created
3. **Consent Viewing**: Admin clicks "View Consent" → system loads the **generated PDF** (not the template) → displays in iframe

**The file you're viewing is NOT the template** - it's the **generated consent PDF** that was created when the consent was generated. The template is just used as a blueprint to create the patient-specific PDF.








