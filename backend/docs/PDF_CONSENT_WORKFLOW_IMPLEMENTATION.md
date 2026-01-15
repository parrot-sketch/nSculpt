# PDF-Based Consent Workflow Implementation

## Overview

This document describes the implementation of a PDF-based consent management system for the Surgical EHR. The system supports PDF template uploads, placeholder merging, multi-signer digital signatures, and immutable final documents with full audit compliance.

## Architecture

### Schema Models

1. **ConsentTemplate** (Extended)
   - Added `fileUrl` field for PDF template storage
   - Added `placeholders` JSON field for placeholder definitions
   - Supports PDF upload and placeholder parsing

2. **PDFConsent** (New)
   - Represents a patient-specific consent generated from a template
   - Tracks workflow status: DRAFT → READY_FOR_SIGNATURE → PARTIALLY_SIGNED → SIGNED
   - Stores `generatedPdfUrl` (editable draft) and `finalPdfUrl` (immutable signed version)
   - Links to Patient, Consultation, and Template

3. **PDFConsentSignature** (New)
   - Records individual signatures from each party
   - Supports multiple signers: PATIENT, GUARDIAN, DOCTOR, NURSE_WITNESS, ADMIN
   - Stores signature metadata: IP address, device info, timestamp

### Enums

- **ConsentStatus**: DRAFT, READY_FOR_SIGNATURE, PARTIALLY_SIGNED, SIGNED, REVOKED, EXPIRED, ARCHIVED
- **SignerType**: PATIENT, GUARDIAN, DOCTOR, NURSE_WITNESS, ADMIN

## API Endpoints

### Template Management (`/api/v1/consents/templates`)

- `POST /` - Create PDF template (Admin only)
- `GET /` - List all templates
- `GET /:id` - Get template by ID
- `PATCH /:id` - Update template (Admin only)
- `PATCH /:id/deactivate` - Deactivate template (Admin only)

### Consent Workflow (`/api/v1/consents`)

- `POST /generate` - Generate patient-specific consent from template
- `GET /:id` - Get consent by ID
- `GET /patient/:patientId` - Get all consents for a patient
- `GET /consultation/:consultationId` - Get all consents for a consultation
- `POST /:id/send-for-signature` - Move consent to signing stage
- `POST /:id/sign` - Sign consent (supports multiple signers)
- `POST /:id/revoke` - Revoke consent
- `POST /:id/archive` - Archive consent (Admin only)

## Services

### PDFConsentTemplateService
- Handles PDF template upload and placeholder parsing
- Manages template lifecycle (create, update, deactivate)

### PDFConsentService
- Generates patient-specific consents from templates
- Manages consent workflow state transitions
- **Enforces signature order rules:**
  - Patient/Guardian must sign BEFORE Doctor
  - Witness can only sign AFTER Patient
  - Admin requires override flag + reason
  - No duplicate signatures allowed
  - No signatures allowed once SIGNED
- Handles signature collection with metadata:
  - IP address
  - Device info (user agent)
  - Timestamp
  - Actor ID
- **Auto-attaches to EMR** when consent becomes SIGNED:
  - Creates addendum with signature summary
  - Includes link to final PDF
  - Records date/time
- **Revocation constraints:**
  - Only Admin or Doctor can revoke
  - Cannot revoke if surgery already scheduled
  - Requires reason
  - Updates EMR with revocation notice
- **Archive validation:**
  - Only Admin can archive
  - Only SIGNED or REVOKED consents can be archived
  - Requires reason
- **Optimistic locking:** Version conflict protection (409 on mismatch)

### PDFProcessingService
- **Fully implemented with pdf-lib**
- Parses placeholders from PDF templates ({{PATIENT_NAME}}, {{DATE}}, etc.)
- Merges placeholder values into PDF form fields
- Embeds signatures at positional anchors ([[SIGN_PATIENT]], [[SIGN_DOCTOR]], etc.)
- Generates final signed PDFs with:
  - Flattened form fields (no further edits possible)
  - Footer with timestamp and SHA-256 hash
  - Signature watermarks
- Handles file storage and URL generation
- Computes SHA-256 hash for integrity verification

## Domain Events

The system emits the following events:

- `PDFConsent.Created` - When consent is generated
- `PDFConsent.ReadyForSignature` - When consent is sent for signing
- `PDFConsent.Signed` - When consent is fully signed
- `PDFConsent.Revoked` - When consent is revoked
- `PDFConsent.Archived` - When consent is archived

## Security & Compliance

### RBAC Enforcement
- **Admin**: Full access (upload templates, archive consents)
- **Doctor**: Generate consents, send for signature, sign clinical sections
- **Nurse**: Prepare drafts, witness signatures
- **Patient**: Sign only their section
- **Front Desk**: Can prepare drafts, cannot view signatures or clinical text

### Audit Trail
- All consent operations are logged via DomainEvent
- Signature metadata includes IP address, device info, timestamp
- Full access logging via DataAccessLogInterceptor
- Row-level security validation via RlsGuard

### Immutability
- Once SIGNED, consent becomes read-only (NO edits allowed)
- Only new versions allowed (create new consent if changes needed)
- Final PDF is locked and watermarked with:
  - Flattened form fields (cannot be edited)
  - Footer: "Digitally signed — timestamp — hash — do not modify"
  - SHA-256 hash computed and stored
- All signatures are immutable after creation

## PDF Locking Process

When consent reaches SIGNED status:

1. **Form Field Flattening**: All PDF form fields are flattened (made read-only)
2. **Signature Embedding**: Signatures are embedded at anchor positions
3. **Watermark Addition**: Timestamp and hash watermark added to footer
4. **Hash Computation**: SHA-256 hash computed for integrity verification
5. **File Locking**: PDF permissions set to read-only
6. **Storage**: Final PDF stored with hash for tamper detection

## Revocation Process

### Constraints
- **Only Admin or Doctor** can revoke
- **Cannot revoke** if surgery already scheduled (must cancel surgery first)
- **Requires reason** (mandatory)
- **Cannot revoke** signed consents (must create new version)

### Process
1. Validate user has permission (Admin or Doctor)
2. Check consent status (cannot be SIGNED)
3. Check if surgery scheduled (block if scheduled)
4. Require revocation reason
5. Update consent status to REVOKED
6. Update EMR addendum: "Consent revoked — do not proceed until re-authorized"
7. Emit `PDFConsent.Revoked` event

## Archive Process

### Validation Rules
- **Only Admin** can archive
- **Only SIGNED or REVOKED** consents can be archived
- **Requires reason** (mandatory)

### Process
1. Validate user is Admin
2. Check consent status (must be SIGNED or REVOKED)
3. Require archive reason
4. Soft delete (set archivedAt timestamp)
5. Emit `PDFConsent.Archived` event

## Integration Points

### EMR Integration
When consent reaches SIGNED status:
- **Automatic addendum creation** in EMR
- Addendum content includes:
  - "Surgical consent signed and attached to consultation."
  - Link to final PDF
  - Signature summary (who signed, when)
  - Date/time of signing
- Attached to most recent EMR note for the consultation

### Consultation Integration
- Consents are linked to consultations via `consultationId`
- Can be triggered from consultation page
- Pre-populates patient and consultation data
- Auto-attaches to consultation's EMR notes

### Audit Integration
- All operations logged via DomainEvent
- Access logs via DataAccessLogInterceptor
- Every view/download of consent PDF is logged
- Full audit trail for legal defensibility
- Version conflict protection (409 Conflict on mismatch)

## Guard Rails

### Access Control
- **RLS Validation**: Every operation validates patient access
- **Role-based restrictions**: Front desk cannot view signatures
- **Signature validation**: Cannot sign unrelated consent
- **Version conflicts**: Optimistic locking prevents concurrent modifications

### Logging
- **Every view** of consent PDF is logged (IP, user, timestamp)
- **Every download** is logged
- **All signature attempts** are logged (success and failure)
- **All status changes** are logged

### Error Handling
- **409 Conflict** on version mismatch
- **403 Forbidden** on access denied
- **400 Bad Request** on invalid state transitions
- **404 Not Found** on missing resources

## Security Compliance Considerations

### HIPAA Compliance
- All PHI access is logged
- Row-level security enforced
- Audit trail complete and immutable
- Signature metadata includes IP/device for forensic analysis

### Legal Defensibility
- Final PDFs are tamper-proof (hash verification)
- All signatures immutable after creation
- Complete audit trail for 10+ year retention
- Version history preserved
- Revocation process documented

### Data Integrity
- SHA-256 hash computed for all final PDFs
- Hash stored alongside final URL
- Form fields flattened to prevent editing
- Watermarks include timestamp and hash

## Next Steps

### 1. ✅ PDF Library Installed

```bash
npm install pdf-lib  # ✅ DONE
```

All PDF manipulation methods implemented:
- ✅ `parsePlaceholders()` - Extract placeholders from PDF
- ✅ `mergePlaceholders()` - Merge values into PDF form fields
- ✅ `generateFinalPDF()` - Add signatures, watermarks, and lock PDF

## Signature Sequence Rules

### Required Order
1. **Patient/Guardian** (Priority 1) - Must sign first
2. **Doctor** (Priority 2) - Can only sign after Patient
3. **Nurse Witness** (Priority 3) - Can only sign after Patient
4. **Admin** (Priority 4) - Requires override flag + reason

### Business Rules
- Patient signs BEFORE doctor (enforced)
- Witness only after patient (enforced)
- Admin cannot sign on behalf unless override flag + reason
- No signatures allowed once status = SIGNED
- Duplicate signatures prevented (one per signer type)

### Signature Metadata Recorded
- IP address (IPv4 or IPv6)
- Device info (user agent)
- Signed timestamp
- Actor ID (user who signed)

### 2. Generate Prisma Client

```bash
npm run schema:generate
```

This will generate TypeScript types for the new models.

### 3. Create Database Migration

```bash
npm run schema:migrate -- --name add_pdf_consent_workflow
```

### 4. Configure File Storage

Update environment variables:
- `UPLOADS_DIR` - Local file storage directory (default: `./uploads/consents`)
- `FILE_BASE_URL` - Base URL for file access (for S3/CDN integration)

For production, integrate with S3 or similar:
- Update `PDFProcessingService.getFileUrl()` to return S3 URLs
- Update `PDFProcessingService.savePDF()` to upload to S3

### 5. ✅ Integration Tests

Comprehensive test suite in `test/modules/consent/pdf-consent.service.spec.ts`:
- ✅ Signature order enforcement tests
- ✅ Illegal sign attempt tests
- ✅ Revocation rule tests
- ✅ Archive rule tests
- ✅ EMR auto-attach tests
- ✅ Optimistic locking failure tests

### 6. Test Workflow

1. **Create Template** (Admin):
   ```bash
   POST /api/v1/consents/templates
   # Upload PDF with placeholders like {{PATIENT_NAME}}, {{DATE}}
   ```

2. **Generate Consent** (Doctor/Nurse):
   ```bash
   POST /api/v1/consents/generate
   # Provide templateId, patientId, consultationId, placeholderValues
   ```

3. **Send for Signature** (Doctor):
   ```bash
   POST /api/v1/consents/:id/send-for-signature
   ```

4. **Sign Consent** (Patient/Doctor/Witness):
   ```bash
   POST /api/v1/consents/:id/sign
   # Provide signerType, signerName, signatureUrl
   ```

5. **Verify Final Document**:
   ```bash
   GET /api/v1/consents/:id
   # Check finalPdfUrl for locked, signed PDF
   ```

## Integration Points

### EMR Integration
When consent reaches SIGNED status:
- Emit `PDFConsent.Signed` event
- EMR module can listen and create addendum:
  - "Surgical consent signed and attached."
  - Include link to final PDF

### Consultation Integration
- Consents are linked to consultations via `consultationId`
- Can be triggered from consultation page
- Pre-populates patient and consultation data

### Audit Integration
- All operations logged via DomainEvent
- Access logs via DataAccessLogInterceptor
- Full audit trail for legal defensibility

## Business Rules

1. **No Hard Deletes**: Archive only, never delete
2. **Signatures Immutable**: Once created, cannot be modified
3. **Optimistic Locking**: Version field prevents concurrent updates
4. **Patient Row-Level Security**: Enforced via RlsGuard
5. **Status Transitions**: 
   - DRAFT → READY_FOR_SIGNATURE (admin/doctor)
   - READY_FOR_SIGNATURE → PARTIALLY_SIGNED → SIGNED (signatures)
   - Any → REVOKED (admin/doctor, before SIGNED)
   - Any → ARCHIVED (admin only)

## Files Created/Modified

### New Files
- `dto/create-pdf-template.dto.ts`
- `dto/generate-pdf-consent.dto.ts`
- `dto/sign-pdf-consent.dto.ts`
- `dto/send-for-signature.dto.ts`
- `dto/revoke-pdf-consent.dto.ts`
- `dto/archive-pdf-consent.dto.ts`
- `repositories/pdf-consent.repository.ts`
- `services/pdf-consent.service.ts`
- `services/pdf-consent-template.service.ts`
- `services/pdf-processing.service.ts`
- `controllers/pdf-consent.controller.ts`
- `controllers/pdf-consent-template.controller.ts`

### Modified Files
- `prisma/schema/consent.prisma` - Added PDF workflow models and enums
- `prisma/schema/rbac.prisma` - Added User relations
- `prisma/schema/patient.prisma` - Added Patient relation
- `prisma/schema/consultation.prisma` - Added Consultation relation
- `events/consent.events.ts` - Added PDF workflow events
- `consent.module.ts` - Wired up new services and controllers

## Notes

- PDF processing service requires implementation with a PDF library
- File storage currently uses local filesystem; should be migrated to S3 for production
- Prisma client needs to be regenerated after schema changes
- Database migration needs to be created and applied

