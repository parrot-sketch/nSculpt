# Database Architecture Review & Recommendations
## Enterprise Clinical Workflow Foundation - Aesthetic Surgery Center

---

## Executive Summary

This document provides a comprehensive review of the database schema architecture, identifying:
1. **Missing Constraints** - Data integrity gaps
2. **Missing Indexes** - Performance optimization opportunities
3. **Foreign Key Issues** - Referential integrity concerns
4. **Workflow Schema Gaps** - Missing support for clinical workflows
5. **Best Practice Violations** - Design pattern improvements needed

**Critical Finding**: The database foundation is **solid but incomplete**. Several critical constraints and indexes are missing that are essential for workflow integrity and data security.

---

## 1. CRITICAL MISSING CONSTRAINTS

### 1.1 Check Constraints (Data Validation)

#### ❌ Patient Model
**Missing Constraints:**
```sql
-- Status must be valid enum value
ALTER TABLE patients ADD CONSTRAINT chk_patient_status 
  CHECK (status IN ('ACTIVE', 'INACTIVE', 'DECEASED', 'ARCHIVED'));

-- Merged patients must have mergedInto set
ALTER TABLE patients ADD CONSTRAINT chk_merged_patient 
  CHECK ((status = 'ARCHIVED' AND mergedInto IS NOT NULL) OR mergedInto IS NULL);

-- Date of birth must be in the past
ALTER TABLE patients ADD CONSTRAINT chk_dob_past 
  CHECK (date_of_birth < CURRENT_DATE);

-- Email format validation (if provided)
ALTER TABLE patients ADD CONSTRAINT chk_email_format 
  CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
```

**Impact**: Invalid status values, future dates of birth, invalid emails can be inserted.

#### ❌ Consultation Model
**Missing Constraints:**
```sql
-- Status must be valid ConsultationStatus enum
ALTER TABLE consultations ADD CONSTRAINT chk_consultation_status 
  CHECK (status IN ('SCHEDULED', 'CHECKED_IN', 'IN_TRIAGE', 'IN_CONSULTATION', 
                    'PLAN_CREATED', 'CLOSED', 'FOLLOW_UP', 'REFERRED', 
                    'SURGERY_SCHEDULED', 'CANCELLED', 'NO_SHOW'));

-- CompletedAt must be after consultationDate
ALTER TABLE consultations ADD CONSTRAINT chk_consultation_completed 
  CHECK (completed_at IS NULL OR completed_at >= consultation_date);

-- Consultation date must be in the past or today
ALTER TABLE consultations ADD CONSTRAINT chk_consultation_date 
  CHECK (consultation_date <= CURRENT_TIMESTAMP);
```

**Impact**: Invalid status transitions, logical date inconsistencies.

#### ❌ ProcedurePlan Model
**Missing Constraints:**
```sql
-- Status must be valid
ALTER TABLE procedure_plans ADD CONSTRAINT chk_procedure_plan_status 
  CHECK (status IN ('DRAFT', 'APPROVED', 'SCHEDULED', 'COMPLETED', 'CANCELLED'));

-- ApprovedAt must be set when status is APPROVED
ALTER TABLE procedure_plans ADD CONSTRAINT chk_procedure_plan_approved 
  CHECK ((status = 'APPROVED' AND approved_at IS NOT NULL AND approved_by IS NOT NULL) 
         OR status != 'APPROVED');

-- PlannedDate must be in the future (if set)
ALTER TABLE procedure_plans ADD CONSTRAINT chk_procedure_plan_date 
  CHECK (planned_date IS NULL OR planned_date >= CURRENT_DATE);
```

**Impact**: Procedure plans can be marked APPROVED without approval timestamp/user.

#### ❌ SurgicalCase Model
**Missing Constraints:**
```sql
-- Status must be valid
ALTER TABLE surgical_cases ADD CONSTRAINT chk_case_status 
  CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED'));

-- ScheduledEndAt must be after scheduledStartAt
ALTER TABLE surgical_cases ADD CONSTRAINT chk_case_scheduled_times 
  CHECK (scheduled_end_at > scheduled_start_at);

-- ActualEndAt must be after actualStartAt (if both set)
ALTER TABLE surgical_cases ADD CONSTRAINT chk_case_actual_times 
  CHECK (actual_end_at IS NULL OR actual_start_at IS NULL OR actual_end_at > actual_start_at);

-- ActualStartAt must be after scheduledStartAt (if set)
ALTER TABLE surgical_cases ADD CONSTRAINT chk_case_actual_vs_scheduled 
  CHECK (actual_start_at IS NULL OR actual_start_at >= scheduled_start_at);

-- Priority must be 1-10
ALTER TABLE surgical_cases ADD CONSTRAINT chk_case_priority 
  CHECK (priority >= 1 AND priority <= 10);
```

**Impact**: Invalid time ranges, impossible scheduling scenarios.

#### ❌ TheaterReservation Model
**Missing Constraints:**
```sql
-- ReservedUntil must be after reservedFrom
ALTER TABLE theater_reservations ADD CONSTRAINT chk_reservation_times 
  CHECK (reserved_until > reserved_from);

-- Status must be valid
ALTER TABLE theater_reservations ADD CONSTRAINT chk_reservation_status 
  CHECK (status IN ('CONFIRMED', 'CANCELLED', 'COMPLETED'));
```

**Impact**: Already has unique constraint for double-booking, but time validation missing.

#### ❌ ResourceAllocation Model
**Missing Constraints:**
```sql
-- AllocatedUntil must be after allocatedFrom
ALTER TABLE resource_allocations ADD CONSTRAINT chk_allocation_times 
  CHECK (allocated_until > allocated_from);

-- Status must be valid
ALTER TABLE resource_allocations ADD CONSTRAINT chk_allocation_status 
  CHECK (status IN ('ALLOCATED', 'RELEASED', 'CANCELLED'));

-- Quantity must be positive
ALTER TABLE resource_allocations ADD CONSTRAINT chk_allocation_quantity 
  CHECK (quantity > 0);
```

**Impact**: Invalid time allocations, negative quantities.

#### ❌ PatientConsentInstance Model
**Missing Constraints:**
```sql
-- Status must be valid
ALTER TABLE patient_consent_instances ADD CONSTRAINT chk_consent_status 
  CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'PENDING_SIGNATURES', 'SIGNED', 
                    'REVOKED', 'EXPIRED', 'SUPERSEDED'));

-- SignedAt must be set when status is SIGNED
ALTER TABLE patient_consent_instances ADD CONSTRAINT chk_consent_signed 
  CHECK ((status = 'SIGNED' AND signed_at IS NOT NULL) OR status != 'SIGNED');

-- RevokedAt must be set when status is REVOKED
ALTER TABLE patient_consent_instances ADD CONSTRAINT chk_consent_revoked 
  CHECK ((status = 'REVOKED' AND revoked_at IS NOT NULL AND revoked_by IS NOT NULL) 
         OR status != 'REVOKED');

-- ExpiresAt must be in the future (if set)
ALTER TABLE patient_consent_instances ADD CONSTRAINT chk_consent_expires 
  CHECK (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP);

-- ValidUntil must be in the future (if set)
ALTER TABLE patient_consent_instances ADD CONSTRAINT chk_consent_valid_until 
  CHECK (valid_until IS NULL OR valid_until >= CURRENT_DATE);
```

**Impact**: Consents can be marked SIGNED without signature timestamp, invalid dates.

#### ❌ PatientContact Model
**Missing Constraints:**
```sql
-- At least one contact type flag must be true
ALTER TABLE patient_contacts ADD CONSTRAINT chk_contact_type 
  CHECK (is_next_of_kin = true OR is_emergency_contact = true);

-- Priority must be positive (if set)
ALTER TABLE patient_contacts ADD CONSTRAINT chk_contact_priority 
  CHECK (priority IS NULL OR priority > 0);

-- Relationship must be provided
ALTER TABLE patient_contacts ADD CONSTRAINT chk_contact_relationship 
  CHECK (relationship IS NOT NULL AND length(relationship) > 0);
```

**Impact**: Contacts can be created without type designation.

---

## 2. MISSING UNIQUE CONSTRAINTS

### 2.1 Patient Model
**Missing:**
```sql
-- Prevent duplicate emails (if email is provided)
-- Note: Current schema allows NULL emails, but if email is provided, it should be unique
-- This requires application-level logic OR partial unique index:
CREATE UNIQUE INDEX idx_patients_email_unique 
  ON patients(email) WHERE email IS NOT NULL;

-- Prevent duplicate phone numbers (if phone is provided)
CREATE UNIQUE INDEX idx_patients_phone_unique 
  ON patients(phone) WHERE phone IS NOT NULL;
```

**Impact**: Duplicate patient records with same email/phone can exist.

### 2.2 Consultation Model
**Missing:**
```sql
-- One consultation per appointment (already has unique on appointmentId - ✅ GOOD)
-- But should also ensure one consultation per patient per appointment:
-- Already enforced via appointmentId unique - ✅ GOOD
```

### 2.3 ProcedurePlan Model
**Missing:**
```sql
-- One APPROVED plan per consultation (business rule)
-- This is application-level, but could be enforced:
-- Note: Multiple plans per consultation is allowed (revisions), but only one APPROVED
-- Application-level validation needed
```

### 2.4 PatientConsentInstance Model
**Missing:**
```sql
-- One consent per procedure plan (already has unique on procedurePlanId - ✅ GOOD)
-- But should prevent multiple SIGNED consents for same plan:
-- Application-level: When creating new consent, revoke/supersede old one
```

---

## 3. MISSING INDEXES

### 3.1 Composite Indexes for Common Queries

#### Patient Model
**Missing:**
```sql
-- Common query: Find patients by name and DOB (duplicate checking)
-- Already has: @@index([firstName, lastName]) - ✅ GOOD
-- But should add:
CREATE INDEX idx_patients_name_dob ON patients(first_name, last_name, date_of_birth) 
  WHERE merged_into IS NULL;

-- Common query: Active patients by doctor
CREATE INDEX idx_patients_doctor_active ON patients(doctor_in_charge_id, status) 
  WHERE status = 'ACTIVE' AND merged_into IS NULL;
```

#### Consultation Model
**Missing:**
```sql
-- Common query: Consultations by patient and status
CREATE INDEX idx_consultations_patient_status ON consultations(patient_id, status);

-- Common query: Consultations by doctor and date range
CREATE INDEX idx_consultations_doctor_date ON consultations(doctor_id, consultation_date);
```

#### ProcedurePlan Model
**Missing:**
```sql
-- Common query: Approved plans by surgeon
CREATE INDEX idx_procedure_plans_surgeon_status ON procedure_plans(surgeon_id, status) 
  WHERE status = 'APPROVED';

-- Common query: Plans by consultation and status
CREATE INDEX idx_procedure_plans_consultation_status ON procedure_plans(consultation_id, status);
```

#### SurgicalCase Model
**Missing:**
```sql
-- Common query: Cases by patient and status
CREATE INDEX idx_cases_patient_status ON surgical_cases(patient_id, status);

-- Common query: Cases by surgeon and date range
CREATE INDEX idx_cases_surgeon_date ON surgical_cases(primary_surgeon_id, scheduled_start_at) 
  WHERE primary_surgeon_id IS NOT NULL;
```

#### PatientConsentInstance Model
**Missing:**
```sql
-- Common query: Active consents by patient
CREATE INDEX idx_consents_patient_active ON patient_consent_instances(patient_id, status) 
  WHERE status IN ('DRAFT', 'IN_PROGRESS', 'PENDING_SIGNATURES', 'SIGNED');

-- Common query: Signed consents by procedure plan
CREATE INDEX idx_consents_plan_signed ON patient_consent_instances(procedure_plan_id, status) 
  WHERE status = 'SIGNED';
```

### 3.2 Partial Indexes for Performance

**Missing:**
```sql
-- Active patients only (most common query)
CREATE INDEX idx_patients_active ON patients(id) WHERE status = 'ACTIVE' AND merged_into IS NULL;

-- Active consultations only
CREATE INDEX idx_consultations_active ON consultations(id) 
  WHERE status NOT IN ('CLOSED', 'CANCELLED', 'NO_SHOW');

-- Approved procedure plans only
CREATE INDEX idx_procedure_plans_approved ON procedure_plans(id) WHERE status = 'APPROVED';

-- Signed consents only
CREATE INDEX idx_consents_signed ON patient_consent_instances(id) 
  WHERE status = 'SIGNED' AND expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP;
```

---

## 4. FOREIGN KEY INTEGRITY ISSUES

### 4.1 Missing Foreign Key Constraints

#### ❌ Patient Model
**Missing:**
```sql
-- doctorInChargeId should reference User.id
-- Already has: ✅ GOOD

-- mergedInto should reference Patient.id (self-reference)
-- Already has: ✅ GOOD (via Prisma relation)

-- mergedBy should reference User.id
-- Missing: Should add foreign key constraint
ALTER TABLE patients ADD CONSTRAINT fk_patients_merged_by 
  FOREIGN KEY (merged_by) REFERENCES users(id) ON DELETE SET NULL;

-- createdBy should reference User.id
-- Missing: Should add foreign key constraint
ALTER TABLE patients ADD CONSTRAINT fk_patients_created_by 
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- updatedBy should reference User.id
-- Missing: Should add foreign key constraint
ALTER TABLE patients ADD CONSTRAINT fk_patients_updated_by 
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
```

**Impact**: Orphaned references if users are deleted.

#### ❌ Consultation Model
**Missing:**
```sql
-- createdBy and updatedBy should reference User.id
-- Same pattern as Patient - missing foreign keys
```

#### ❌ ProcedurePlan Model
**Missing:**
```sql
-- createdBy and updatedBy should reference User.id
-- Same pattern - missing foreign keys
```

### 4.2 Cascade Delete Issues

**Current State:**
- ✅ PatientContact: `onDelete: Cascade` - ✅ GOOD (contacts deleted with patient)
- ✅ Consultation: `onDelete: Restrict` - ✅ GOOD (prevents patient deletion if consultations exist)
- ✅ ProcedurePlan: `onDelete: Restrict` - ✅ GOOD (prevents consultation deletion if plans exist)
- ✅ PatientConsentInstance: `onDelete: Restrict` - ✅ GOOD (prevents plan deletion if consent exists)
- ✅ SurgicalCase: `onDelete: Restrict` - ✅ GOOD (prevents plan deletion if case exists)

**Recommendation**: Current cascade/restrict strategy is appropriate. No changes needed.

---

## 5. WORKFLOW SCHEMA GAPS

### 5.1 Missing Workflow State Tracking

#### ❌ Patient Workflow Status
**Missing Model:**
```prisma
model PatientWorkflowStatus {
  id          String   @id @default(uuid()) @db.Uuid
  patientId   String   @unique @db.Uuid
  
  // Workflow stages
  hasConsultation Boolean @default(false)
  hasProcedurePlan Boolean @default(false)
  hasConsent Boolean @default(false)
  hasSurgicalCase Boolean @default(false)
  
  // Current stage
  currentStage String @db.VarChar(50) // REGISTRATION, CONSULTATION, PLANNING, CONSENT, SCHEDULED, COMPLETED
  
  // Last updated
  lastUpdatedAt DateTime @updatedAt @db.Timestamptz(6)
  
  // Relations
  patient Patient @relation(fields: [patientId], references: [id], onDelete: Cascade)
  
  @@index([currentStage])
  @@index([patientId])
  @@map("patient_workflow_status")
}
```

**Impact**: Cannot efficiently query patient workflow state without complex joins.

### 5.2 Missing Appointment → Consultation Link Validation

**Current State:**
- ✅ Consultation has `appointmentId` with unique constraint
- ❌ No validation that appointment status is CONFIRMED before creating consultation

**Missing Constraint:**
```sql
-- Application-level: Validate appointment.status = 'CONFIRMED' before creating consultation
-- Database-level: Could add trigger or application validation
```

### 5.3 Missing ProcedurePlan → Consent Workflow Enforcement

**Current State:**
- ✅ Consent has `procedurePlanId` with unique constraint
- ❌ No database-level validation that ProcedurePlan.status = 'APPROVED'

**Missing:**
```sql
-- Application-level validation exists in PatientWorkflowService
-- Database-level: Could add trigger to enforce APPROVED status
```

### 5.4 Missing Consent → SurgicalCase Workflow Enforcement

**Current State:**
- ✅ SurgicalCase has `procedurePlanId` (required)
- ❌ No database-level validation that Consent.status = 'SIGNED'

**Missing:**
```sql
-- Application-level validation exists in PatientWorkflowService
-- Database-level: Could add trigger to enforce SIGNED consent
```

---

## 6. DATA INTEGRITY CONCERNS

### 6.1 Version Field Consistency

**Current State:**
- ✅ All models have `version` field
- ❌ No database-level enforcement that version increments on update

**Recommendation:**
```sql
-- Application-level: Use optimistic locking (Prisma version increment)
-- Database-level: Could add trigger to auto-increment version
```

### 6.2 Audit Field Consistency

**Current State:**
- ✅ All models have `createdAt`, `updatedAt`, `createdBy`, `updatedBy`
- ❌ No database-level enforcement that `updatedAt` changes on update

**Recommendation:**
```sql
-- Prisma handles `@updatedAt` automatically - ✅ GOOD
-- But should add triggers to ensure `updatedBy` is set on update
```

### 6.3 Soft Delete Consistency

**Current State:**
- ✅ Patient uses `status = 'ARCHIVED'` for soft delete
- ❌ No consistent pattern across all models

**Recommendation:**
- Standardize soft delete pattern:
  - Use `status` field with 'ARCHIVED' value
  - OR use `deletedAt` timestamp field
  - Currently mixed approach

---

## 7. PERFORMANCE OPTIMIZATION OPPORTUNITIES

### 7.1 Missing Full-Text Search Indexes

**Missing:**
```sql
-- Patient search by name (already has index, but could add trigram for fuzzy search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_patients_name_trgm ON patients USING gin(first_name gin_trgm_ops, last_name gin_trgm_ops);

-- Clinical notes full-text search
CREATE INDEX idx_clinical_notes_content_fts ON clinical_notes USING gin(to_tsvector('english', content));
```

### 7.2 Missing JSONB Indexes

**Missing:**
```sql
-- DomainEvent payload queries
CREATE INDEX idx_domain_events_payload ON domain_events USING gin(payload);

-- ConsentInteraction details queries
CREATE INDEX idx_consent_interactions_details ON consent_interactions USING gin(details);
```

### 7.3 Missing Partitioning Strategy

**Missing:**
```sql
-- Partition domain_events by occurredAt (monthly)
-- Partition data_access_logs by accessedAt (monthly)
-- This should be done via Prisma migrations when data volume grows
```

---

## 8. SECURITY & COMPLIANCE GAPS

### 8.1 Missing Row-Level Security (RLS) Policies

**Current State:**
- ✅ Application-level RLS via RlsGuard
- ❌ No database-level RLS policies

**Recommendation:**
```sql
-- Enable RLS on sensitive tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_consent_instances ENABLE ROW LEVEL SECURITY;

-- Create policies based on role assignments
-- This provides defense-in-depth (application + database)
```

### 8.2 Missing Encryption at Rest

**Current State:**
- ❌ No encryption at rest configuration
- ❌ No field-level encryption for sensitive data

**Recommendation:**
- Enable PostgreSQL TDE (Transparent Data Encryption)
- OR use encrypted storage volumes
- Consider field-level encryption for:
  - Patient SSN (if stored)
  - Credit card numbers (if stored)
  - Password hashes (already hashed, but ensure secure storage)

---

## 9. BEST PRACTICE VIOLATIONS

### 9.1 String Status Fields vs Enums

**Current State:**
- ❌ Many status fields use `String` instead of Prisma enums
- ✅ Some use enums (ConsultationStatus)

**Recommendation:**
```prisma
// Convert to enums for type safety
enum PatientStatus {
  ACTIVE
  INACTIVE
  DECEASED
  ARCHIVED
}

enum ProcedurePlanStatus {
  DRAFT
  APPROVED
  SCHEDULED
  COMPLETED
  CANCELLED
}

enum SurgicalCaseStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  POSTPONED
}

enum ConsentStatus {
  DRAFT
  IN_PROGRESS
  PENDING_SIGNATURES
  SIGNED
  REVOKED
  EXPIRED
  SUPERSEDED
}
```

**Impact**: Type safety, prevents invalid status values, better IDE support.

### 9.2 Missing Default Values

**Current State:**
- ✅ Most fields have defaults
- ❌ Some critical fields missing defaults

**Missing:**
```prisma
// PatientContact: At least one type flag should default
isNextOfKin Boolean @default(false) // ✅ GOOD
isEmergencyContact Boolean @default(false) // ✅ GOOD
// But should add constraint: at least one must be true

// ProcedureInventoryRequirement: quantityReserved should default to 0
quantityReserved Decimal @default(0) // ✅ GOOD
```

### 9.3 Missing Not Null Constraints

**Current State:**
- ✅ Most required fields are NOT NULL
- ❌ Some fields that should be required are nullable

**Missing:**
```prisma
// PatientContact: relationship should be required
relationship String @db.VarChar(50) // Should be required, not nullable

// Consultation: consultationType should be required
consultationType String @db.VarChar(50) // ✅ GOOD (required)
```

---

## 10. RECOMMENDED IMMEDIATE FIXES

### Priority 1: Critical Data Integrity (Week 1)

1. **Add Check Constraints**
   - Patient status validation
   - Consultation status validation
   - ProcedurePlan status validation
   - SurgicalCase time range validation
   - Consent status validation

2. **Add Foreign Key Constraints**
   - createdBy, updatedBy, mergedBy references to User
   - Apply to all models consistently

3. **Add Unique Indexes**
   - Patient email (where not null)
   - Patient phone (where not null)

### Priority 2: Performance Optimization (Week 2)

4. **Add Composite Indexes**
   - Patient name + DOB (duplicate checking)
   - Consultation patient + status
   - ProcedurePlan surgeon + status
   - Consent patient + status

5. **Add Partial Indexes**
   - Active patients only
   - Approved plans only
   - Signed consents only

### Priority 3: Workflow Support (Week 3)

6. **Add Workflow State Tracking**
   - PatientWorkflowStatus model
   - Current stage tracking
   - Efficient workflow queries

7. **Convert String Status to Enums**
   - PatientStatus enum
   - ProcedurePlanStatus enum
   - SurgicalCaseStatus enum
   - ConsentStatus enum (already exists)

### Priority 4: Security & Compliance (Week 4)

8. **Enable Row-Level Security**
   - Database-level RLS policies
   - Defense-in-depth approach

9. **Add Full-Text Search**
   - Patient name trigram indexes
   - Clinical notes FTS indexes

---

## 11. MIGRATION STRATEGY

### Phase 1: Add Constraints (Non-Breaking)
```sql
-- Add check constraints (will fail if existing data violates)
-- Must fix data first, then add constraints

-- Step 1: Fix existing data
UPDATE patients SET status = 'ACTIVE' WHERE status NOT IN ('ACTIVE', 'INACTIVE', 'DECEASED', 'ARCHIVED');

-- Step 2: Add constraints
ALTER TABLE patients ADD CONSTRAINT chk_patient_status 
  CHECK (status IN ('ACTIVE', 'INACTIVE', 'DECEASED', 'ARCHIVED'));
```

### Phase 2: Add Indexes (Non-Breaking)
```sql
-- Indexes can be added without breaking existing queries
-- Add during low-traffic periods

CREATE INDEX CONCURRENTLY idx_patients_name_dob 
  ON patients(first_name, last_name, date_of_birth) 
  WHERE merged_into IS NULL;
```

### Phase 3: Add Foreign Keys (Requires Data Cleanup)
```sql
-- Step 1: Clean orphaned references
DELETE FROM patients WHERE created_by NOT IN (SELECT id FROM users);

-- Step 2: Add foreign keys
ALTER TABLE patients ADD CONSTRAINT fk_patients_created_by 
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
```

### Phase 4: Convert to Enums (Breaking Change)
```prisma
// Requires migration with data transformation
// 1. Create enum type
// 2. Add new enum column
// 3. Migrate data
// 4. Drop old column
// 5. Rename new column
```

---

## 12. TESTING CHECKLIST

### Data Integrity Tests
- [ ] Cannot insert invalid status values
- [ ] Cannot insert future dates of birth
- [ ] Cannot insert invalid email formats
- [ ] Cannot create consultation with invalid appointment status
- [ ] Cannot create consent without APPROVED procedure plan
- [ ] Cannot create surgical case without SIGNED consent

### Performance Tests
- [ ] Patient duplicate checking query < 100ms
- [ ] Consultation list by patient < 50ms
- [ ] Procedure plan approval query < 50ms
- [ ] Consent status check < 50ms

### Workflow Tests
- [ ] Patient workflow state accurately reflects current stage
- [ ] Workflow transitions are validated at database level
- [ ] Cannot skip workflow stages

---

## Conclusion

The database schema is **architecturally sound** but **missing critical constraints and indexes** that are essential for:
1. **Data Integrity** - Prevent invalid data insertion
2. **Workflow Enforcement** - Ensure chronological workflow compliance
3. **Performance** - Optimize common queries
4. **Security** - Defense-in-depth with database-level RLS

**Immediate Action Required:**
1. Add check constraints for all status fields
2. Add foreign key constraints for audit fields
3. Add composite indexes for common queries
4. Convert string status fields to enums

This will create a **bulletproof database foundation** that supports enterprise clinical workflows with data integrity, performance, and security.

---

**Next Steps:**
1. Review this document with DBA and clinical informatics team
2. Prioritize fixes based on business impact
3. Create migration scripts for each phase
4. Test thoroughly in staging before production deployment






