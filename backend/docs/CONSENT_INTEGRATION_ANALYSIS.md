# PDF Consent Integration Analysis

## Part 1: Current State Analysis

### Integration Points Identified

#### 1. Patient Module
**Current State:**
- Patient service has `findOne()`, `update()`, `mergePatients()`, `restrictPatient()`
- Patient repository has basic CRUD operations
- Field-level permissions enforced via `PatientFieldPermissionService`
- RLS validation via `RlsValidationService.canAccessPatient()`
- Patient controller exposes basic endpoints

**Gaps:**
- ❌ No consent-related endpoints on patient controller
- ❌ No consent queries in patient repository
- ❌ Patient merge doesn't handle consent migration
- ❌ Patient archive doesn't handle consent read-only state
- ❌ Restricted patients don't have special consent access rules

**Where Consents Attach:**
- Consents MUST belong to a patient (already enforced via FK)
- Patient profile should expose consents as first-class objects
- Patient lifecycle events (merge, archive, restrict) should affect consents

#### 2. Consultation Module
**Current State:**
- Consultation service has state machine (SCHEDULED → CHECKED_IN → IN_TRIAGE → IN_CONSULTATION → PLAN_CREATED → CLOSED/FOLLOW_UP/REFERRED/SURGERY_SCHEDULED)
- Consultation repository has basic operations
- Consultation controller exposes endpoints

**Gaps:**
- ❌ No consent generation trigger from consultation
- ❌ No consent status check before SURGERY_SCHEDULED transition
- ❌ Consultation doesn't expose linked consents

**Where Consents Attach:**
- Consents link to consultations via `consultationId`
- Consultation state transitions should validate consent status
- Consultation page should show consent status

#### 3. EMR Module
**Current State:**
- EMRNoteService has `addAddendum()` method
- EMR notes are append-only
- Notes link to consultations

**Gaps:**
- ❌ No automatic addendum on consent sign (we implemented this but need to verify integration)
- ❌ No addendum on consent revoke (we implemented this but need to verify)
- ❌ No event-driven EMR updates

**Where Consents Attach:**
- EMR addendums should be created when consent is signed
- EMR addendums should be created when consent is revoked
- EMR notes should reference consent IDs

#### 4. Consent Module (Our Implementation)
**Current State:**
- PDFConsentService has full workflow
- PDFConsentRepository has basic CRUD
- Events are emitted but not consumed

**Gaps:**
- ❌ No patient-centric queries (getConsentsByPatient, getActiveConsents, etc.)
- ❌ No patient lifecycle integration (merge, archive, restrict)
- ❌ RLS validation exists but needs enhancement for restricted patients
- ❌ No event handlers for consent events

#### 5. RBAC Layer
**Current State:**
- RolesGuard validates roles
- PermissionsGuard validates permissions
- RlsGuard validates row-level access
- IdentityContextService provides role checks

**Gaps:**
- ❌ No consent-specific permission checks
- ❌ Front desk permissions not fully enforced (can view status but not documents)
- ❌ Patient role not properly handled for consent signing
- ❌ Admin override not consistently enforced

**Where Permissions Must Be Enforced:**
- Template upload: ADMIN only
- Consent generation: DOCTOR, NURSE, ADMIN
- Consent signing: Role-based (PATIENT, DOCTOR, NURSE_WITNESS, ADMIN with override)
- Consent viewing: Role-based (FRONT_DESK can see status, not content)
- Consent revocation: DOCTOR, ADMIN only
- Consent archive: ADMIN only

#### 6. Audit Logging
**Current State:**
- DataAccessLogInterceptor logs all access
- DomainEventService creates events
- RlsValidationService validates access

**Gaps:**
- ❌ No specific consent access logging (PDF views/downloads)
- ❌ No consent-specific audit trail queries

#### 7. Domain Events
**Current State:**
- Events are created via DomainEventService
- Events are stored in database
- No event handlers/listeners exist

**Gaps:**
- ❌ No event handlers to consume consent events
- ❌ No patient timeline updates from consent events
- ❌ No EMR updates from consent events (we implemented direct calls, but should be event-driven)
- ❌ No notification system for consent events

**Where Events Should Propagate:**
- Consent.Created → Patient timeline, Consultation update
- Consent.SentForSignature → Notifications
- Consent.PartiallySigned → Status updates
- Consent.Signed → EMR addendum, Patient timeline, Consultation update
- Consent.Revoked → EMR addendum, Patient timeline, Notifications
- Consent.Archived → Audit log

### Duplicate Responsibilities

1. **RLS Validation:**
   - `RlsValidationService.canAccessConsent()` exists but only checks patient access
   - Should also check restricted patient rules
   - Should check consultation access

2. **EMR Integration:**
   - Currently done directly in PDFConsentService
   - Should be event-driven for better decoupling

3. **Access Logging:**
   - DataAccessLogInterceptor logs all requests
   - But no specific consent PDF view/download logging

## Part 2: Integration Requirements

### Patient-Centric Linking

**Required:**
1. Patient profile must expose consents as first-class objects
2. Patient repository needs consent queries:
   - `getConsentsByPatient(patientId, includeArchived)`
   - `getActiveConsents(patientId)`
   - `getRevokedConsents(patientId)`
3. Patient lifecycle integration:
   - Archive → Consents become read-only
   - Merge → Consents migrate to surviving MRN with audit
   - Restrict → Only Admin + assigned Doctor can view

### RBAC Rules (Strict)

**ADMIN:**
- Full visibility
- Can upload templates
- Can revoke
- Can archive
- Can override signature order (with reason)

**DOCTOR / SURGEON:**
- Can initiate consent for their consultation
- Can sign AFTER patient
- Can revoke ONLY before surgery request is scheduled
- Cannot modify templates

**NURSE:**
- Can generate consent draft
- Cannot sign on behalf of anyone
- Can monitor signature progress
- Cannot revoke or archive

**FRONT_DESK:**
- Can view status only
- Cannot open document
- Cannot sign
- Cannot manage

**PATIENT:**
- Only sign THEIR consents
- Only see documents assigned to them

### Field-Level + State-Level Protection

**Required:**
1. No consent becomes editable once signed
2. No signatures happen out of order
3. No one signs for someone else
4. Revocation blocked if:
   - Surgery scheduled
   - Consent already archived
5. Archive allowed ONLY for SIGNED or REVOKED
6. Clear structured errors with codes

### Event Integration

**Required Event Handlers:**
1. Consent.Created → Update patient timeline
2. Consent.Signed → Generate EMR addendum, update timeline
3. Consent.Revoked → Generate EMR addendum, update timeline
4. Consent.Archived → Log audit event

**Note:** Since no event handler infrastructure exists, we'll:
- Keep direct EMR calls for now (already implemented)
- Document event handler pattern for future implementation
- Ensure events are properly emitted for future handlers

## Part 3: Implementation Plan

### Phase 1: Patient Repository Enhancement
- Add consent query methods
- Add patient lifecycle hooks

### Phase 2: Patient Service Enhancement
- Add consent retrieval methods
- Integrate with patient lifecycle (merge, archive, restrict)

### Phase 3: Patient Controller Enhancement
- Add `/patients/:id/consents` endpoint
- Add consent filtering options

### Phase 4: RBAC Enhancement
- Add consent-specific permission checks
- Enhance RLS validation for restricted patients
- Add field-level access control for consent data

### Phase 5: State Protection
- Add comprehensive validation
- Add structured error responses
- Add optimistic locking checks

### Phase 6: Event Documentation
- Document event handler pattern
- Ensure all events properly emitted
- Document integration points

### Phase 7: Testing
- Integration tests for all scenarios
- RBAC test coverage
- State transition test coverage









