# Domain Model Reference

## Entity Relationship Overview

This document provides a visual reference for understanding relationships between entities.

---

## RBAC Domain

```
User (1) ──< (N) UserRoleAssignment (N) >── (1) Role
                                           |
                                           └──< (N) RolePermission (N) >── (1) Permission
```

**Key Relationships**:
- Users can have multiple role assignments (time-bound)
- Roles have multiple permissions
- Permissions are scoped by domain/resource/action

---

## Theater Scheduling Domain

```
Department (1) ──< (N) OperatingTheater
                └──< (N) User (optional department assignment)

OperatingTheater (1) ──< (N) TheaterReservation
                    └──< (N) ResourceAllocation

SurgicalCase (1) ──< (N) TheaterReservation (optional)
                └──< (N) ResourceAllocation
```

**Key Relationships**:
- A theater belongs to one department
- Reservations link theaters to cases (or block time)
- Resources (staff/equipment) are allocated to reservations
- Unique constraint prevents double-booking: `(theaterId, reservedFrom, reservedUntil)`

---

## Medical Records Domain

```
MedicalRecord (1) ──< (N) ClinicalNote (append-only)
                  └──< (N) MedicalRecordAttachment

ClinicalNote (1) ──< (N) ClinicalNote (amendments via amendsNoteId)
```

**Key Relationships**:
- Notes are append-only (amendments create new notes)
- Attachments belong to one record
- Record merging via `mergedInto` self-reference

---

## Consent Domain

```
ConsentTemplate (1) ──< (N) ConsentSection
                    └──< (N) PatientConsentInstance

ConsentSection (1) ──< (N) ConsentClause

PatientConsentInstance (1) ──< (N) PatientConsentAcknowledgement
                            └──< (N) ConsentArtifact

ConsentSection (1) ──< (N) PatientConsentAcknowledgement (section-level)
ConsentClause (1) ──< (N) PatientConsentAcknowledgement (clause-level)
```

**Key Relationships**:
- Templates → Sections → Clauses (hierarchical)
- Instances capture template state at consent time
- Acknowledgements can be at section or clause level
- Artifacts (PDFs) are evidence, not source of truth

---

## Billing Domain

```
InsuranceProvider (1) ──< (N) InsurancePolicy
                    └──< (N) FeeSchedule

InsurancePolicy (1) ──< (N) Charge
                └──< (N) Claim

BillingCode (1) ──< (N) Charge
            └──< (N) FeeScheduleItem
            └──< (N) ClaimItem

FeeSchedule (1) ──< (N) FeeScheduleItem

Charge (1) ──< (N) InvoiceItem
      └──< (N) PaymentAllocation
      └──< (N) ClaimItem

Invoice (1) ──< (N) InvoiceItem
        └──< (N) PaymentAllocation
        └──< (N) PaymentPlan

Claim (1) ──< (N) ClaimItem
      └──< (N) Payment

Payment (1) ──< (N) PaymentAllocation

PaymentPlan (1) ──< (N) PaymentPlanInstallment
```

**Key Relationships**:
- Insurance policies link patients to providers
- Charges link to cases/records and billing codes
- Invoices group charges for billing
- Payments can be allocated to multiple charges/invoices
- Claims track insurance submissions and responses
- Payment plans break large balances into installments

---

## Inventory Domain

```
Vendor (1) ──< (N) InventoryItem
        └──< (N) PurchaseOrder

InventoryCategory (1) ──< (N) InventoryItem (self-referencing hierarchy)

InventoryItem (1) ──< (N) InventoryStock
            └──< (N) InventoryTransaction
            └──< (N) EquipmentAssignment
            └──< (N) EquipmentMaintenance
            └──< (N) PurchaseOrderItem

PurchaseOrder (1) ──< (N) PurchaseOrderItem
```

**Key Relationships**:
- Items belong to categories (hierarchical)
- Stock levels tracked per item (with optional location)
- Transactions provide complete audit trail
- Purchase orders link to vendors and items
- Equipment assignments track location/usage
- Maintenance records track calibration/repairs

---

## Audit Domain

```
User (1) ──< (N) DomainEvent (created by)
        └──< (N) DataAccessLog

DataAccessLog (polymorphic reference)
  - resourceType + resourceId → MedicalRecord | ConsentArtifact | Attachment | etc.
```

**Key Relationships**:
- Events track all state changes
- Access logs track PHI access (polymorphic resource reference)
- Correlation IDs link related events

---

## Cross-Domain References

### User References
- Created/updated by relationships on most entities
- Links to RBAC for access control

### Patient References
- `MedicalRecord.patientId`
- `PatientConsentInstance.patientId`
- `SurgicalCase.patientId`
- (Patient registry may be external system)

### Case References
- `PatientConsentInstance.relatedCaseId` → `SurgicalCase`
- Links consent to specific procedures

---

## Polymorphic Patterns

### Resource Allocation
```
ResourceAllocation
  - resourceType: "STAFF" | "EQUIPMENT" | "INVENTORY"
  - resourceId: UUID (references User, Equipment, or Inventory)
```

### Data Access Logging
```
DataAccessLog
  - resourceType: "MedicalRecord" | "ConsentArtifact" | "Attachment" | ...
  - resourceId: UUID (application resolves actual resource)
```

---

## Immutability Patterns

### Append-Only
- `ClinicalNote`: Never updated, amendments create new records
- `DomainEvent`: Immutable event log
- `DataAccessLog`: Immutable access log

### Versioning
- All entities: `version` increments on update
- `ConsentTemplate`: Semantic versioning (`version` field) + incremental version number
- `PatientConsentInstance`: Captures template version at consent time

### Snapshots
- `PatientConsentAcknowledgement`: Stores clause content snapshot
- Template versioning ensures reproducibility

---

## Audit Trail Patterns

### Temporal Queries
Every entity supports point-in-time reconstruction via:
- `createdAt` / `updatedAt` timestamps
- `version` field
- Related `DomainEvent` records

### Causation Tracking
- `DomainEvent.correlationId`: Links events from same session/transaction
- `DomainEvent.causationId`: Tracks event chains (A caused B)

---

## Status Lifecycles

### SurgicalCase
```
DRAFT → SCHEDULED → IN_PROGRESS → COMPLETED
                         ↓
                    CANCELLED / POSTPONED
```

### TheaterReservation
```
CONFIRMED → COMPLETED
    ↓
CANCELLED
```

### PatientConsentInstance
```
DRAFT → SIGNED → (REVOKED | EXPIRED | SUPERSEDED)
```

### MedicalRecord
```
ACTIVE → ARCHIVED
    ↓
MERGED (via mergedInto)
```

---

## Data Integrity Mechanisms

### Database-Level
- Unique constraints prevent double-booking
- Foreign keys ensure referential integrity
- Check constraints (application-enforced) for business rules

### Application-Level
- Content hashing (SHA-256) for verification
- Amendment tracking prevents silent modifications
- Version validation ensures consistency

### Legal/Regulatory
- Immutable audit logs
- Consent snapshots
- Complete event history

