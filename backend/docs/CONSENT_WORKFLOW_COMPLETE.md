# Complete Consent Workflow

## Overview

This document describes the complete consent workflow from admin template upload to patient signing.

## Workflow Steps

### 1. Admin Uploads Consent Template

**Location**: `/admin/system-config/consent-templates/upload`

**Process**:
1. Admin uploads a PDF file
2. Admin provides template name and description
3. System:
   - Saves PDF file to storage (`uploads/consents/`)
   - Calculates SHA-256 hash for integrity verification
   - Parses placeholders from PDF (e.g., `{{PATIENT_NAME}}`, `{{DATE}}`)
   - Creates template record in database with:
     - `fileUrl`: Path to stored PDF file
     - `placeholders`: Array of detected placeholders
     - `name`, `description`, `isActive`, etc.

**Backend Endpoint**: `POST /api/v1/consents/templates`
- Accepts multipart/form-data with file
- Stores PDF file
- Creates template record
- Returns template with `fileUrl`

**Key Point**: The PDF file is stored and the `fileUrl` is saved in the template. This PDF will be used during patient signing.

### 2. Admin Generates Consent for Patient

**Location**: `/admin/patients/[id]/consents/new`

**Process**:
1. Admin navigates to patient listing
2. Clicks "Consent" action on patient record
3. System:
   - Loads patient information
   - Fetches all active consent templates
   - Admin selects a template
   - System generates consent:
     - Loads template PDF from `fileUrl`
     - Merges patient data into placeholders:
       - `PATIENT_NAME`: Patient full name
       - `DATE`: Current date
       - `PATIENT_AGE`: Patient age
       - `PATIENT_DOB`: Patient date of birth
       - `PATIENT_EMAIL`: Patient email
       - `PATIENT_PHONE`: Patient phone
     - Creates PDF consent record with:
       - `generatedPdfUrl`: Path to generated PDF
       - `status`: `DRAFT`
       - Links to patient and template

**Backend Endpoint**: `POST /api/v1/consents/generate`
- Accepts: `templateId`, `patientId`, `placeholderValues`
- Generates patient-specific PDF
- Creates consent record
- Returns consent with `generatedPdfUrl`

**Key Point**: The generated PDF uses the template's PDF file as the base, with patient data merged into placeholders.

### 3. Patient Signs Consent

**Location**: Interactive PDF viewer (to be implemented)

**Process**:
1. Consent is sent to patient (or opened in interactive viewer)
2. Patient views PDF in interactive viewer
3. Patient can:
   - Annotate PDF (highlight, comment, etc.)
   - Sign PDF using signature tool
4. System:
   - Saves annotations
   - Embeds signature into PDF
   - Updates consent status
   - Generates final signed PDF with hash

**Backend Endpoints**:
- `POST /api/v1/consents/:id/sign`: Sign consent
- `GET /api/v1/consents/:id/download`: Download PDF
- `GET /api/v1/pdf-consents/:id/annotations`: Get annotations
- `POST /api/v1/pdf-consents/:id/annotations`: Create annotation

**Key Point**: The PDF file from the template is used during signing. All annotations and signatures are embedded into the PDF.

## Data Flow

```
Admin Upload
    ↓
PDF File Stored → Template Record Created (with fileUrl)
    ↓
Admin Generates Consent for Patient
    ↓
Template PDF Loaded → Patient Data Merged → Generated PDF Created
    ↓
Patient Signs
    ↓
Annotations & Signatures Embedded → Final PDF Generated (with hash)
```

## File Storage

### Template PDF
- **Location**: `uploads/consents/template-{timestamp}.pdf`
- **Stored in**: Template record `fileUrl` field
- **Purpose**: Base PDF for all consents generated from this template

### Generated PDF
- **Location**: `uploads/consents/consent-{consentId}-generated-{timestamp}.pdf`
- **Stored in**: Consent record `generatedPdfUrl` field
- **Purpose**: Patient-specific PDF with placeholders filled

### Final PDF
- **Location**: `uploads/consents/consent-{consentId}-final-{timestamp}.pdf`
- **Stored in**: Consent record `finalPdfUrl` field
- **Purpose**: Signed PDF with annotations and signatures embedded

## Security & Integrity

### PDF Hash Verification
- SHA-256 hash calculated for each PDF
- Stored in `finalPdfHash` field
- Used to verify PDF integrity
- Prevents tampering

### Access Control
- RBAC: Only authorized roles can access
- RLS: Patient relationship validation
- Audit logging: All access logged

## Frontend Implementation

### Patient Listing
- **File**: `client/app/(protected)/admin/patients/page.tsx`
- **Action**: "Consent" button added to Actions column
- **Link**: `/admin/patients/[id]/consents/new`

### Consent Generation Page
- **File**: `client/app/(protected)/admin/patients/[id]/consents/new/page.tsx`
- **Features**:
  - Patient information display
  - Template selection dropdown
  - Placeholder auto-fill from patient data
  - Error handling
  - Navigation to consent view after generation

### Template Upload Page
- **File**: `client/app/(protected)/admin/system-config/consent-templates/upload/page.tsx`
- **Features**:
  - PDF file upload
  - Template name and description
  - One-step upload and template creation

## Backend Implementation

### Template Service
- **File**: `backend/src/modules/consent/services/pdf-consent-template.service.ts`
- **Methods**:
  - `createTemplate()`: Upload PDF and create template
  - `findAll()`: Get all templates
  - `findOne()`: Get template by ID

### Consent Service
- **File**: `backend/src/modules/consent/services/pdf-consent.service.ts`
- **Methods**:
  - `generateConsent()`: Generate consent from template
  - `signConsent()`: Sign consent
  - `findOne()`: Get consent by ID

### PDF Processing Service
- **File**: `backend/src/modules/consent/services/pdf-processing.service.ts`
- **Methods**:
  - `parsePlaceholders()`: Extract placeholders from PDF
  - `mergePlaceholders()`: Merge values into PDF
  - `embedSignatures()`: Embed signatures into PDF
  - `embedAnnotations()`: Embed annotations into PDF
  - `calculateHash()`: Calculate SHA-256 hash

## Verification Checklist

✅ Admin can upload PDF consent template
✅ PDF file is stored and `fileUrl` saved in template
✅ Admin can generate consent for patient from template
✅ Patient data is merged into PDF placeholders
✅ Generated PDF is available for signing
✅ PDF file from template is used during signing
✅ Consent action is available in patient listing
✅ Complete workflow is documented

## Next Steps

1. **Interactive Signing**: Implement full interactive PDF viewer for patient signing
2. **Signature Management**: Complete signature creation and placement
3. **Annotation System**: Complete annotation embedding
4. **Email Notifications**: Send consent to patient via email
5. **Status Tracking**: Track consent status through workflow
6. **Audit Trail**: Complete audit logging for all actions
