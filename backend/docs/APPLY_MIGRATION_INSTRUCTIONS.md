# Apply Patient Module Migration - Step-by-Step Instructions

**Date**: 2026-01-03  
**Status**: ✅ **READY TO APPLY** - All safety checks passed

---

## Pre-Migration Status ✅

**Safety Check Results**:
- ✅ All tables have **0 existing `patientId` values**
- ✅ No foreign key constraint conflicts expected
- ✅ Database is healthy and accessible
- ✅ Migration SQL generated successfully (270 lines)

**Tables Checked**:
- `surgical_cases`: 0 patientId values
- `medical_records`: 0 patientId values  
- `bills`: 0 patientId values
- `patient_consent_instances`: 0 patientId values
- `insurance_policies`: 0 patientId values

---

## Migration Overview

**What Will Be Created**:
1. ✅ `PatientStatus` enum (ACTIVE, INACTIVE, DECEASED, ARCHIVED)
2. ✅ `patients` table (core patient identity)
3. ✅ `patient_contacts` table (emergency contacts)
4. ✅ `patient_documents` table (ID documents)
5. ✅ `patient_allergies` table (allergy tracking)
6. ✅ `patient_risk_flags` table (clinical risk indicators)
7. ✅ `patient_merge_history` table (duplicate resolution audit)

**Foreign Keys Added** (15 total):
- `surgical_cases.patientId` → `patients.id` (RESTRICT)
- `medical_records.patientId` → `patients.id` (RESTRICT)
- `bills.patientId` → `patients.id` (RESTRICT)
- `patient_consent_instances.patientId` → `patients.id` (RESTRICT)
- `insurance_policies.patientId` → `patients.id` (RESTRICT)
- Plus 10 more (User relations, child tables, etc.)

**Indexes Created**: 24 indexes for performance

---

## Step-by-Step Application

### Step 1: Backup Database (Recommended)

```bash
cd /home/bkg/ns
docker exec ehr-postgres pg_dump -U ehr_user "1xetra*onmi" > /tmp/backup_before_patient_migration_$(date +%Y%m%d_%H%M%S).sql
```

**Verify backup**:
```bash
ls -lh /tmp/backup_before_patient_migration_*.sql
```

### Step 2: Locate Migration File

The migration file should be in:
```
/home/bkg/ns/backend/prisma/migrations/YYYYMMDDHHMMSS_add_patient_module/migration.sql
```

**Find it**:
```bash
cd /home/bkg/ns/backend
find prisma/migrations -name "migration.sql" -type f | sort | tail -1
```

### Step 3: Review Migration SQL (Optional but Recommended)

```bash
cd /home/bkg/ns/backend
MIGRATION_FILE=$(find prisma/migrations -name "migration.sql" -type f | sort | tail -1)
cat "$MIGRATION_FILE" | head -50  # Review first 50 lines
```

**Verify**:
- ✅ No `DROP TABLE` statements
- ✅ No `DROP COLUMN` statements
- ✅ Only `CREATE TABLE`, `CREATE INDEX`, `CREATE TYPE`, `ALTER TABLE ADD CONSTRAINT`

### Step 4: Apply Migration

**Option A: Using Prisma Migrate (Recommended)**

```bash
cd /home/bkg/ns
# Mark migration as applied (since we already have the SQL)
docker exec ehr-backend bash -c "cd /app && npx prisma migrate resolve --applied add_patient_module" 2>&1 || echo "Migration not in Prisma history yet"

# Or apply directly
docker exec ehr-backend bash -c "cd /app && npx prisma migrate deploy" 2>&1
```

**Option B: Manual SQL Execution (If Prisma Migrate doesn't work)**

```bash
cd /home/bkg/ns
MIGRATION_FILE=$(find backend/prisma/migrations -name "migration.sql" -type f | sort | tail -1)
docker exec -i ehr-postgres psql -U ehr_user -d "1xetra*onmi" < "$MIGRATION_FILE" 2>&1
```

**Option C: Execute from Container**

```bash
cd /home/bkg/ns
docker exec ehr-backend bash -c "
  cd /app && 
  MIGRATION_FILE=\$(find prisma/migrations -name 'migration.sql' -type f | sort | tail -1) &&
  npx prisma db execute --file \"\$MIGRATION_FILE\" --schema prisma/schema.prisma
" 2>&1
```

### Step 5: Verify Migration Success

**Check Tables Created**:
```bash
docker exec ehr-postgres psql -U ehr_user -d "1xetra*onmi" -c "
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('patients', 'patient_contacts', 'patient_documents', 'patient_allergies', 'patient_risk_flags', 'patient_merge_history')
ORDER BY table_name;
"
```

**Expected Output**: 6 tables listed

**Check Foreign Keys**:
```bash
docker exec ehr-postgres psql -U ehr_user -d "1xetra*onmi" -c "
SELECT COUNT(*) as foreign_key_count
FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY' 
  AND constraint_name LIKE '%patient%';
"
```

**Expected Output**: `foreign_key_count` >= 15

**Check Enum Created**:
```bash
docker exec ehr-postgres psql -U ehr_user -d "1xetra*onmi" -c "
SELECT typname FROM pg_type WHERE typname = 'PatientStatus';
"
```

**Expected Output**: `PatientStatus`

### Step 6: Regenerate Prisma Client

```bash
cd /home/bkg/ns
docker exec ehr-backend bash -c "cd /app && npx prisma generate" 2>&1
```

**Verify**:
```bash
docker exec ehr-backend bash -c "cd /app && node -e \"const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); console.log('Prisma Client loaded successfully');\"" 2>&1
```

---

## Troubleshooting

### Error: "relation 'patients' already exists"

**Cause**: Migration was partially applied  
**Fix**: 
```sql
-- Check what exists
SELECT table_name FROM information_schema.tables WHERE table_name = 'patients';

-- If table exists but migration failed, manually complete:
-- 1. Check which constraints/indexes are missing
-- 2. Apply only the missing parts from migration.sql
```

### Error: "foreign key constraint violation"

**Cause**: Existing `patientId` values don't match any Patient records  
**Fix**: See "Handling Existing PatientId Values" in `MIGRATION_SAFETY_REVIEW.md`

### Error: "enum type 'PatientStatus' already exists"

**Cause**: Migration was partially applied  
**Fix**:
```sql
-- Check if enum exists
SELECT typname FROM pg_type WHERE typname = 'PatientStatus';

-- If exists, migration can skip enum creation
-- Manually edit migration.sql to remove CREATE TYPE line
```

### Migration File Not Found

**Fix**: Regenerate migration SQL:
```bash
cd /home/bkg/ns
docker exec ehr-backend bash -c "
  cd /app && 
  npx prisma migrate diff \
    --from-url \"\$DATABASE_URL\" \
    --to-schema-datamodel prisma/schema.prisma \
    --script
" > /tmp/migration.sql

# Review and apply
cat /tmp/migration.sql | head -50
```

---

## Post-Migration Checklist

- [ ] All 6 Patient tables created
- [ ] `PatientStatus` enum created
- [ ] 15+ foreign key constraints created
- [ ] 24 indexes created
- [ ] Prisma Client regenerated
- [ ] Backend can start without errors
- [ ] Repository methods can be tested

---

## Next Steps After Migration

1. **Test Repository Methods**:
   ```typescript
   // In your test file or API endpoint
   const patient = await patientRepository.create({
     firstName: 'Test',
     lastName: 'Patient',
     dateOfBirth: '1990-01-01',
   });
   console.log('MRN:', patient.mrn); // Should be MRN-2026-00001
   ```

2. **Verify MRN Generation**:
   - Create first patient → Should get `MRN-2026-00001`
   - Create second patient → Should get `MRN-2026-00002`

3. **Test Foreign Key Constraints**:
   - Try to create a SurgicalCase with invalid patientId → Should fail
   - Create Patient first, then SurgicalCase → Should succeed

---

## Rollback Instructions

If migration needs to be rolled back:

```sql
-- 1. Drop foreign keys first
ALTER TABLE surgical_cases DROP CONSTRAINT IF EXISTS surgical_cases_patientId_fkey;
ALTER TABLE medical_records DROP CONSTRAINT IF EXISTS medical_records_patientId_fkey;
ALTER TABLE bills DROP CONSTRAINT IF EXISTS bills_patientId_fkey;
ALTER TABLE patient_consent_instances DROP CONSTRAINT IF EXISTS patient_consent_instances_patientId_fkey;
ALTER TABLE insurance_policies DROP CONSTRAINT IF EXISTS insurance_policies_patientId_fkey;
-- ... (drop all 15 foreign keys)

-- 2. Drop tables (reverse order)
DROP TABLE IF EXISTS patient_merge_history;
DROP TABLE IF EXISTS patient_risk_flags;
DROP TABLE IF EXISTS patient_allergies;
DROP TABLE IF EXISTS patient_documents;
DROP TABLE IF EXISTS patient_contacts;
DROP TABLE IF EXISTS patients;

-- 3. Drop enum
DROP TYPE IF EXISTS "PatientStatus";
```

**Or restore from backup**:
```bash
docker exec -i ehr-postgres psql -U ehr_user -d "1xetra*onmi" < /tmp/backup_before_patient_migration_*.sql
```

---

## Summary

✅ **Migration is SAFE** - All pre-checks passed  
✅ **No existing data conflicts** - All patientId values are NULL  
✅ **Ready to apply** - Follow steps above  

**Estimated Time**: 2-5 minutes  
**Risk Level**: **LOW** (additive only, no data loss)









