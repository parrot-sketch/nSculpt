# Schema Organization Guide

## Overview

The Prisma schema has been refactored into a **modular, domain-driven structure** for better maintainability and collaboration.

## Structure

```
prisma/
├── schema/                    # ✨ Modular domain files (edit these)
│   ├── base.prisma           # Generator & datasource configuration
│   ├── foundation.prisma     # Shared enums (Domain, Severity)
│   ├── rbac.prisma           # Users, Roles, Permissions
│   ├── theater.prisma        # Scheduling & booking
│   ├── medical_records.prisma # Clinical documentation
│   ├── consent.prisma        # Patient consents
│   └── audit.prisma          # Compliance & logging
├── schema.prisma             # ⚠️ Auto-generated (DO NOT EDIT)
└── scripts/
    └── merge-schema.js       # Schema merger
```

## Benefits

### ✅ Before (Single 720-line file)
- ❌ Hard to navigate
- ❌ Merge conflicts when multiple developers work
- ❌ Difficult to understand relationships
- ❌ Large diffs in version control

### ✅ After (Modular structure)
- ✅ Clear domain boundaries
- ✅ Easier collaboration (work on different domains)
- ✅ Smaller, focused files (~100-200 lines each)
- ✅ Better organization and discoverability
- ✅ Cleaner version control diffs

## Workflow

### 1. Editing Schema

**Always edit files in `schema/` directory, NOT `schema.prisma`**

```bash
# Edit a domain file
vim prisma/schema/rbac.prisma
```

### 2. Merging Before Operations

Before generating client or creating migrations:

```bash
# Merge domain files into schema.prisma
npm run schema:merge
# or
node prisma/scripts/merge-schema.js
```

### 3. Standard Prisma Commands

```bash
# Generate client (automatically merges if using npm script)
npm run schema:generate

# Create migration
npx prisma migrate dev --name your_change

# Format schema
npx prisma format
```

## Domain Responsibilities

### `base.prisma`
- Generator configuration
- Datasource configuration
- Database connection settings

### `foundation.prisma`
- Shared enumerations
- Common types used across domains
- Domain enum (THEATER, MEDICAL_RECORDS, etc.)

### `rbac.prisma` (Role-Based Access Control)
- User management
- Role definitions
- Permission system
- User-role assignments

**Models**: `User`, `Role`, `Permission`, `RolePermission`, `UserRoleAssignment`

### `theater.prisma` (Scheduling & Booking)
- Operating theaters
- Surgical cases
- Reservations
- Resource allocation

**Models**: `Department`, `OperatingTheater`, `SurgicalCase`, `TheaterReservation`, `ResourceAllocation`

### `medical_records.prisma` (Clinical Documentation)
- Medical records
- Clinical notes (append-only)
- Attachments

**Models**: `MedicalRecord`, `ClinicalNote`, `MedicalRecordAttachment`

### `consent.prisma` (Patient Consents)
- Consent templates
- Sections and clauses
- Patient consent instances
- Acknowledgements

**Models**: `ConsentTemplate`, `ConsentSection`, `ConsentClause`, `PatientConsentInstance`, `PatientConsentAcknowledgement`, `ConsentArtifact`

### `audit.prisma` (Compliance & Logging)
- Domain events (event sourcing)
- Data access logs (HIPAA)

**Models**: `DomainEvent`, `DataAccessLog`

## Best Practices

### 1. Keep Domains Independent
- Each domain file should be self-contained
- Cross-domain references via foreign keys are OK
- Avoid circular dependencies

### 2. Consistent Patterns
- All entities include audit fields (`createdAt`, `updatedAt`, `version`, etc.)
- Use consistent naming conventions
- Add meaningful comments for complex relationships

### 3. Merge Before Committing
- Always merge schemas before committing changes
- Consider pre-commit hooks (see README)
- Verify merged schema with `npx prisma validate`

### 4. Documentation
- Document complex relationships in comments
- Explain business logic and constraints
- Reference external documentation when needed

## Migration from Single File

If you need to add a new model:

1. **Identify the domain** (RBAC, Theater, Medical Records, Consent, Audit)
2. **Add to appropriate domain file** in `schema/` directory
3. **Merge schemas**: `npm run schema:merge`
4. **Create migration**: `npx prisma migrate dev --name add_new_model`

## Troubleshooting

### Schema validation fails after merge
```bash
# Check for syntax errors
npx prisma format

# Validate schema
npx prisma validate
```

### Merge conflicts
- Resolve conflicts in domain files, not `schema.prisma`
- Re-merge after resolving: `npm run schema:merge`

### Missing models after merge
- Check file order in `merge-schema.js` (order matters)
- Verify file is included in `SCHEMA_ORDER` array

## CI/CD Integration

Add to your pipeline:

```yaml
- name: Merge Prisma Schemas
  run: npm run schema:merge
  
- name: Validate Schema
  run: npx prisma validate
```

This ensures the merged schema is always valid before deployment.

## Conclusion

This modular structure follows **domain-driven design** principles and makes the schema significantly more maintainable for enterprise-scale applications. Each domain is self-contained, making it easier to understand, modify, and collaborate on.












