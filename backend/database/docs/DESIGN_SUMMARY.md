# Database Design Summary

## Overview

This database schema provides a **production-ready foundation** for an enterprise surgical EHR system. The design prioritizes **legal defensibility**, **HIPAA compliance**, and **clinical accuracy** over a 10+ year lifecycle.

---

## Core Requirements Met

### ✅ 1. Theater Scheduling & Booking

**Tables**: `departments`, `operating_theaters`, `surgical_cases`, `theater_reservations`, `resource_allocations`

**Key Features**:
- **Double-booking prevention**: Database-level unique constraint on `(theaterId, reservedFrom, reservedUntil)`
- **Separated concerns**: Cases (clinical) vs. Reservations (scheduling) vs. Allocations (resources)
- **Flexible resources**: Polymorphic allocation for staff, equipment, and inventory
- **Maintenance support**: Block time and maintenance reservations (nullable `caseId`)

**Invariants**:
- Reservations cannot overlap for the same theater
- Resource allocations must fall within reservation time bounds

---

### ✅ 2. Medical Records

**Tables**: `medical_records`, `clinical_notes`, `medical_record_attachments`

**Key Features**:
- **Append-only notes**: Clinical notes are never updated; amendments create new records
- **Content integrity**: SHA-256 hashing on all note content
- **Version tracking**: Every entity includes version number and audit fields
- **Record merging**: Support for legal record consolidation via `mergedInto`
- **Full-text search**: GIN indexes for fast clinical content searches

**Invariants**:
- Clinical notes cannot be deleted (only amended)
- Medical records with notes cannot be deleted (soft-delete via status)
- Attachment hashes must be verified before access

---

### ✅ 3. Patient Consents (CRITICAL)

**Tables**: `consent_templates`, `consent_sections`, `consent_clauses`, `patient_consent_instances`, `patient_consent_acknowledgements`, `consent_artifacts`

**Key Features**:
- **Three-level hierarchy**: Template → Section → Clause
- **Granular tracking**: Clause-level acknowledgment with immutable snapshots
- **Template versioning**: Captures exact template version at consent time
- **Immutable snapshots**: Clause content stored at acknowledgment time
- **PDF evidence**: Artifacts stored with integrity hashes (evidence, not source of truth)
- **Revocation support**: Complete tracking of consent withdrawal

**Invariants**:
- Consent cannot be signed until all required clauses are acknowledged
- Revoked consents cannot be re-signed (create new instance)
- Template version is immutable after consent is signed

---

### ✅ 4. Role-Based Access Control

**Tables**: `users`, `roles`, `permissions`, `role_permissions`, `user_role_assignments`

**Key Features**:
- **Granular permissions**: Domain-scoped (e.g., `medical_records:read`, `theater:book`)
- **Time-bound assignments**: Roles expire automatically via `validFrom` / `validUntil`
- **Multiple roles**: Users can have multiple active role assignments
- **Full audit trail**: All role assignments tracked with creation/revocation timestamps

**Invariants**:
- Users must have at least one active role to access system (application-enforced)
- Revoked role assignments cannot be reactivated

---

### ✅ 5. Billing & Revenue Cycle

**Tables**: `insurance_providers`, `insurance_policies`, `billing_codes`, `fee_schedules`, `fee_schedule_items`, `charges`, `invoices`, `invoice_items`, `payments`, `payment_allocations`, `claims`, `claim_items`, `payment_plans`, `payment_plan_installments`

**Key Features**:
- **Insurance management**: Primary, secondary, tertiary insurance support
- **Fee schedules**: Flexible pricing by insurance provider or cash pay
- **Charge tracking**: Individual billable items linked to cases/records
- **Invoice generation**: Bills sent to patients/insurance
- **Payment processing**: Multiple payment methods with flexible allocation
- **Claims processing**: EDI support for insurance claims (X12 837P/837I)
- **Payment plans**: Installment payment plans for patients

**Invariants**:
- Charges cannot be deleted if allocated to invoices or claims
- Payment allocations must not exceed payment amount
- Claim status transitions follow workflow

---

### ✅ 6. Inventory & Asset Management

**Tables**: `vendors`, `inventory_categories`, `inventory_items`, `inventory_stock`, `inventory_transactions`, `purchase_orders`, `purchase_order_items`, `equipment_assignments`, `equipment_maintenance`

**Key Features**:
- **Vendor management**: Supplier information and payment terms
- **Item catalog**: Hierarchical categorization (Equipment, Supplies, Implants)
- **Stock tracking**: Lot numbers, serial numbers, expiration dates
- **Transaction audit**: Complete audit trail of stock movements
- **Purchase orders**: Procurement with partial receipt support
- **Equipment management**: Location tracking and maintenance scheduling
- **Calibration tracking**: Equipment calibration with certificate storage

**Invariants**:
- Stock quantities cannot go negative (application-level enforcement)
- Serial numbers must be unique per item type
- Equipment requiring calibration must have valid calibration dates

---

### ✅ 7. HIPAA Compliance

**Tables**: `domain_events`, `data_access_logs`

**Key Features**:
- **Event sourcing**: Complete state change history via `DomainEvent`
- **PHI access logging**: Every PHI access recorded with justification
- **Immutability**: Audit logs are append-only and never modified
- **Legal reconstruction**: Point-in-time queries via versioning and events
- **Correlation tracking**: Event chains tracked via `correlationId` and `causationId`

**HIPAA Requirements Met**:
- ✅ Access logs with 6+ year retention capability
- ✅ PHI access flags for breach reporting
- ✅ Complete audit trail for legal discovery
- ✅ Integrity verification (content hashing)
- ✅ Access justification tracking

---

## Technology Stack

- **Database**: PostgreSQL 14+ (15+ recommended)
- **ORM**: Prisma (type-safe, migration management)
- **Primary Keys**: UUID (global uniqueness, security, sharding-ready)
- **Extensions**: `uuid-ossp`, `pg_trgm` (full-text search)
- **Data Types**: JSONB for flexible event payloads

---

## Design Patterns

### Immutability
- Clinical data is append-only (amendments create new records)
- Audit logs are immutable
- Domain events are immutable

### Versioning
- Every entity has `version` field
- Template versioning for consents
- Point-in-time reconstruction capability

### Event Sourcing
- All state changes generate `DomainEvent`
- Complete system state can be reconstructed
- Event correlation and causation tracking

### Polymorphic Relations
- `ResourceAllocation`: Flexible resource references
- `DataAccessLog`: Polymorphic resource logging

---

## Constraints & Safety

### Database-Level
- Unique constraints prevent double-booking
- Foreign keys ensure referential integrity
- Indexes optimize common queries

### Application-Level
- Business rule validation (status transitions, required fields)
- Permission enforcement
- Content hash verification

### Legal/Regulatory
- Immutable audit trails
- Consent snapshots
- Complete event history

---

## Performance Optimizations

### Indexing Strategy
- All foreign keys indexed
- Time-range composite indexes
- Full-text search indexes (GIN)
- Status field indexes
- HIPAA audit indexes

### Future Scalability
- Partitioning ready (`domain_events`, `data_access_logs`)
- UUID primary keys enable natural sharding
- JSONB indexes for event queries

---

## Migration Path

1. **Initial Setup**: `npx prisma migrate dev --name init`
2. **Schema Evolution**: Versioned migrations for all changes
3. **Data Protection**: Never delete PHI columns (mark deprecated)
4. **Testing**: Always test migrations on staging first

---

## Legal Defensibility

This schema is designed for **legal defensibility** because:

1. **Immutable Audit Trail**: No clinical data can be silently altered
2. **Complete Reconstruction**: Version history + event sourcing enable point-in-time queries
3. **Consent Evidence**: Granular tracking with immutable snapshots
4. **HIPAA Compliance**: Access logs, PHI tracking, justification fields
5. **Medical Board Compliance**: Standard note formats, attribution, amendment tracking

---

## Next Steps

### Before Production

1. **Legal Review**: Healthcare IT legal counsel
2. **Compliance Review**: HIPAA compliance officer
3. **Clinical Review**: Informatics specialists
4. **DBA Review**: Performance tuning, partitioning strategy
5. **Security Review**: Encryption, access controls, backup strategy

### Recommended Enhancements

1. **Partitioning**: Implement table partitioning for audit logs
2. **Archival Strategy**: Long-term storage for audit logs (>6 years)
3. **Backup Encryption**: Encrypted database backups
4. **Monitoring**: Query performance monitoring, slow query alerts
5. **Data Retention Policies**: Automated archival of old records

---

## Documentation

- **ARCHITECTURE.md**: Detailed design decisions and rationale
- **DOMAIN_MODEL.md**: Entity relationship diagrams and patterns
- **README.md**: Setup and usage instructions

---

## Support

For questions or schema changes:
1. Review architecture documentation
2. Consult legal/compliance teams
3. Test thoroughly on staging
4. Document all changes in migration files

---

**Schema Version**: 1.0.0  
**Last Updated**: 2024  
**Designer**: Enterprise Healthcare Systems Architect  
**Compliance**: HIPAA, Medical Board Requirements, Legal Discovery Ready

