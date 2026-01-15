# Patient Module Audit & Enhancement Plan
## Surgical EHR Backend - NestJS + Prisma + PostgreSQL

**Date**: 2026-01-03  
**Status**: Audit Complete - Enhancement Recommendations Ready

---

## Executive Summary

The Patient Module is **partially implemented** with critical gaps:
- ✅ Controllers, Services, DTOs exist with proper guards
- ❌ **NO Patient Prisma model exists** (repository is placeholder)
- ❌ Missing compliance fields (MRN, status, privacy controls)
- ❌ No role-based field-level permissions
- ⚠️ Soft delete/archive not implemented
- ⚠️ Audit trail incomplete

**Risk Level**: **HIGH** - Patient is core identity record, referenced by all clinical modules.

---

## Step 1: Current Implementation Analysis

### 1.1 What Exists

#### Controllers (`patient.controller.ts`)
- ✅ Proper guard stack: `RolesGuard`, `RlsGuard`, `PermissionsGuard`
- ✅ `DataAccessLogInterceptor` for audit logging
- ✅ Role-based endpoints:
  - `POST /patients` - ADMIN, NURSE, DOCTOR (write)
  - `GET /patients` - ADMIN, NURSE, DOCTOR (read)
  - `GET /patients/:id` - ADMIN, NURSE, DOCTOR (read)
  - `PATCH /patients/:id` - ADMIN, NURSE, DOCTOR (write)
  - `DELETE /patients/:id` - ADMIN only (delete)

#### Services (`patient.service.ts`)
- ✅ Domain event emission (CREATED, UPDATED, ARCHIVED)
- ✅ RLS validation via `RlsValidationService`
- ✅ Correlation context tracking
- ⚠️ Uses placeholder repository

#### Repository (`patient.repository.ts`)
- ❌ **ALL METHODS ARE PLACEHOLDERS** - No actual database operations
- Methods exist but throw errors or return placeholders

#### DTOs
- ✅ `CreatePatientDto` - Basic demographics
- ✅ `UpdatePatientDto` - Partial updates
- ⚠️ Missing validation for compliance fields

### 1.2 Critical Gaps

#### Missing Prisma Model
**CRITICAL**: No `Patient` model exists in schema. All other modules reference `patientId` as UUID, but:
- No foreign key constraints
- No referential integrity
- No patient data persistence
- Repository cannot function

**Impact**: System cannot create, read, or manage patient records.

#### Missing Compliance Fields
- ❌ MRN (Medical Record Number) - Required for HIPAA
- ❌ Status enum (ACTIVE, INACTIVE, DECEASED, ARCHIVED)
- ❌ Restricted flag (privacy-sensitive patients)
- ❌ Deceased date/time
- ❌ Archive date/time

#### Missing Audit Fields
- ⚠️ `createdBy` / `updatedBy` - Not in DTOs
- ⚠️ Version tracking incomplete
- ⚠️ No change history table

#### Missing Relationships
- ❌ PatientContacts (emergency contacts, family)
- ❌ PatientDocuments (ID documents, insurance cards)
- ❌ PatientAllergies (allergy tracking)
- ❌ PatientRiskFlags (clinical risk indicators)

#### Role-Based Field Restrictions
- ❌ No field-level permission checks
- ❌ Front Desk can modify clinical data (allergies, risk flags)
- ❌ Nurse can modify core identity (MRN, demographics)

---

## Step 2: Proposed Prisma Model Enhancements

### 2.1 Core Patient Model

**File**: `backend/prisma/schema/patient.prisma` (NEW FILE)

```prisma
// ============================================================================
// PATIENT
// Source: schema/patient.prisma
// ============================================================================

// Patient: Core Identity Record
// HIPAA-compliant patient registry with privacy controls

enum PatientStatus {
  ACTIVE      // Active patient
  INACTIVE    // Inactive (no recent visits)
  DECEASED    // Patient deceased
  ARCHIVED    // Archived (merged or historical)
}

model Patient {
  id          String   @id @default(uuid()) @db.Uuid
  
  // CRITICAL: Medical Record Number (MRN) - Unique identifier
  mrn         String   @unique @db.VarChar(50) // Format: MRN-YYYY-XXXXX
  
  // Core Identity (Demographics)
  firstName   String   @db.VarChar(100)
  lastName    String   @db.VarChar(100)
  middleName  String?  @db.VarChar(100)
  dateOfBirth DateTime @db.Date
  gender      String?  @db.VarChar(20) // MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY
  bloodType   String?  @db.VarChar(10) // A+, B-, O+, AB-, etc.
  
  // Contact Information
  email       String?  @db.VarChar(255)
  phone       String?  @db.VarChar(50)
  phoneSecondary String? @db.VarChar(50)
  
  // Address
  addressLine1 String? @db.VarChar(200)
  addressLine2 String? @db.VarChar(200)
  city        String?  @db.VarChar(100)
  state       String?  @db.VarChar(50)
  zipCode     String?  @db.VarChar(20)
  country     String?  @db.VarChar(100) @default("USA")
  
  // Compliance & Privacy
  status      PatientStatus @default(ACTIVE)
  restricted  Boolean  @default(false) // Privacy-sensitive patient (VIP, celebrity, etc.)
  restrictedReason String? @db.Text // Why restricted (for audit)
  restrictedBy String? @db.Uuid // Who restricted (for audit)
  restrictedAt DateTime? @db.Timestamptz(6)
  
  // Deceased Information
  deceased    Boolean  @default(false)
  deceasedAt  DateTime? @db.Timestamptz(6)
  deceasedBy  String?  @db.Uuid // User who recorded death
  
  // Archive Information
  archived    Boolean  @default(false)
  archivedAt  DateTime? @db.Timestamptz(6)
  archivedBy  String?  @db.Uuid
  archivedReason String? @db.Text
  
  // Merge Information (for duplicate resolution)
  mergedInto  String?  @db.Uuid // If merged, reference to primary patient
  mergedAt    DateTime? @db.Timestamptz(6)
  mergedBy   String?   @db.Uuid
  
  // Audit (CRITICAL for compliance)
  createdAt   DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime  @updatedAt @db.Timestamptz(6)
  createdBy   String?   @db.Uuid
  updatedBy   String?   @db.Uuid
  version     Int       @default(1) // Optimistic locking
  
  // Relations
  createdByUser User?   @relation("PatientCreatedBy", fields: [createdBy], references: [id])
  updatedByUser User?   @relation("PatientUpdatedBy", fields: [updatedBy], references: [id])
  restrictedByUser User? @relation("PatientRestrictedBy", fields: [restrictedBy], references: [id])
  deceasedByUser User?  @relation("PatientDeceasedBy", fields: [deceasedBy], references: [id])
  archivedByUser User?  @relation("PatientArchivedBy", fields: [archivedBy], references: [id])
  mergedByUser User?   @relation("PatientMergedBy", fields: [mergedBy], references: [id])
  
  // Related Data
  contacts    PatientContact[]
  documents   PatientDocument[]
  allergies   PatientAllergy[]
  riskFlags   PatientRiskFlag[]
  surgicalCases SurgicalCase[]
  medicalRecords MedicalRecord[]
  consentInstances PatientConsentInstance[]
  bills       Bill[]
  insurancePolicies InsurancePolicy[]
  
  // Merge History
  mergeHistory PatientMergeHistory[] @relation("SourcePatient")
  mergedPatients PatientMergeHistory[] @relation("TargetPatient")
  
  @@index([mrn])
  @@index([status])
  @@index([restricted])
  @@index([deceased])
  @@index([archived])
  @@index([mergedInto])
  @@index([createdAt])
  @@index([lastName, firstName]) // For name searches
  @@index([dateOfBirth])
  @@map("patients")
}
```

### 2.2 Supporting Models

```prisma
// Emergency Contacts & Family
model PatientContact {
  id          String   @id @default(uuid()) @db.Uuid
  patientId   String   @db.Uuid
  
  // Contact Information
  firstName   String   @db.VarChar(100)
  lastName    String   @db.VarChar(100)
  relationship String  @db.VarChar(50) // SPOUSE, PARENT, CHILD, SIBLING, FRIEND, OTHER
  phone       String?  @db.VarChar(50)
  email       String?  @db.VarChar(255)
  address     String?  @db.VarChar(500)
  
  // Priority (for emergency contacts)
  isEmergencyContact Boolean @default(false)
  priority    Int?     @db.Integer // 1 = primary, 2 = secondary, etc.
  
  // Notes
  notes       String?  @db.Text
  
  // Audit
  createdAt   DateTime @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime @updatedAt @db.Timestamptz(6)
  createdBy   String?  @db.Uuid
  version     Int      @default(1)
  
  // Relations
  patient     Patient  @relation(fields: [patientId], references: [id], onDelete: Cascade)
  
  @@index([patientId])
  @@index([isEmergencyContact])
  @@map("patient_contacts")
}

// Identity Documents & Insurance Cards
model PatientDocument {
  id          String   @id @default(uuid()) @db.Uuid
  patientId   String   @db.Uuid
  
  // Document Type
  documentType String  @db.VarChar(50) // ID_CARD, INSURANCE_CARD, PASSPORT, DRIVER_LICENSE, OTHER
  documentNumber String? @db.VarChar(100) // ID number, policy number, etc.
  
  // File Storage
  fileName    String   @db.VarChar(500)
  filePath    String   @db.VarChar(1000)
  fileSize    BigInt   @db.BigInt
  mimeType    String   @db.VarChar(100)
  
  // Metadata
  issuedBy    String?  @db.VarChar(200) // Issuing authority
  issuedDate  DateTime? @db.Date
  expiryDate  DateTime? @db.Date
  isVerified  Boolean  @default(false) // Front desk verified document authenticity
  
  // Notes
  notes       String?  @db.Text
  
  // Audit
  createdAt   DateTime @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime @updatedAt @db.Timestamptz(6)
  createdBy   String?  @db.Uuid
  verifiedBy  String?  @db.Uuid // User who verified document
  version     Int      @default(1)
  
  // Relations
  patient     Patient  @relation(fields: [patientId], references: [id], onDelete: Cascade)
  
  @@index([patientId])
  @@index([documentType])
  @@index([isVerified])
  @@map("patient_documents")
}

// Allergy Tracking
model PatientAllergy {
  id          String   @id @default(uuid()) @db.Uuid
  patientId   String   @db.Uuid
  
  // Allergy Information
  allergen    String   @db.VarChar(200) // Drug name, food, environmental, etc.
  allergyType String   @db.VarChar(50) // DRUG, FOOD, ENVIRONMENTAL, OTHER
  severity    String   @db.VarChar(50) // MILD, MODERATE, SEVERE, LIFE_THREATENING
  reaction    String?  @db.Text // Description of reaction
  
  // Clinical Context
  diagnosedAt DateTime? @db.Date
  diagnosedBy String?  @db.Uuid // User who recorded allergy
  
  // Status
  active      Boolean  @default(true) // Can be resolved/removed if false
  
  // Notes
  notes       String?  @db.Text
  
  // Audit
  createdAt   DateTime @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime @updatedAt @db.Timestamptz(6)
  createdBy   String?  @db.Uuid
  version     Int      @default(1)
  
  // Relations
  patient     Patient  @relation(fields: [patientId], references: [id], onDelete: Cascade)
  
  @@index([patientId])
  @@index([allergyType])
  @@index([active])
  @@map("patient_allergies")
}

// Clinical Risk Flags (cannot be modified by Front Desk)
model PatientRiskFlag {
  id          String   @id @default(uuid()) @db.Uuid
  patientId   String   @db.Uuid
  
  // Risk Information
  flagType    String   @db.VarChar(50) // FALL_RISK, INFECTION_RISK, BLEEDING_RISK, ALLERGY_RISK, etc.
  severity    String   @db.VarChar(50) // LOW, MEDIUM, HIGH, CRITICAL
  description String?  @db.Text
  
  // Clinical Context
  setBy       String   @db.Uuid // User who set flag (must be clinical staff)
  setAt       DateTime @default(now()) @db.Timestamptz(6)
  
  // Status
  active      Boolean  @default(true)
  clearedBy    String?  @db.Uuid
  clearedAt   DateTime? @db.Timestamptz(6)
  
  // Notes
  notes       String?  @db.Text
  
  // Audit
  createdAt   DateTime @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime @updatedAt @db.Timestamptz(6)
  version     Int      @default(1)
  
  // Relations
  patient     Patient  @relation(fields: [patientId], references: [id], onDelete: Cascade)
  
  @@index([patientId])
  @@index([flagType])
  @@index([active])
  @@map("patient_risk_flags")
}

// Merge History (for duplicate resolution audit)
model PatientMergeHistory {
  id          String   @id @default(uuid()) @db.Uuid
  sourcePatientId String @db.Uuid // Duplicate patient (merged from)
  targetPatientId String @db.Uuid // Primary patient (merged into)
  
  // Merge Details
  mergedAt    DateTime @default(now()) @db.Timestamptz(6)
  mergedBy   String   @db.Uuid
  reason     String?  @db.Text
  
  // Event Anchoring
  mergeEventId String? @db.Uuid // DomainEvent that triggered merge
  
  // Relations
  sourcePatient Patient @relation("SourcePatient", fields: [sourcePatientId], references: [id])
  targetPatient Patient @relation("TargetPatient", fields: [targetPatientId], references: [id])
  mergeEvent   DomainEvent? @relation("PatientMergeEvent", fields: [mergeEventId], references: [id])
  
  @@index([sourcePatientId])
  @@index([targetPatientId])
  @@index([mergedAt])
  @@map("patient_merge_history")
}
```

### 2.3 Update User Model Relations

Add to `backend/prisma/schema/rbac.prisma`:

```prisma
// In User model, add:
  // Patient relations (for audit)
  createdPatients Patient[] @relation("PatientCreatedBy")
  updatedPatients Patient[] @relation("PatientUpdatedBy")
  restrictedPatients Patient[] @relation("PatientRestrictedBy")
  deceasedPatients Patient[] @relation("PatientDeceasedBy")
  archivedPatients Patient[] @relation("PatientArchivedBy")
  mergedPatients Patient[] @relation("PatientMergedBy")
```

### 2.4 Why Each Field Matters

| Field | Clinical/Legal Rationale |
|-------|-------------------------|
| `mrn` | **HIPAA Requirement**: Unique identifier for patient records. Required for legal record keeping. |
| `status` | **Compliance**: Tracks patient lifecycle. DECEASED prevents accidental scheduling. ARCHIVED preserves historical data. |
| `restricted` | **Privacy**: VIP/celebrity patients need enhanced privacy. Logs all access attempts. |
| `deceased` / `deceasedAt` | **Legal**: Death must be recorded with timestamp and user. Prevents post-mortem procedures. |
| `archived` / `archivedAt` | **Compliance**: Soft delete preserves audit trail. Required for legal discovery. |
| `mergedInto` | **Data Quality**: Tracks duplicate resolution. Maintains referential integrity. |
| `version` | **Concurrency**: Optimistic locking prevents lost updates in multi-user scenarios. |
| `createdBy` / `updatedBy` | **Audit**: HIPAA requires tracking who created/modified records. |

---

## Step 3: Role-Based Responsibilities & Permissions

### 3.1 Role Permission Matrix

| Action | Admin | Front Desk | Nurse | Doctor |
|--------|-------|------------|-------|--------|
| **Create Patient** | ✅ | ✅ | ✅ | ✅ |
| **View Patient** | ✅ All | ✅ All | ✅ Assigned | ✅ Assigned |
| **Update Demographics** | ✅ | ✅ | ❌ | ❌ |
| **Update Clinical Data** | ✅ | ❌ | ✅ | ✅ |
| **Add/Edit Allergies** | ✅ | ❌ | ✅ | ✅ |
| **Add/Edit Risk Flags** | ✅ | ❌ | ✅ | ✅ |
| **Attach Documents** | ✅ | ✅ | ❌ | ❌ |
| **Restrict Patient** | ✅ | ❌ | ❌ | ❌ |
| **Merge Patients** | ✅ | ❌ | ❌ | ❌ |
| **Archive Patient** | ✅ | ❌ | ❌ | ❌ |
| **Delete Patient** | ❌ | ❌ | ❌ | ❌ |
| **View Audit Logs** | ✅ | ❌ | ❌ | ❌ |

### 3.2 Permission Codes

Add to permission seed:

```typescript
// Patient permissions
{ code: 'patients:*:read', domain: 'MEDICAL_RECORDS', resource: 'Patient', action: 'read' },
{ code: 'patients:*:write', domain: 'MEDICAL_RECORDS', resource: 'Patient', action: 'write' },
{ code: 'patients:*:delete', domain: 'MEDICAL_RECORDS', resource: 'Patient', action: 'delete' },
{ code: 'patients:demographics:write', domain: 'MEDICAL_RECORDS', resource: 'Patient', action: 'write' }, // Front Desk only
{ code: 'patients:clinical:write', domain: 'MEDICAL_RECORDS', resource: 'Patient', action: 'write' }, // Nurse/Doctor only
{ code: 'patients:restrict:write', domain: 'MEDICAL_RECORDS', resource: 'Patient', action: 'write' }, // Admin only
{ code: 'patients:merge:write', domain: 'MEDICAL_RECORDS', resource: 'Patient', action: 'write' }, // Admin only
{ code: 'patients:archive:write', domain: 'MEDICAL_RECORDS', resource: 'Patient', action: 'write' }, // Admin only
{ code: 'patients:audit:read', domain: 'AUDIT', resource: 'Patient', action: 'read' }, // Admin only
```

### 3.3 Field-Level Permission Checks

**Implementation Strategy**: Create a `PatientFieldPermissionService`:

```typescript
// backend/src/modules/patient/services/patientFieldPermission.service.ts
@Injectable()
export class PatientFieldPermissionService {
  constructor(private identityContext: IdentityContextService) {}

  canEditDemographics(): boolean {
    // Admin or Front Desk
    return (
      this.identityContext.hasRole('ADMIN') ||
      this.identityContext.hasPermission('patients:demographics:write')
    );
  }

  canEditClinicalData(): boolean {
    // Admin, Nurse, or Doctor
    return (
      this.identityContext.hasRole('ADMIN') ||
      this.identityContext.hasPermission('patients:clinical:write')
    );
  }

  canEditAllergies(): boolean {
    return this.canEditClinicalData();
  }

  canEditRiskFlags(): boolean {
    return this.canEditClinicalData();
  }

  canAttachDocuments(): boolean {
    // Admin or Front Desk
    return (
      this.identityContext.hasRole('ADMIN') ||
      this.identityContext.hasPermission('patients:demographics:write')
    );
  }

  canRestrictPatient(): boolean {
    return this.identityContext.hasPermission('patients:restrict:write');
  }

  canMergePatients(): boolean {
    return this.identityContext.hasPermission('patients:merge:write');
  }

  canArchivePatient(): boolean {
    return this.identityContext.hasPermission('patients:archive:write');
  }

  canViewAuditLogs(): boolean {
    return this.identityContext.hasPermission('patients:audit:read');
  }
}
```

### 3.4 Controller Updates

**File**: `backend/src/modules/patient/controllers/patient.controller.ts`

```typescript
// Add new endpoints with specific permissions:

@Post(':id/restrict')
@Roles('ADMIN')
@Permissions('patients:restrict:write')
async restrictPatient(
  @Param('id') id: string,
  @Body() dto: { reason: string },
  @CurrentUser() user: UserIdentity,
) {
  return this.patientService.restrictPatient(id, dto.reason, user.id);
}

@Post(':id/unrestrict')
@Roles('ADMIN')
@Permissions('patients:restrict:write')
async unrestrictPatient(
  @Param('id') id: string,
  @CurrentUser() user: UserIdentity,
) {
  return this.patientService.unrestrictPatient(id, user.id);
}

@Post(':id/merge')
@Roles('ADMIN')
@Permissions('patients:merge:write')
async mergePatients(
  @Param('id') sourceId: string,
  @Body() dto: { targetPatientId: string; reason?: string },
  @CurrentUser() user: UserIdentity,
) {
  return this.patientService.mergePatients(sourceId, dto.targetPatientId, dto.reason, user.id);
}

@Post(':id/archive')
@Roles('ADMIN')
@Permissions('patients:archive:write')
async archivePatient(
  @Param('id') id: string,
  @Body() dto: { reason?: string },
  @CurrentUser() user: UserIdentity,
) {
  return this.patientService.archivePatient(id, dto.reason, user.id);
}

@Get(':id/audit-logs')
@Roles('ADMIN')
@Permissions('patients:audit:read')
async getAuditLogs(
  @Param('id') id: string,
  @Query('skip', ParseIntPipe) skip?: number,
  @Query('take', ParseIntPipe) take?: number,
) {
  return this.patientService.getAuditLogs(id, skip, take);
}
```

---

## Step 4: Compliance & Safety Enhancements

### 4.1 Access Log Tracking

**Already Implemented**: `DataAccessLogInterceptor` logs all patient access.

**Enhancement**: Ensure patient reads are logged with PHI flag:

```typescript
// In DataAccessLogInterceptor, ensure:
accessedPHI: resourceType === 'Patient' || resourceType === 'MedicalRecord'
```

### 4.2 Blocked Deletion

**Implementation**: Remove `DELETE` endpoint, replace with `archive`:

```typescript
// REMOVE from controller:
// @Delete(':id') - DO NOT ALLOW HARD DELETE

// REPLACE with:
@Post(':id/archive')
@Roles('ADMIN')
@Permissions('patients:archive:write')
async archivePatient(...) {
  // Soft delete only - sets archived = true
  // Never DELETE from database
}
```

**Database Constraint**: Add trigger to prevent DELETE:

```sql
-- Migration: prevent-patient-deletion.sql
CREATE OR REPLACE FUNCTION prevent_patient_deletion()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Patient records cannot be deleted. Use archive instead.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_patient_delete
  BEFORE DELETE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION prevent_patient_deletion();
```

### 4.3 Version-Safe Edits

**Implementation**: Optimistic locking with version field:

```typescript
// In UpdatePatientDto:
@IsInt()
@IsOptional()
version?: number; // Client must send current version

// In service:
async update(id: string, dto: UpdatePatientDto, userId: string) {
  const existing = await this.repository.findById(id);
  
  // Check version for optimistic locking
  if (dto.version && dto.version !== existing.version) {
    throw new ConflictException(
      'Patient record was modified by another user. Please refresh and try again.'
    );
  }
  
  // Update with incremented version
  return this.repository.update(id, {
    ...dto,
    version: existing.version + 1,
    updatedBy: userId,
  });
}
```

### 4.4 Change History Table

**Optional Enhancement**: Track all field-level changes:

```prisma
model PatientChangeHistory {
  id          String   @id @default(uuid()) @db.Uuid
  patientId   String   @db.Uuid
  
  // Change Details
  fieldName   String   @db.VarChar(100) // Which field changed
  oldValue    String?  @db.Text // Previous value (JSON if complex)
  newValue    String?  @db.Text // New value (JSON if complex)
  
  // Context
  changedBy   String   @db.Uuid
  changedAt   DateTime @default(now()) @db.Timestamptz(6)
  changeReason String? @db.Text
  
  // Event Anchoring
  changeEventId String? @db.Uuid // DomainEvent
  
  // Relations
  patient     Patient  @relation(fields: [patientId], references: [id], onDelete: Cascade)
  changeEvent DomainEvent? @relation("PatientChangeEvent", fields: [changeEventId], references: [id])
  
  @@index([patientId])
  @@index([changedAt])
  @@index([fieldName])
  @@map("patient_change_history")
}
```

---

## Step 5: Migration Safety

### 5.1 Migration Strategy

**Phase 1: Create Patient Model** (Non-Breaking)
1. Create `patient.prisma` schema file
2. Generate migration: `npx prisma migrate dev --name add_patient_model`
3. **No data loss** - new table only

**Phase 2: Add Foreign Key Constraints** (Breaking - Requires Data)
1. Ensure all `patientId` references have valid UUIDs OR NULL
2. Add foreign keys with `ON DELETE RESTRICT` (prevents orphaned records)
3. Migration will fail if invalid `patientId` values exist

**Phase 3: Backfill Patient Data** (Data Migration)
1. Extract patient data from `MedicalRecord` table (if exists)
2. Create Patient records with MRNs
3. Update all `patientId` references to point to new Patient records

**Phase 4: Add Compliance Fields** (Non-Breaking)
1. Add `status`, `restricted`, `deceased`, `archived` fields
2. Set defaults: `status = ACTIVE`, others = `false`
3. No data loss

### 5.2 Rollback Plan

1. **Before Migration**: Backup database
2. **If Migration Fails**: 
   - Rollback: `npx prisma migrate resolve --rolled-back <migration_name>`
   - Fix data issues
   - Re-run migration
3. **If Foreign Key Fails**:
   - Identify invalid `patientId` values
   - Create placeholder Patient records OR set to NULL
   - Re-run migration

### 5.3 Data Integrity Checks

```sql
-- Pre-migration check: Find invalid patientId references
SELECT DISTINCT patientId 
FROM surgical_cases 
WHERE patientId NOT IN (SELECT id FROM patients)
  AND patientId IS NOT NULL;

-- Post-migration check: Verify all foreign keys
SELECT 
  table_name,
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
  AND table_name IN ('surgical_cases', 'bills', 'medical_records', 'patient_consent_instances');
```

---

## Step 6: Implementation Checklist

### 6.1 Prisma Schema
- [ ] Create `backend/prisma/schema/patient.prisma`
- [ ] Add Patient model with all compliance fields
- [ ] Add PatientContact model
- [ ] Add PatientDocument model
- [ ] Add PatientAllergy model
- [ ] Add PatientRiskFlag model
- [ ] Add PatientMergeHistory model
- [ ] Update User model with Patient relations
- [ ] Generate migration: `npx prisma migrate dev --name add_patient_module`

### 6.2 Repository Implementation
- [ ] Implement `PatientRepository.create()`
- [ ] Implement `PatientRepository.findById()`
- [ ] Implement `PatientRepository.findByMRN()`
- [ ] Implement `PatientRepository.update()`
- [ ] Implement `PatientRepository.archive()` (soft delete)
- [ ] Implement `PatientRepository.findAll()` with filters
- [ ] Implement `PatientRepository.findAllFiltered()` (RLS)
- [ ] Implement `PatientRepository.mergePatients()`
- [ ] Implement `PatientRepository.restrictPatient()`

### 6.3 Service Layer
- [ ] Update `PatientService.create()` to generate MRN
- [ ] Update `PatientService.update()` with version checking
- [ ] Add `PatientService.restrictPatient()`
- [ ] Add `PatientService.unrestrictPatient()`
- [ ] Add `PatientService.mergePatients()`
- [ ] Add `PatientService.archivePatient()`
- [ ] Add `PatientService.markDeceased()`
- [ ] Add `PatientService.getAuditLogs()`
- [ ] Create `PatientFieldPermissionService`

### 6.4 DTOs
- [ ] Update `CreatePatientDto` with MRN generation
- [ ] Update `UpdatePatientDto` with version field
- [ ] Create `RestrictPatientDto`
- [ ] Create `MergePatientsDto`
- [ ] Create `ArchivePatientDto`
- [ ] Create `MarkDeceasedDto`

### 6.5 Controllers
- [ ] Update existing endpoints with field-level permissions
- [ ] Add `POST /patients/:id/restrict`
- [ ] Add `POST /patients/:id/unrestrict`
- [ ] Add `POST /patients/:id/merge`
- [ ] Add `POST /patients/:id/archive`
- [ ] Add `POST /patients/:id/deceased`
- [ ] Add `GET /patients/:id/audit-logs`
- [ ] Remove `DELETE /patients/:id` (replace with archive)

### 6.6 Permissions
- [ ] Add patient permissions to seed data
- [ ] Assign permissions to roles:
  - ADMIN: All permissions
  - FRONT_DESK: `patients:demographics:write`
  - NURSE: `patients:clinical:write`
  - DOCTOR: `patients:clinical:write`

### 6.7 Database Constraints
- [ ] Add foreign key constraints
- [ ] Add unique constraint on MRN
- [ ] Add check constraint: `deceased = true` requires `deceasedAt IS NOT NULL`
- [ ] Add check constraint: `archived = true` requires `archivedAt IS NOT NULL`
- [ ] Add trigger to prevent DELETE

### 6.8 Testing
- [ ] Unit tests for repository methods
- [ ] Unit tests for service methods
- [ ] Integration tests for controller endpoints
- [ ] Test role-based permissions
- [ ] Test RLS filtering
- [ ] Test optimistic locking (version conflicts)
- [ ] Test merge functionality
- [ ] Test archive (soft delete)

---

## Step 7: Example Endpoint Implementation

### 7.1 Create Patient (with MRN generation)

```typescript
// backend/src/modules/patient/services/patient.service.ts

async create(createPatientDto: CreatePatientDto, userId: string) {
  // Generate MRN: MRN-YYYY-XXXXX
  const mrn = await this.generateMRN();
  
  const patient = await this.patientRepository.create({
    ...createPatientDto,
    mrn,
    status: PatientStatus.ACTIVE,
    createdBy: userId,
  });

  // Emit domain event
  await this.domainEventService.createEvent({
    eventType: PatientEventType.CREATED,
    domain: Domain.MEDICAL_RECORDS,
    aggregateId: patient.id,
    aggregateType: 'Patient',
    payload: {
      patientId: patient.id,
      mrn: patient.mrn,
      firstName: patient.firstName,
      lastName: patient.lastName,
    },
    createdBy: userId,
    // ... correlation context
  });

  return patient;
}

private async generateMRN(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `MRN-${year}-`;
  
  // Find last MRN for this year
  const lastMRN = await this.patientRepository.findLastMRNByPrefix(prefix);
  
  if (!lastMRN) {
    return `${prefix}00001`;
  }
  
  const sequence = parseInt(lastMRN.split('-')[2]) + 1;
  return `${prefix}${sequence.toString().padStart(5, '0')}`;
}
```

### 7.2 Update Patient (with field-level permissions)

```typescript
async update(id: string, updatePatientDto: UpdatePatientDto, userId: string) {
  const existing = await this.findOne(id, userId);
  
  // Check version for optimistic locking
  if (updatePatientDto.version && updatePatientDto.version !== existing.version) {
    throw new ConflictException('Patient record was modified by another user.');
  }
  
  // Field-level permission checks
  const fieldPermissions = this.fieldPermissionService;
  
  // Demographics (Front Desk can edit)
  const demographicsFields = ['firstName', 'lastName', 'email', 'phone', 'address'];
  const hasDemographicChanges = Object.keys(updatePatientDto).some(key => 
    demographicsFields.includes(key)
  );
  
  if (hasDemographicChanges && !fieldPermissions.canEditDemographics()) {
    throw new ForbiddenException('You do not have permission to edit patient demographics.');
  }
  
  // Clinical data (Nurse/Doctor can edit)
  const clinicalFields = ['bloodType', 'allergies', 'riskFlags'];
  const hasClinicalChanges = Object.keys(updatePatientDto).some(key =>
    clinicalFields.includes(key)
  );
  
  if (hasClinicalChanges && !fieldPermissions.canEditClinicalData()) {
    throw new ForbiddenException('You do not have permission to edit clinical data.');
  }
  
  // Update with version increment
  const updated = await this.patientRepository.update(id, {
    ...updatePatientDto,
    version: existing.version + 1,
    updatedBy: userId,
  });
  
  // Emit domain event
  await this.domainEventService.createEvent({
    eventType: PatientEventType.UPDATED,
    domain: Domain.MEDICAL_RECORDS,
    aggregateId: id,
    aggregateType: 'Patient',
    payload: {
      patientId: id,
      changes: updatePatientDto,
      previousValues: existing,
    },
    createdBy: userId,
  });
  
  return updated;
}
```

### 7.3 Merge Patients (Admin only)

```typescript
async mergePatients(
  sourceId: string,
  targetId: string,
  reason: string | undefined,
  userId: string,
) {
  // Validate both patients exist
  const source = await this.findOne(sourceId, userId);
  const target = await this.findOne(targetId, userId);
  
  if (source.archived || target.archived) {
    throw new BadRequestException('Cannot merge archived patients.');
  }
  
  if (source.mergedInto || target.mergedInto) {
    throw new BadRequestException('One or both patients are already merged.');
  }
  
  // Create merge event first
  const mergeEvent = await this.domainEventService.createEvent({
    eventType: PatientEventType.MERGED,
    domain: Domain.MEDICAL_RECORDS,
    aggregateId: sourceId,
    aggregateType: 'Patient',
    payload: {
      sourcePatientId: sourceId,
      targetPatientId: targetId,
      reason,
    },
    createdBy: userId,
  });
  
  // Perform merge
  await this.patientRepository.mergePatients(sourceId, targetId, reason, userId, mergeEvent.id);
  
  // Update all references to point to target patient
  // This should be done in a transaction
  await this.patientRepository.updateReferences(sourceId, targetId);
  
  return {
    sourcePatientId: sourceId,
    targetPatientId: targetId,
    mergedAt: new Date(),
  };
}
```

---

## Summary

### Critical Actions Required

1. **IMMEDIATE**: Create Patient Prisma model (system cannot function without it)
2. **HIGH PRIORITY**: Implement repository methods (currently all placeholders)
3. **HIGH PRIORITY**: Add MRN generation and compliance fields
4. **MEDIUM PRIORITY**: Implement field-level permissions
5. **MEDIUM PRIORITY**: Add merge and archive functionality
6. **LOW PRIORITY**: Add change history table (optional enhancement)

### Risk Mitigation

- ✅ **No Data Loss**: All changes are additive (new fields, new tables)
- ✅ **Backward Compatible**: Existing `patientId` references continue to work
- ✅ **Rollback Safe**: Migrations can be rolled back if issues occur
- ✅ **Incremental**: Can implement in phases, testing each step

### Next Steps

1. Review this document with team
2. Prioritize implementation phases
3. Create migration branch
4. Implement Phase 1 (Patient model)
5. Test thoroughly before proceeding to Phase 2

---

**Document Status**: Ready for Implementation  
**Estimated Implementation Time**: 2-3 days for core functionality, 1 week for full compliance features









