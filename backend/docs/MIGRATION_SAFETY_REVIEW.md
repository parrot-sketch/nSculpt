# Migration Safety Review: Add Patient Module

**Date**: 2026-01-03  
**Migration Name**: `add_patient_module`  
**Status**: ✅ **SAFE TO APPLY** (with pre-checks)

---

## Migration SQL Overview

**Total Lines**: 270  
**Operations**: 
- ✅ 1 ENUM creation (PatientStatus)
- ✅ 6 TABLE creations (patients + 5 supporting tables)
- ✅ 24 INDEX creations
- ✅ 15 FOREIGN KEY constraints

---

## Safety Analysis

### ✅ SAFE Operations (No Data Loss)

1. **CreateEnum**: `PatientStatus`
   - ✅ Creates new enum type
   - ✅ No impact on existing data

2. **CreateTable**: All 6 tables are NEW
   - ✅ `patients` - New table
   - ✅ `patient_contacts` - New table
   - ✅ `patient_documents` - New table
   - ✅ `patient_allergies` - New table
   - ✅ `patient_risk_flags` - New table
   - ✅ `patient_merge_history` - New table
   - ✅ **No existing data affected**

3. **CreateIndex**: All indexes on new tables
   - ✅ All indexes are on newly created tables
   - ✅ No impact on existing tables

### ⚠️ POTENTIAL RISK: Foreign Key Constraints

**Risk**: Foreign key constraints will FAIL if existing `patientId` values exist in:
- `surgical_cases.patientId`
- `medical_records.patientId`
- `bills.patientId`
- `patient_consent_instances.patientId`
- `insurance_policies.patientId`

**Why**: Foreign keys require that all `patientId` values reference existing rows in `patients` table. Since `patients` table will be empty initially, any existing `patientId` values will cause constraint violation.

**Mitigation**: 
1. ✅ Check for existing `patientId` values BEFORE migration
2. ✅ If values exist, they must be:
   - Valid UUIDs (format check)
   - Either NULL or create placeholder Patient records first

---

## Pre-Migration Safety Checks

### Check 1: Verify No Existing Patient Data

```sql
-- Run this BEFORE migration
SELECT 
  'surgical_cases' as table_name,
  COUNT(*) as total_rows,
  COUNT("patientId") as non_null_patient_ids
FROM surgical_cases
UNION ALL
SELECT 'medical_records', COUNT(*), COUNT("patientId") FROM medical_records
UNION ALL
SELECT 'bills', COUNT(*), COUNT("patientId") FROM bills
UNION ALL
SELECT 'patient_consent_instances', COUNT(*), COUNT("patientId") FROM patient_consent_instances
UNION ALL
SELECT 'insurance_policies', COUNT(*), COUNT("patientId") FROM insurance_policies;
```

**Expected Result**: All `non_null_patient_ids` should be `0` (no existing patient references)

### Check 2: Verify UUID Format (if patientId values exist)

```sql
-- Only run if Check 1 shows non-zero patientId values
SELECT 
  'surgical_cases' as table_name,
  COUNT(*) as invalid_uuids
FROM surgical_cases
WHERE "patientId" IS NOT NULL 
  AND "patientId" !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
UNION ALL
SELECT 'medical_records', COUNT(*) FROM medical_records
WHERE "patientId" IS NOT NULL 
  AND "patientId" !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
```

**Expected Result**: All `invalid_uuids` should be `0`

---

## Migration Steps (Safe Path)

### Step 1: Backup Database

```bash
# From host machine
docker exec ehr-postgres pg_dump -U ehr_user "1xetra*onmi" > /tmp/backup_before_patient_migration_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Run Pre-Migration Checks

```bash
# Check for existing patientId values
docker exec ehr-postgres psql -U ehr_user -d "1xetra*onmi" -c "
SELECT 
  'surgical_cases' as table_name,
  COUNT(\"patientId\") as non_null_patient_ids
FROM surgical_cases
UNION ALL
SELECT 'medical_records', COUNT(\"patientId\") FROM medical_records
UNION ALL
SELECT 'bills', COUNT(\"patientId\") FROM bills
UNION ALL
SELECT 'patient_consent_instances', COUNT(\"patientId\") FROM patient_consent_instances
UNION ALL
SELECT 'insurance_policies', COUNT(\"patientId\") FROM insurance_policies;
"
```

**If all counts are 0**: ✅ Safe to proceed  
**If any count > 0**: ⚠️ See "Handling Existing PatientId Values" below

### Step 3: Generate Migration File

```bash
# From backend container
cd /home/bkg/ns
docker exec ehr-backend bash -c "
cd /app && 
npx prisma migrate diff \
  --from-url \"\$DATABASE_URL\" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/$(date +%Y%m%d%H%M%S)_add_patient_module/migration.sql
"
```

**OR** manually create migration:

```bash
cd /home/bkg/ns/backend
mkdir -p prisma/migrations/$(date +%Y%m%d%H%M%S)_add_patient_module
# Copy migration SQL to prisma/migrations/YYYYMMDDHHMMSS_add_patient_module/migration.sql
```

### Step 4: Review Migration SQL

✅ Verify:
- No `DROP TABLE` statements
- No `DROP COLUMN` statements
- No `ALTER COLUMN` on existing tables (only new tables)
- All foreign keys use `ON DELETE RESTRICT` (prevents accidental deletion)

### Step 5: Apply Migration

```bash
# Option A: Using Prisma Migrate (recommended)
cd /home/bkg/ns
docker exec -it ehr-backend bash -c "cd /app && npx prisma migrate deploy"

# Option B: Manual SQL execution (if migrate deploy doesn't work)
docker exec ehr-postgres psql -U ehr_user -d "1xetra*onmi" -f /path/to/migration.sql
```

---

## Handling Existing PatientId Values

**If Check 2 shows existing `patientId` values:**

### Option A: Set to NULL (if acceptable)

```sql
-- Only if patientId can be NULL in your business logic
UPDATE surgical_cases SET "patientId" = NULL WHERE "patientId" IS NOT NULL;
UPDATE medical_records SET "patientId" = NULL WHERE "patientId" IS NOT NULL;
-- ... repeat for other tables
```

### Option B: Create Placeholder Patients

```sql
-- Create placeholder Patient records for existing patientId values
-- This preserves referential integrity
INSERT INTO patients (id, mrn, "firstName", "lastName", "dateOfBirth", status, "createdAt", "updatedAt")
SELECT 
  DISTINCT "patientId",
  'MRN-PLACEHOLDER-' || "patientId"::text,
  'Placeholder',
  'Patient',
  '1900-01-01'::date,
  'ACTIVE',
  NOW(),
  NOW()
FROM (
  SELECT "patientId" FROM surgical_cases WHERE "patientId" IS NOT NULL
  UNION
  SELECT "patientId" FROM medical_records WHERE "patientId" IS NOT NULL
  UNION
  SELECT "patientId" FROM bills WHERE "patientId" IS NOT NULL
  UNION
  SELECT "patientId" FROM patient_consent_instances WHERE "patientId" IS NOT NULL
  UNION
  SELECT "patientId" FROM insurance_policies WHERE "patientId" IS NOT NULL
) AS all_patient_ids
WHERE "patientId" IS NOT NULL;
```

**Then run migration** - foreign keys will succeed.

---

## Foreign Key Constraint Details

### ON DELETE RESTRICT (Safe)
Applied to:
- `surgical_cases.patientId` → `patients.id`
- `medical_records.patientId` → `patients.id`
- `bills.patientId` → `patients.id`
- `patient_consent_instances.patientId` → `patients.id`
- `insurance_policies.patientId` → `patients.id`

**Meaning**: Cannot delete a Patient if it has related records. **This is SAFE** - prevents orphaned data.

### ON DELETE CASCADE (Safe)
Applied to:
- `patient_contacts.patientId` → `patients.id`
- `patient_documents.patientId` → `patients.id`
- `patient_allergies.patientId` → `patients.id`
- `patient_risk_flags.patientId` → `patients.id`

**Meaning**: Deleting a Patient deletes related contacts/documents/allergies/flags. **This is SAFE** - child records should be deleted with parent.

### ON DELETE SET NULL (Safe)
Applied to:
- `patients.createdBy` → `users.id`
- `patients.updatedBy` → `users.id`
- `patients.restrictedBy` → `users.id`
- `patients.deceasedBy` → `users.id`
- `patients.archivedBy` → `users.id`
- `patients.mergedBy` → `users.id`

**Meaning**: If User is deleted, audit fields are set to NULL. **This is SAFE** - preserves Patient record even if User is deleted.

---

## Rollback Plan

### If Migration Fails

1. **Foreign Key Constraint Error**:
   ```sql
   -- Check which table caused the error
   SELECT "patientId" FROM <table_name> WHERE "patientId" IS NOT NULL;
   
   -- Either set to NULL or create placeholder Patient records
   ```

2. **Rollback Migration**:
   ```bash
   # Prisma tracks migrations, so you can mark as rolled back
   docker exec ehr-backend bash -c "cd /app && npx prisma migrate resolve --rolled-back <migration_name>"
   ```

3. **Manual Rollback** (if needed):
   ```sql
   -- Drop foreign keys first
   ALTER TABLE surgical_cases DROP CONSTRAINT IF EXISTS surgical_cases_patientId_fkey;
   ALTER TABLE medical_records DROP CONSTRAINT IF EXISTS medical_records_patientId_fkey;
   -- ... repeat for all foreign keys
   
   -- Drop tables (in reverse order of creation)
   DROP TABLE IF EXISTS patient_merge_history;
   DROP TABLE IF EXISTS patient_risk_flags;
   DROP TABLE IF EXISTS patient_allergies;
   DROP TABLE IF EXISTS patient_documents;
   DROP TABLE IF EXISTS patient_contacts;
   DROP TABLE IF EXISTS patients;
   
   -- Drop enum
   DROP TYPE IF EXISTS "PatientStatus";
   ```

---

## Post-Migration Verification

### Verify Tables Created

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('patients', 'patient_contacts', 'patient_documents', 'patient_allergies', 'patient_risk_flags', 'patient_merge_history')
ORDER BY table_name;
```

**Expected**: 6 tables

### Verify Foreign Keys Created

```sql
SELECT 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND ccu.table_name = 'patients'
ORDER BY tc.table_name, kcu.column_name;
```

**Expected**: 15 foreign keys pointing to `patients` table

### Verify Indexes Created

```sql
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename LIKE 'patient%'
ORDER BY tablename, indexname;
```

**Expected**: 24 indexes

---

## Summary

✅ **Migration is SAFE** - only creates new tables and constraints  
⚠️ **Pre-check required** - verify no existing `patientId` values  
✅ **No data loss** - all operations are additive  
✅ **Rollback available** - can be reversed if needed  

**Recommendation**: ✅ **APPROVED FOR PRODUCTION** (after pre-checks pass)









