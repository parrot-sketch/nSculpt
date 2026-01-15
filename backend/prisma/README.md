# Enterprise Surgical EHR - Database Schema

## Overview

This Prisma schema defines the core database architecture for an enterprise-grade Surgical EHR system. The schema is designed for:

- ✅ **HIPAA Compliance**: Immutable audit logs, PHI access tracking
- ✅ **Legal Defensibility**: Versioned records, consent snapshots, event sourcing
- ✅ **Clinical Accuracy**: Append-only medical records, amendment tracking
- ✅ **Scalability**: Proper indexing, UUID primary keys, partitioning-ready
- ✅ **Type Safety**: Prisma generates type-safe client code
- ✅ **Maintainability**: Modular domain-driven design

## Schema Organization

The schema is organized using **domain-driven design** principles with modular files:

```
prisma/
├── schema/                    # Modular schema files by domain
│   ├── base.prisma           # Generator & datasource config
│   ├── foundation.prisma     # Shared enums & types
│   ├── rbac.prisma           # Role-based access control
│   ├── theater.prisma        # Theater scheduling & booking
│   ├── medical_records.prisma # Clinical documentation
│   ├── consent.prisma        # Patient consents
│   └── audit.prisma          # Audit logs & compliance
├── schema.prisma             # Auto-generated merged schema (DO NOT EDIT)
└── scripts/
    └── merge-schema.js       # Schema merger script
```

### Why Modular?

- **Maintainability**: Each domain is self-contained and easier to understand
- **Collaboration**: Multiple developers can work on different domains simultaneously
- **Organization**: Related models are grouped logically
- **Version Control**: Smaller, focused files produce cleaner diffs

### Workflow

1. **Edit domain files** in `schema/` directory
2. **Merge schemas** before generating client or migrating:
   ```bash
   npm run schema:merge
   # or
   node scripts/merge-schema.js
   ```
3. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```
4. **Create migrations**:
   ```bash
   npx prisma migrate dev --name your_migration_name
   ```

⚠️ **Important**: Never edit `schema.prisma` directly - it's auto-generated. Always edit files in `schema/` directory.

## Quick Start

### Prerequisites

- PostgreSQL 14+ (15+ recommended)
- Node.js 18+
- Prisma CLI

### Setup

1. **Install Dependencies**
   ```bash
   npm install prisma @prisma/client
   ```

2. **Configure Database Connection**
   Create `.env` file:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/surgical_ehr?schema=public&sslmode=require"
   ```

3. **Merge Schema Files** (if editing domain files)
   ```bash
   npm run schema:merge
   ```

4. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

5. **Run Migrations**
   ```bash
   # Development: Creates migration and applies it
   npx prisma migrate dev --name init
   
   # Production: Applies pending migrations
   npx prisma migrate deploy
   ```

6. **Open Prisma Studio** (Optional)
   ```bash
   npx prisma studio
   ```

## Schema Structure

### Core Domains

1. **RBAC** (`schema/rbac.prisma`)
   - `users`, `roles`, `permissions`, `role_permissions`, `user_role_assignments`
   - Role-based access control with time-bound assignments
   - Granular permissions scoped by domain/resource/action

2. **Theater Scheduling** (`schema/theater.prisma`)
   - `departments`, `operating_theaters`, `surgical_cases`, `theater_reservations`, `resource_allocations`
   - Double-booking prevention via unique constraints
   - Flexible resource allocation (staff, equipment, inventory)

3. **Medical Records** (`schema/medical_records.prisma`)
   - `medical_records`, `clinical_notes`, `medical_record_attachments`
   - Append-only clinical notes with amendment tracking
   - Immutable record versioning

4. **Patient Consents** (`schema/consent.prisma`)
   - `consent_templates`, `consent_sections`, `consent_clauses`, `patient_consent_instances`, `patient_consent_acknowledgements`, `consent_artifacts`
   - Granular clause-level consent tracking
   - Template versioning with immutable snapshots

5. **Billing** (`schema/billing.prisma`)
   - `insurance_providers`, `insurance_policies`, `billing_codes`, `fee_schedules`, `charges`, `invoices`, `payments`, `claims`, `payment_plans`
   - Complete revenue cycle management
   - Insurance claims processing and tracking
   - Fee schedule management

6. **Inventory** (`schema/inventory.prisma`)
   - `vendors`, `inventory_categories`, `inventory_items`, `inventory_stock`, `inventory_transactions`, `purchase_orders`, `equipment_assignments`, `equipment_maintenance`
   - Equipment and supply management
   - Stock level tracking with lot/serial number support
   - Purchase order management
   - Equipment maintenance tracking

7. **Audit & Compliance** (`schema/audit.prisma`)
   - `domain_events`, `data_access_logs`
   - Event sourcing for complete state reconstruction
   - HIPAA-compliant PHI access logging

## Key Design Patterns

### Immutability
- Clinical notes are append-only (amendments create new records)
- Domain events are never updated or deleted
- Data access logs are immutable

### Versioning
- All entities include `version`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`
- Template versioning for consents ensures legal reconstruction

### Audit Trail
- Every state change generates a `DomainEvent`
- Every PHI access is logged in `DataAccessLog`
- Content hashing (SHA-256) for integrity verification

### Polymorphic Relations
- `DataAccessLog.resourceType + resourceId` pattern for flexible resource logging
- `ResourceAllocation.resourceType + resourceId` for equipment/staff/inventory

## Database Constraints

### Unique Constraints
- Theater reservations: Prevents double-booking (`theaterId + reservedFrom + reservedUntil`)
- User email/employee ID: Prevents duplicate accounts
- Case numbers: Human-readable unique identifiers

### Foreign Key Constraints
- Cascade deletes only for composition relationships
- SetNull for optional relationships (e.g., canceled case reservations)

### Indexes
- All foreign keys are indexed
- Time-range queries have composite indexes
- Full-text search on clinical notes and consent clauses
- HIPAA audit indexes on `accessedPHI`, `userId`, `accessedAt`

## Migration Strategy

### Development
```bash
# 1. Edit schema files in schema/ directory
# 2. Merge schemas
npm run schema:merge

# 3. Create and apply migration
npx prisma migrate dev --name description_of_change

# 4. Reset database if needed (WARNING: destroys all data)
npx prisma migrate reset
```

### Production
```bash
# 1. Merge schemas (in CI/CD pipeline)
npm run schema:merge

# 2. Apply pending migrations
npx prisma migrate deploy

# 3. Check migration status
npx prisma migrate status
```

### Best Practices
- Always review generated SQL migrations before applying
- Test migrations on staging environment first
- Never delete columns containing PHI (mark as deprecated instead)
- Add nullable fields first, backfill data, then make required

## NPM Scripts

Add these to your `package.json`:

```json
{
  "scripts": {
    "schema:merge": "node prisma/scripts/merge-schema.js",
    "schema:generate": "npm run schema:merge && npx prisma generate",
    "schema:migrate": "npm run schema:merge && npx prisma migrate dev",
    "db:studio": "npx prisma studio",
    "db:migrate": "npm run schema:merge && npx prisma migrate deploy"
  }
}
```

## Querying Examples

### Using Prisma Client

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Find all active surgical cases for a patient
const cases = await prisma.surgicalCase.findMany({
  where: {
    patientId: 'patient-uuid',
    status: 'SCHEDULED'
  },
  include: {
    reservations: {
      include: {
        theater: true
      }
    }
  }
})

// Find all PHI access logs for a user
const accessLogs = await prisma.dataAccessLog.findMany({
  where: {
    userId: 'user-uuid',
    accessedPHI: true,
    accessedAt: {
      gte: new Date('2024-01-01')
    }
  },
  orderBy: {
    accessedAt: 'desc'
  }
})

// Find consent instances requiring acknowledgment
const pendingConsents = await prisma.patientConsentInstance.findMany({
  where: {
    status: 'DRAFT',
    template: {
      sections: {
        some: {
          required: true,
          acknowledgments: {
            none: {
              instanceId: { equals: '$instanceId' }
            }
          }
        }
      }
    }
  }
})
```

## Performance Considerations

### Indexing Strategy
- Foreign keys: Automatic indexes
- Time ranges: Composite indexes on `(start, end)`
- Status fields: Indexed for filtering
- Full-text search: GIN indexes on text content

### Future Partitioning
For large-scale deployments, consider partitioning:
- `domain_events`: Partition by `occurredAt` (monthly/quarterly)
- `data_access_logs`: Partition by `accessedAt` (monthly)

This enables efficient archival and query performance.

### Query Optimization
- Use `select` to fetch only required fields
- Leverage JSONB indexes on `DomainEvent.payload`
- Consider materialized views for common reports

## Security

### Encryption
- **At Rest**: Enable PostgreSQL TDE or encrypted storage volumes
- **In Transit**: Always use SSL/TLS (`sslmode=require` in connection string)

### Password Storage
- `User.passwordHash` should use bcrypt with cost factor 12+
- Passwords should never be stored in plain text

### Access Control
- Application layer enforces permissions (database is defense-in-depth)
- All queries should be parameterized (Prisma handles this automatically)

## Compliance

### HIPAA Requirements
- ✅ Access logs meet minimum retention (6 years)
- ✅ PHI access tracking (`accessedPHI` flag)
- ✅ Audit trail for all data changes
- ✅ Integrity verification (content hashing)

### Medical Board Requirements
- ✅ Clinical note immutability
- ✅ Amendment tracking
- ✅ Operative note attribution
- ✅ Record merging support

## Documentation

See [ARCHITECTURE.md](../database/docs/ARCHITECTURE.md) for detailed design decisions and architectural rationale.

See [DOMAIN_MODEL.md](../database/docs/DOMAIN_MODEL.md) for entity relationship diagrams and patterns.

## CI/CD Integration

### Pre-commit Hook (Optional)

Add to `.husky/pre-commit` or `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Merge schemas before committing
cd backend/prisma && node scripts/merge-schema.js
git add schema.prisma
```

### GitHub Actions Example

```yaml
- name: Merge Prisma Schemas
  run: |
    cd backend/prisma
    node scripts/merge-schema.js
    
- name: Validate Schema
  run: npx prisma validate
  
- name: Generate Client
  run: npx prisma generate
```

## Support

For schema changes or questions:
1. Review architecture documentation
2. Consult healthcare IT legal counsel for compliance questions
3. Test all migrations on staging environment
