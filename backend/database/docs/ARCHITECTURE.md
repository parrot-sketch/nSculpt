# Enterprise Surgical EHR - Database Architecture

## Design Philosophy

This database schema is designed for **legal defensibility**, **clinical accuracy**, and **regulatory compliance** over a 10+ year lifecycle. Every design decision prioritizes:

1. **Immutability**: Clinical data cannot be silently altered
2. **Auditability**: Complete reconstruction of every change
3. **Compliance**: HIPAA, FDA, and state medical board requirements
4. **Scalability**: Enterprise-grade performance with proper indexing
5. **Type Safety**: Prisma ensures compile-time correctness

---

## Domain Decomposition

### 1. RBAC (Role-Based Access Control)

**Purpose**: Enforce least-privilege access with time-bound, auditable permissions.

**Key Design Decisions**:

- **Users**: Core identity model with email/employee ID uniqueness. Password changes are tracked for security audits.
- **Roles**: Reusable permission sets (e.g., "SURGEON", "NURSE", "ADMIN"). Roles can be versioned and deactivated.
- **Permissions**: Granular, domain-scoped permissions (e.g., `medical_records:read`, `theater:book`). The `domain` field allows efficient permission checks.
- **UserRoleAssignment**: Time-bound role assignments (`validFrom`, `validUntil`) support temporary access and automatic expiration. All assignments are audited with creation and revocation tracking.

**Invariants**:
- Users must have at least one active role assignment to access the system (enforced at application layer)
- Revoked role assignments cannot be reactivated (create new assignment instead)

---

### 2. Theater Scheduling & Booking

**Purpose**: Prevent double-booking, allocate resources, and manage surgical cases.

**Key Design Decisions**:

- **Separated Concerns**: 
  - `SurgicalCase`: Clinical/medical information about the procedure
  - `TheaterReservation`: Time-slot booking in a specific theater
  - `ResourceAllocation`: Staff, equipment, and inventory assigned to a reservation

- **Double-Booking Prevention**: 
  - Database-level unique constraint: `@@unique([theaterId, reservedFrom, reservedUntil])` ensures no overlapping reservations can be inserted
  - Application layer must handle edge cases (exact boundary overlaps)

- **Flexible Resource Model**: 
  - `ResourceAllocation.resourceType` + `resourceId` allows polymorphic references to staff (User ID), equipment (external ID), or inventory items
  - `role` field specifies staff function (SURGEON, NURSE, ANESTHESIOLOGIST)

- **Maintenance & Block Time**: 
  - `TheaterReservation.caseId` is nullable to support non-case reservations (maintenance, block time)

**Invariants**:
- `reservedUntil > reservedFrom` (application-level validation)
- `ResourceAllocation` must fall within parent `TheaterReservation` time bounds
- Canceled reservations should not be deleted; set `status = 'CANCELLED'` for audit trail

---

### 3. Medical Records

**Purpose**: Immutable, versioned clinical documentation with append-only notes.

**Key Design Decisions**:

- **Append-Only Clinical Notes**: 
  - `ClinicalNote` records are never updated. Amendments create new records with `isAmendment = true` and `amendsNoteId` reference.
  - `contentHash` (SHA-256) enables integrity verification at any time.

- **Identity Separation**: 
  - `MedicalRecord` holds minimal identity data (DOB, gender, blood type) separated from clinical content.
  - Full identity management may be external (patient registry system).

- **Versioning**: 
  - Every entity has a `version` field that increments on updates.
  - `updatedAt` and `updatedBy` track modification history.

- **Record Merging**: 
  - `mergedInto` field supports legal record consolidation while preserving original records.

- **Full-Text Search**: 
  - `@@fulltext([content])` enables fast clinical note searches while maintaining data integrity.

**Invariants**:
- Clinical notes cannot be deleted (only amended)
- Medical records cannot be deleted if they have associated notes (soft-delete via `status = 'ARCHIVED'`)
- Attachment file hashes must be verified before allowing access

---

### 4. Patient Consents

**Purpose**: Granular, legally defensible consent tracking at clause level with PDF evidence storage.

---

### 5. Billing

**Purpose**: Complete revenue cycle management with insurance processing, claims, and payment tracking.

**Key Design Decisions**:

- **Insurance Management**:
  - `InsuranceProvider`: Master list of insurance companies with payer IDs
  - `InsurancePolicy`: Patient insurance policies with coverage details (deductible, copay, coinsurance)
  - Supports primary, secondary, and tertiary insurance

- **Fee Schedules**:
  - `FeeSchedule`: Flexible pricing schedules by insurance provider or cash pay
  - `FeeScheduleItem`: Pricing for specific billing codes
  - Time-bound pricing with effective/expiration dates

- **Charge Management**:
  - `Charge`: Individual billable items linked to cases/records
  - `BillingCode`: CPT, ICD-10, HCPCS codes with default pricing
  - Supports quantity-based billing and discounts

- **Invoice & Payment**:
  - `Invoice`: Bills sent to patients/insurance
  - `Payment`: Payment tracking with multiple methods
  - `PaymentAllocation`: Flexible allocation of payments to charges/invoices
  - Supports partial payments and overpayments

- **Claims Processing**:
  - `Claim`: Insurance claims with EDI support
  - `ClaimItem`: Line items on claims
  - Tracks submission, response, and payment status
  - Supports X12 837P/837I formats

- **Payment Plans**:
  - `PaymentPlan`: Installment payment plans for patients
  - `PaymentPlanInstallment`: Individual installment tracking
  - Automatic due date calculation

**Invariants**:
- Charges cannot be deleted if allocated to invoices or claims
- Payment allocations must not exceed payment amount
- Claim status transitions follow workflow (DRAFT → SUBMITTED → PAID)

---

### 6. Inventory

**Purpose**: Complete equipment and supply management with stock tracking, procurement, and maintenance.

**Key Design Decisions**:

- **Vendor Management**:
  - `Vendor`: Supplier information with contact details
  - Payment terms and account numbers for procurement

- **Item Catalog**:
  - `InventoryCategory`: Hierarchical categorization (Equipment, Supplies, Implants)
  - `InventoryItem`: Master catalog of all items
  - Supports both equipment (fixed assets) and supplies (consumables)
  - Equipment-specific fields (calibration, FDA clearance)

- **Stock Management**:
  - `InventoryStock`: Current stock levels by location
  - Supports lot numbers, serial numbers, and expiration dates
  - Tracks quantity on hand, reserved, and available
  - FIFO/LIFO cost tracking support

- **Transaction Tracking**:
  - `InventoryTransaction`: Complete audit trail of stock movements
  - Transaction types: RECEIPT, ISSUE, ADJUSTMENT, RETURN, TRANSFER, ALLOCATION
  - Links to purchase orders and surgical cases

- **Procurement**:
  - `PurchaseOrder`: Purchase order management
  - `PurchaseOrderItem`: Line items with quantity ordered/received tracking
  - Supports partial receipts

- **Equipment Management**:
  - `EquipmentAssignment`: Equipment location tracking (theaters, departments)
  - `EquipmentMaintenance`: Maintenance and calibration tracking
  - Supports scheduled maintenance with certificate storage

**Invariants**:
- Stock quantities cannot go negative (application-level enforcement)
- Serial numbers must be unique per item type
- Equipment requiring calibration must have valid calibration dates

---

### 7. Audit & Compliance

**Key Design Decisions**:

- **Three-Level Hierarchy**:
  1. **Template** → Versioned, reusable consent forms
  2. **Section** → Grouped clauses (RISKS, ALTERNATIVES, ANESTHESIA)
  3. **Clause** → Individual consent statements that require acknowledgment

- **Immutable Snapshot Pattern**: 
  - `PatientConsentInstance.templateVersion` captures the template version at consent time
  - `PatientConsentAcknowledgement.clauseContent` stores the exact clause text as it appeared to the patient
  - This ensures legal reconstruction even if templates are later modified

- **Granular Tracking**: 
  - Acknowledgements can be recorded at section level, clause level, or both
  - Each acknowledgment includes timestamp, IP address, user agent, and optional digital signature hash

- **PDFs as Evidence, Not Source of Truth**: 
  - `ConsentArtifact` stores generated PDFs but the database records are authoritative
  - Artifacts include integrity hashes for tamper detection

- **Revocation & Expiration**: 
  - `revokedAt` and `revokesBy` track when/why consent was withdrawn
  - `expiresAt` supports time-limited consents (e.g., research consents)

**Invariants**:
- A consent instance cannot be signed until all required sections/clauses are acknowledged
- Revoked consents cannot be re-signed (create new instance)
- Consent artifacts must match the instance state at generation time (verified via hashes)

---

### 5. Audit & Compliance

**Purpose**: Complete reconstruction of all system activity for HIPAA audits and legal discovery.

**Key Design Decisions**:

- **Domain Events (Event Sourcing Pattern)**:
  - `DomainEvent` captures every significant state change as an immutable event
  - `payload` (JSONB) stores complete event data for reconstruction
  - `correlationId` links related events (e.g., all events from a single user session)
  - `causationId` tracks event chains (event A caused event B)

- **Data Access Logging (HIPAA Requirement)**:
  - `DataAccessLog` records every access to PHI (Protected Health Information)
  - `accessedPHI` flag enables fast reporting for HIPAA access reports
  - `justification` field captures why access was granted (required for certain sensitive records)
  - Logs are append-only and immutable

- **Versioning Everywhere**:
  - All entities include `version`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`
  - This enables point-in-time reconstruction of any entity's state

**Invariants**:
- Domain events are immutable (never updated or deleted)
- Data access logs are immutable (never updated or deleted)
- All PHI accesses must be logged before access is granted (application-level enforcement)

---

## Database Constraints & Safety Rules

### Primary Keys
- All tables use UUID primary keys (`@default(uuid())`) for:
  - Global uniqueness across distributed systems
  - No sequential ID leakage (security)
  - Natural sharding support

### Foreign Keys
- Cascade deletes are used sparingly (only for composition relationships)
- SetNull for optional relationships (e.g., `TheaterReservation.caseId`)
- Cascade for dependent records (e.g., `RolePermission` cascades when `Role` is deleted)

### Unique Constraints
- **Theater Reservations**: `@@unique([theaterId, reservedFrom, reservedUntil])` prevents double-booking
- **User Email/Employee ID**: Prevents duplicate accounts
- **Role-Permission Pairs**: Prevents duplicate permission assignments
- **Case Numbers**: Human-readable case IDs must be unique

### Indexes
- **Performance Indexes**: All foreign keys, frequently queried fields, and date ranges
- **Full-Text Search**: `ClinicalNote.content` and `ConsentClause.content`
- **Composite Indexes**: Time-range queries (`scheduledStartAt, scheduledEndAt`), status filters
- **HIPAA Audit Indexes**: `DataAccessLog.accessedPHI`, `DataAccessLog.userId`, `DataAccessLog.accessedAt`

### Check Constraints (Recommended via Application Layer)
- `reservedUntil > reservedFrom` (TheaterReservation)
- `validUntil > validFrom` (UserRoleAssignment)
- `allocatedUntil > allocatedFrom` (ResourceAllocation)
- Status values must be from approved enum sets

---

## HIPAA Compliance Features

### 1. Access Control
- **RBAC**: Granular permissions per domain/resource/action
- **Time-Bound Access**: Roles expire automatically
- **Audit Trail**: Every role assignment is logged

### 2. Audit Logging
- **Data Access Logs**: Every PHI access is recorded with:
  - Who accessed it (`userId`)
  - What was accessed (`resourceType`, `resourceId`)
  - When (`accessedAt`)
  - Why (`justification`)
  - How (`ipAddress`, `userAgent`)
- **Domain Events**: Complete state change history

### 3. Data Integrity
- **Content Hashing**: SHA-256 hashes on all clinical notes and attachments
- **Immutable Records**: Clinical data cannot be silently altered
- **Version Tracking**: Every change increments version number

### 4. Least Privilege
- **Permission Granularity**: Domain-scoped permissions prevent over-privileged access
- **Resource-Level Permissions**: Permissions can be scoped to specific resource types

### 5. Legal Reconstruction
- **Point-in-Time Queries**: Version history enables reconstruction of any entity at any time
- **Event Sourcing**: Complete event log allows replay of system state
- **Consent Snapshots**: Immutable consent acknowledgments with clause text snapshots

---

## Migration Strategy

### Initial Setup
```bash
# Generate Prisma Client
npx prisma generate

# Create database and run migrations
npx prisma migrate dev --name init
```

### Future Migrations
- Use Prisma migrations for schema evolution
- Always add new fields as nullable first, then backfill, then make required
- Never delete columns that contain PHI (mark as deprecated instead)
- Version all schema changes in migration files

---

## Performance Considerations

### Indexes
- All foreign keys are indexed
- Time-range queries have composite indexes
- Full-text search indexes on clinical content

### Partitioning (Future)
- `DomainEvent` table should be partitioned by `occurredAt` (monthly/quarterly)
- `DataAccessLog` should be partitioned by `accessedAt` (monthly)
- This enables efficient archival and query performance at scale

### Query Optimization
- Use `SELECT` only required fields (Prisma's `select` feature)
- Leverage JSONB indexes on `DomainEvent.payload` for specific event queries
- Consider materialized views for common reports (access logs, consent status)

---

## Legal & Clinical Defensibility

### Why This Design is Legally Defensible

1. **Immutable Audit Trail**: 
   - No clinical data can be altered without creating an amendment record
   - All changes are timestamped and attributed to specific users

2. **Complete Consent Reconstruction**:
   - Consent acknowledgments store exact clause text as it appeared to the patient
   - Template versioning ensures we can reproduce the exact form used
   - PDF artifacts are hashed to detect tampering

3. **HIPAA Compliance**:
   - Access logs meet HIPAA minimum retention requirements (6 years)
   - PHI access flags enable fast reporting for breach investigations
   - Justification fields document legitimate access reasons

4. **Medical Board Requirements**:
   - Clinical notes follow standard formats (SOAP, HPI, etc.)
   - Operative notes are timestamped and attributed
   - Record merging preserves original records

5. **FDA Device/Procedure Tracking** (if applicable):
   - Resource allocations can track equipment by serial number
   - Cases link to procedure codes (CPT/ICD)
   - Complete case history supports adverse event reporting

---

## Future Extensibility

### Adding New Domains
1. Add domain to `Domain` enum
2. Create entity models following established patterns (versioning, audit fields)
3. Add corresponding permissions
4. Create domain events for state changes

### Integration Points
- **Patient Registry**: `MedicalRecord.patientId` and `PatientConsentInstance.patientId` can reference external systems
- **Equipment Management**: `ResourceAllocation.resourceId` can reference equipment databases
- **Document Storage**: `MedicalRecordAttachment.filePath` and `ConsentArtifact.filePath` can point to S3, Azure Blob, etc.
- **Authentication**: User passwords can be managed externally (OAuth, SAML) with `User` as a local cache

---

## Security Best Practices

1. **Encryption at Rest**: Enable PostgreSQL transparent data encryption (TDE) or use encrypted storage volumes
2. **Encryption in Transit**: Always use SSL/TLS for database connections
3. **Password Storage**: `passwordHash` should use bcrypt with cost factor 12+
4. **SQL Injection Prevention**: Prisma parameterizes all queries automatically
5. **Audit Log Protection**: Store audit logs in a separate, write-only database or WORM storage
6. **Backup Encryption**: All database backups must be encrypted
7. **Access Control**: Application layer must enforce permissions (database is defense-in-depth)

---

## Conclusion

This schema provides a **solid foundation** for an enterprise surgical EHR that will remain **legally defensible** and **clinically accurate** for 10+ years. The design prioritizes:

- ✅ Immutability and auditability
- ✅ HIPAA and regulatory compliance
- ✅ Scalability and performance
- ✅ Type safety and maintainability
- ✅ Legal reconstruction capability

The schema is **production-ready** but should be reviewed by:
- Healthcare IT legal counsel
- HIPAA compliance officer
- Clinical informatics specialists
- Database administrators (for partitioning/performance tuning)

