# Consent System Implementation Summary

## ✅ Schema Design Complete

### New Models Added

1. **ConsentTemplateRequiredParty** - Dynamic party configuration
   - Toggles which parties must sign (PATIENT, GUARDIAN, SURGEON, etc.)
   - Configurable per template, not hardcoded

2. **ConsentSignature** - Individual signature records
   - One record per party per instance
   - Replaces hardcoded signature fields
   - Immutable after creation

3. **ConsentDocumentSnapshot** - Exact wording preservation
   - Stores full document text (TEXT field, not JSON)
   - Captured at signing time
   - Legal requirement for exact wording

4. **ConsentVersionHistory** - Re-consent tracking
   - Tracks version chain when consents are superseded
   - Links previous consent to new consent

### Enhanced Models

1. **ConsentTemplate**
   - Added `templateType` (GENERAL vs PROCEDURE_SPECIFIC)
   - Added `originalDocumentPath` and `originalDocumentHash`
   - Added `applicableCPTCodes` array

2. **PatientConsentInstance**
   - Removed hardcoded signature fields (moved to ConsentSignature)
   - Added `procedurePlanId` relation
   - Added status: `PENDING_SIGNATURES`
   - Added new relations: signatures[], documentSnapshot, versionHistory

---

## Consent & Procedure Integration

### Answer: Yes, Consents ARE Related to Procedures

**Two Types:**

1. **General Consent** (`templateType = GENERAL`)
   - One-time consent (privacy, photography, data use)
   - Links to: `Consultation` (first visit)
   - Applies to: All future procedures

2. **Procedure-Specific Consent** (`templateType = PROCEDURE_SPECIFIC`)
   - Required per procedure
   - Links to: `ProcedurePlan` → `SurgicalCase`
   - Template matched by CPT code
   - Must be signed before surgery

### Workflow Integration

```
1. Consultation (First Visit)
   └─> General Consent created and signed
   
2. Procedure Plan Created
   └─> System checks CPT code
   └─> Finds matching Procedure-Specific Consent Template
   └─> Creates PatientConsentInstance
       ├─> Links to ProcedurePlan
       ├─> Links to Consultation
       └─> Determines required parties from template
   
3. Patient Signs Consent
   └─> Each required party signs
   └─> ConsentSignature records created
   └─> ConsentDocumentSnapshot created (exact wording)
   
4. Surgical Case Scheduled
   └─> Pre-op check: Verify consent.status = SIGNED
   └─> Verify all required parties signed
   
5. Surgery Performed
   └─> Consent linked via relatedCaseId
```

---

## Key Design Decisions Explained

### 1. Why Separate ConsentSignature Model?

**Before (Hardcoded):**
```prisma
signedBy String?
clinicianSignedBy String?
witnessedBy String?
```

**Problems:**
- Can't add new party types without schema change
- Can't have multiple surgeons sign
- Can't track guardian separately from patient
- No flexibility

**After (Dynamic):**
```prisma
ConsentSignature {
  partyType: PATIENT | GUARDIAN | SURGEON | ...
  signedBy: User ID
}
```

**Benefits:**
- Add new party types via configuration (no schema change)
- Multiple surgeons can sign (if needed)
- Clear separation of guardian vs patient
- Complete flexibility

### 2. Why Preserve Full Document Text?

**Requirement:** Client needs exact wording preserved.

**Solution:**
- `fullDocumentText` (TEXT field) - Entire document text
- `sectionSnapshots` (JSON) - Structured view for queryability
- **Primary:** Full text (source of truth)
- **Secondary:** JSON (for queries)

**Why not just JSON?**
- Legal requirement: Courts need exact text
- Version safety: If template changes, we preserve what was signed
- Audit: Can reconstruct exact document

### 3. Why ConsentTemplateRequiredParty?

**Problem:** Different procedures need different signers.

**Examples:**
- Cosmetic surgery: Patient + Surgeon + Witness
- Minor patient: Guardian + Patient (if age-appropriate) + Surgeon
- Complex case: Patient + Surgeon + Anesthesiologist + Witness

**Solution:** Configure per template, not hardcode.

**Workflow:**
```
1. Admin creates ConsentTemplate
2. Admin configures required parties via ConsentTemplateRequiredParty
3. System uses this configuration when creating instances
4. Patient signs, system checks which parties are required
```

---

## API Structure (Proposed)

### Controllers

```
src/modules/consent/
├── controllers/
│   ├── consent-template.controller.ts    # Template CRUD (admin)
│   ├── consent-instance.controller.ts    # Instance management
│   └── consent-signature.controller.ts   # Signature capture
```

### Services

```
src/modules/consent/
├── services/
│   ├── consent-template.service.ts       # Template management
│   ├── consent-instance.service.ts       # Instance lifecycle
│   ├── consent-signature.service.ts      # Signature handling
│   └── consent-workflow.service.ts       # Workflow orchestration
```

### Repositories

```
src/modules/consent/
├── repositories/
│   ├── consent-template.repository.ts
│   ├── consent-instance.repository.ts
│   └── consent-signature.repository.ts
```

---

## API Endpoints (Proposed)

### Template Management (Admin)

```
GET    /api/v1/consents/templates                    # List all templates
GET    /api/v1/consents/templates/:id                # Get template details
POST   /api/v1/consents/templates                    # Create template
PUT    /api/v1/consents/templates/:id                # Update template
POST   /api/v1/consents/templates/:id/parties        # Configure required parties
GET    /api/v1/consents/templates/:id/parties        # Get required parties
```

### Instance Management

```
POST   /api/v1/consents/instances                    # Create instance
GET    /api/v1/consents/instances/:id                # Get instance
GET    /api/v1/consents/instances?patientId=...      # List by patient
GET    /api/v1/consents/instances?procedurePlanId=... # List by procedure plan
PATCH  /api/v1/consents/instances/:id/status         # Update status
```

### Signature Capture

```
POST   /api/v1/consents/instances/:id/signatures     # Add signature
GET    /api/v1/consents/instances/:id/signatures     # List signatures
GET    /api/v1/consents/instances/:id/signatures/pending # Get pending parties
```

### Workflow

```
POST   /api/v1/consents/instances/:id/acknowledge-section  # Acknowledge section
POST   /api/v1/consents/instances/:id/understanding-check  # Pass understanding check
POST   /api/v1/consents/instances/:id/request-discussion   # Flag for discussion
POST   /api/v1/consents/instances/:id/generate-pdf         # Generate signed PDF
```

---

## Validation Rules

### Before Instance Can Be Signed

- ✅ All required sections acknowledged
- ✅ All understanding checks passed (or discussed)
- ✅ Patient had opportunity to ask questions
- ✅ All required parties present/available

### Before Surgery Can Proceed

- ✅ Consent status = SIGNED
- ✅ All required parties signed (per template configuration)
- ✅ Consent not expired
- ✅ Consent matches current procedure plan
- ✅ Signed PDF artifact exists

### Re-Consent Triggers

- Procedure plan significantly changed
- Template updated (major changes)
- New risks identified
- Patient condition changed

---

## Next Steps

1. ✅ Schema design complete
2. ⏭️ Create ProcedurePlan model (referenced but not yet created)
3. ⏭️ Implement repository layer
4. ⏭️ Implement service layer
5. ⏭️ Build controllers and endpoints
6. ⏭️ Add workflow validation
7. ⏭️ PDF generation
8. ⏭️ Integration with Consultation and SurgicalCase

---

## Questions Answered

**Q: Are consents related to procedures?**
**A:** Yes. General consents apply to all procedures. Procedure-specific consents are required per procedure and link to ProcedurePlan and SurgicalCase.

**Q: How do we integrate procedures into workflows?**
**A:** 
1. Consultation → General Consent (one-time)
2. Procedure Plan Created → Procedure-Specific Consent Instance created
3. Patient Signs → All required parties sign
4. Surgical Case Scheduled → Pre-op validates signed consent
5. Surgery → Consent linked to case

The integration is via `procedurePlanId` and `relatedCaseId` foreign keys.









