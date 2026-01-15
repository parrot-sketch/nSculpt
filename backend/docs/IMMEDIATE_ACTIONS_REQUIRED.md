# Immediate Actions Required - Database & Workflow Setup

## 🎯 Summary

Your annotations endpoint is failing (404) because the `PDFConsentAnnotation` model was missing from the database schema. **This has been fixed** - the model has been added to `schema.prisma` with all necessary relations.

**Now you need to run migrations to create the database table.**

---

## ✅ What Was Done

### 1. Added PDFConsentAnnotation Model ✅
**Location**: `backend/prisma/schema.prisma` (lines ~2207-2244)

**Model Structure**:
```prisma
model PDFConsentAnnotation {
  id              String    @id @default(uuid())
  consentId       String
  annotationType  String    // TEXT, HIGHLIGHT, STICKY_NOTE, etc.
  pageNumber      Int       // Page number (1-indexed)
  
  // Position and dimensions
  x               Float     // X coordinate
  y               Float     // Y coordinate
  width           Float?    // Width
  height          Float?    // Height
  coordinates     Json?     // Complex shapes
  
  // Content
  content         String?   // Annotation text
  color           String    // Hex color (#000000)
  
  // Audit
  createdById     String
  createdAt       DateTime
  updatedAt       DateTime
  deletedAt       DateTime? // Soft delete
  
  // Relations
  consent         PDFConsent @relation(fields: [consentId], references: [id], onDelete: Cascade)
  createdBy       User @relation("PDFConsentAnnotationCreator", fields: [createdById], references: [id])
  
  @@index([consentId])
  @@index([createdById])
  @@index([deletedAt])
  @@map("pdf_consent_annotations")
}
```

### 2. Updated PDFConsent Model ✅
Added annotations relation:
```prisma
model PDFConsent {
  // ... existing fields ...
  annotations      PDFConsentAnnotation[]
}
```

### 3. Updated User Model ✅
Added annotation creator relation:
```prisma
model User {
  // ... existing relations ...
  pdfConsentAnnotations PDFConsentAnnotation[] @relation("PDFConsentAnnotationCreator")
}
```

### 4. Created Workflow Documentation ✅
**Location**: `backend/docs/PLASTIC_SURGERY_WORKFLOW_DATABASE_SETUP.md`

Complete documentation of:
- Local database setup
- Migration commands
- Full plastic surgery center workflow (11 stages)
- All relationships between models
- Status transitions
- Business rules

---

## 🚀 Next Steps (REQUIRED)

### Step 1: Generate Migration

```bash
cd /home/bkg/ns/backend
npx prisma migrate dev --name add_pdf_consent_annotations
```

**What this does:**
- Creates SQL migration file in `prisma/migrations/`
- Creates `pdf_consent_annotations` table
- Adds indexes
- Generates Prisma Client with new model

**Expected Output:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "surgical_ehr"

Applying migration `add_pdf_consent_annotations`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20260107XXXXXX_add_pdf_consent_annotations/
    └─ migration.sql

Your database is now in sync with your schema.
```

### Step 2: Verify Migration

```bash
# Check migration status
npx prisma migrate status

# Should show: Database schema is up to date!
```

### Step 3: Generate Prisma Client

```bash
npx prisma generate
```

**What this does:**
- Updates TypeScript types
- Adds `prisma.pDFConsentAnnotation` methods
- Updates IDE autocomplete

### Step 4: Restart Backend

```bash
# Option 1: Docker restart
docker-compose restart backend

# Option 2: Full rebuild (if needed)
docker-compose down backend
docker-compose up -d backend

# Check logs
docker-compose logs -f backend
```

### Step 5: Test Annotations Endpoint

```bash
# Test GET annotations (should return empty array instead of 404)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3002/api/v1/consents/6117c11c-dbc9-4f9b-be93-434d1bc14ca2/annotations

# Expected response:
# []

# If you get 404, check:
# 1. Migration applied: npx prisma migrate status
# 2. Client generated: npx prisma generate
# 3. Backend restarted: docker-compose restart backend
```

---

## 🔍 Understanding the Database Setup

### Connection Details

**Development (Docker)**:
```
Host: localhost
Port: 5432
Database: surgical_ehr
User: ehr_user
Password: 1xetra*onmi
URL: postgresql://ehr_user:1xetra%2Aonmi@localhost:5432/surgical_ehr?schema=public
```

**Inside Docker Network**:
```
Host: postgres (service name)
Port: 5432
URL: postgresql://ehr_user:1xetra%2Aonmi@postgres:5432/surgical_ehr?schema=public
```

### Migration Flow

```
┌─────────────────────┐
│ Edit schema.prisma  │  ← We did this
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ prisma migrate dev  │  ← You need to do this
└──────────┬──────────┘
           │
           ├──────────────────────────┐
           │                          │
           ▼                          ▼
┌─────────────────────┐    ┌─────────────────────┐
│ Create migration    │    │ Apply to database   │
│ SQL file            │    │ (CREATE TABLE)      │
└─────────────────────┘    └──────────┬──────────┘
                                       │
                                       ▼
                           ┌─────────────────────┐
                           │ Generate            │
                           │ Prisma Client       │
                           └──────────┬──────────┘
                                      │
                                      ▼
                           ┌─────────────────────┐
                           │ Restart backend     │
                           └──────────┬──────────┘
                                      │
                                      ▼
                           ┌─────────────────────┐
                           │ Endpoints work! ✅  │
                           └─────────────────────┘
```

---

## 📚 Complete Workflow Reference

See `backend/docs/PLASTIC_SURGERY_WORKFLOW_DATABASE_SETUP.md` for:

### 11-Stage Workflow

1. **Patient Intake** → `Patient` model
2. **Appointment Booking** → `Appointment` model (PENDING_PAYMENT)
3. **Payment Confirmation** → `Payment` + `Appointment` (CONFIRMED)
4. **Check-In** → `Appointment` (CHECKED_IN)
5. **Consultation** → `Consultation` model (from Appointment)
6. **Procedure Planning** → `ProcedurePlan` model
7. **Consent Generation** → `PDFConsent` model (DRAFT)
8. **Consent Review & Annotation** → `PDFConsentAnnotation` model ⭐ NEW
9. **Consent Signing** → `PDFConsentSignature` model (SIGNED)
10. **Surgery Scheduling** → `SurgicalCase` model
11. **Surgery Execution** → Complete

### Critical Rules

✅ **Consultation REQUIRES Appointment** (one-to-one)
✅ **Procedure Plan REQUIRES Consultation**
✅ **Consent REQUIRES Patient**
✅ **Signature Order**: Patient → Doctor → Witness
✅ **Immutability**: Signed consents cannot be modified

---

## 🔧 Troubleshooting

### Issue: Migration Fails

**Error**: "Datasource error: could not connect to database"

**Solution**:
```bash
# Check if database is running
docker-compose ps postgres

# Should show:
# NAME         STATUS    PORTS
# ehr-postgres Up        0.0.0.0:5432->5432/tcp

# If not running:
docker-compose up -d postgres
```

### Issue: Permission Denied

**Error**: "permission denied for schema public"

**Solution**:
```bash
# Connect as superuser
docker exec -it ehr-postgres psql -U postgres

# Grant permissions
GRANT ALL ON SCHEMA public TO ehr_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO ehr_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO ehr_user;
\q
```

### Issue: Schema Out of Sync

**Error**: "Your database schema is not in sync"

**Solution**:
```bash
# Reset database (DEVELOPMENT ONLY - WILL DELETE DATA)
npx prisma migrate reset

# Or manually sync
npx prisma db push
```

### Issue: Backend Not Restarting

```bash
# Check logs
docker-compose logs backend

# Force rebuild
docker-compose build backend
docker-compose up -d backend
```

---

## ✅ Checklist

Before marking this complete, verify:

- [ ] Migration created: `ls -la backend/prisma/migrations/`
- [ ] Migration applied: `npx prisma migrate status`
- [ ] Client generated: Check `node_modules/.prisma/client/index.d.ts`
- [ ] Backend restarted: `docker-compose ps backend` shows "Up"
- [ ] Endpoint works: GET `/api/v1/consents/{id}/annotations` returns `[]` not 404
- [ ] Database table exists: `docker exec -it ehr-postgres psql -U ehr_user -d surgical_ehr -c "\d pdf_consent_annotations"`

---

## 📝 Additional Resources

### Prisma Documentation
- Migrations: https://www.prisma.io/docs/concepts/components/prisma-migrate
- Relations: https://www.prisma.io/docs/concepts/components/prisma-schema/relations

### Project Documentation
- Main Workflow: `backend/docs/PLASTIC_SURGERY_WORKFLOW_DATABASE_SETUP.md`
- Consent Refactoring: `backend/docs/CONSENT_MODULE_REFACTORING_SUMMARY.md`
- Data Structure: `backend/docs/DATA_STRUCTURE_OPTIMIZATION.md`

---

**Created**: 2026-01-07
**Priority**: HIGH - Required for annotations feature
**Status**: Schema Updated ✅ | Migrations Pending ⏳





