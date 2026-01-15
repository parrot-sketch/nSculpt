# Consent Module Integration with Patient Module

**Date**: 2026-01-03  
**Status**: 📋 **ROADMAP - Ready for Discussion**

---

## Current State

### ✅ Database Relationship
- `PatientConsentInstance.patientId` → `Patient.id` (foreign key exists)
- Relationship is already established in Prisma schema
- `Patient` model has `consentInstances PatientConsentInstance[]` relation

### ✅ Consent Module Exists
- Consent templates, sections, clauses
- Patient consent instances
- Consent acknowledgments
- Consent artifacts (PDFs, screenshots)
- Consent repository and service
- Consent controller

### ⚠️ Integration Points Needed

1. **Patient Service** - Include consent instances in patient queries
2. **Patient Controller** - Endpoint to get patient consents
3. **Patient Detail View** - Show consent status/history
4. **Consent Validation** - Check consent before procedures

---

## Integration Opportunities

### 1. Patient Service Enhancement

**Current**: `findById()` returns patient with related data

**Enhancement**: Include consent instances in patient detail

```typescript
// In PatientRepository.findById()
include: {
  consentInstances: {
    where: { status: { not: 'REVOKED' } }, // Only active consents
    orderBy: { signedAt: 'desc' },
    include: {
      template: { select: { name: true, templateCode: true } },
      acknowledgments: true,
    },
  },
}
```

**Benefit**: Patient detail includes consent history

---

### 2. Patient Consent Endpoint

**New Endpoint**: `GET /patients/:id/consents`

**Purpose**: Get all consents for a patient

**Response**:
```json
{
  "patientId": "uuid",
  "consents": [
    {
      "id": "uuid",
      "instanceNumber": "CONSENT-2026-00001",
      "template": {
        "name": "Rhinoplasty Consent",
        "templateCode": "RHINOPLASTY_V1"
      },
      "status": "SIGNED",
      "signedAt": "2026-01-01T10:00:00Z",
      "expiresAt": "2027-01-01T10:00:00Z"
    }
  ],
  "activeConsents": 2,
  "expiredConsents": 1,
  "revokedConsents": 0
}
```

**Benefit**: Dedicated endpoint for consent management

---

### 3. Consent Status in Patient List

**Enhancement**: Add consent status indicator to patient list

**Fields**:
- `hasActiveConsent: boolean`
- `latestConsentDate: Date | null`
- `consentCount: number`

**Benefit**: Quick visibility of consent status

---

### 4. Consent Validation Before Procedures

**Integration Point**: Before creating surgical case

**Check**:
- Does patient have active consent for procedure?
- Is consent expired?
- Is consent revoked?

**Benefit**: Prevents procedures without valid consent

---

## Incremental Implementation Plan

### Phase 1: Patient Detail Enhancement (Low Risk)
**Goal**: Include consent instances in patient detail query

**Changes**:
- Update `PatientRepository.findById()` to include consents
- No API changes (already included in response)

**Effort**: 30 minutes

---

### Phase 2: Patient Consents Endpoint (Medium Risk)
**Goal**: Dedicated endpoint for patient consents

**Changes**:
- Add `GET /patients/:id/consents` endpoint
- Create `PatientConsentService.getPatientConsents()`
- Add DTO for response

**Effort**: 1-2 hours

---

### Phase 3: Consent Status Indicators (Low Risk)
**Goal**: Add consent status to patient list

**Changes**:
- Update `PatientRepository.findAll()` to include consent counts
- Add computed fields to response

**Effort**: 1 hour

---

### Phase 4: Consent Validation (High Value)
**Goal**: Validate consent before procedures

**Changes**:
- Add `ConsentValidationService`
- Integrate into surgical case creation
- Return clear error if consent missing

**Effort**: 2-3 hours

---

## Concerns to Address

### 1. Consent Expiration
- How to handle expired consents?
- Should expired consents block procedures?
- How to notify about expiring consents?

### 2. Consent Revocation
- What happens to procedures scheduled after revocation?
- How to handle partial revocations?
- Event anchoring for revocation (already implemented ✅)

### 3. Consent Templates
- How to link procedures to consent templates?
- How to handle template versioning?
- How to ensure correct template is used?

### 4. Consent Workflow
- Who can present consent? (Front Desk? Nurse? Doctor?)
- Who can witness consent?
- How to handle proxy consent (authorized representative)?

---

## Recommended Next Steps

### Immediate (After Lifecycle Operations)
1. ✅ **Enhance Patient Detail** - Include consent instances (Phase 1)
2. ✅ **Add Consent Endpoint** - `GET /patients/:id/consents` (Phase 2)

### Short Term
3. ⚠️ **Consent Status Indicators** - Add to patient list (Phase 3)
4. ⚠️ **Consent Validation** - Before procedures (Phase 4)

### Long Term
5. 📋 **Consent Workflow** - Presentation, witnessing, signing
6. 📋 **Consent Notifications** - Expiration warnings
7. 📋 **Consent Analytics** - Reporting and compliance

---

## Questions to Answer

1. **When should consent be required?**
   - All procedures?
   - Only surgical procedures?
   - Procedure-specific?

2. **Who can manage consents?**
   - Front Desk can present?
   - Nurses can present?
   - Only Doctors can present?

3. **How to handle consent expiration?**
   - Block procedures?
   - Warn but allow?
   - Auto-renew?

4. **How to handle consent revocation?**
   - Block future procedures?
   - Cancel scheduled procedures?
   - Allow with override?

---

## Summary

**Current State**: ✅ Consent module exists and is linked to patients

**Integration Opportunities**:
- Patient detail includes consents
- Dedicated consent endpoint
- Consent status indicators
- Consent validation before procedures

**Recommended Approach**: Incremental, starting with patient detail enhancement

**Next Step**: Discuss consent workflow requirements, then implement Phase 1 & 2

---

**Status**: 📋 **READY FOR DISCUSSION AND INCREMENTAL IMPLEMENTATION**









