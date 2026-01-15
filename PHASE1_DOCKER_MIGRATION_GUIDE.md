# Phase 1: Docker Migration Guide

## Overview

This guide explains how to apply Phase 1 schema extensions to the database running in Docker.

**Important**: The backend and database are running in Docker containers. Migrations must be applied within the Docker environment.

---

## Prerequisites

- Docker and Docker Compose running
- Backend container (`ehr-backend`) is running
- Database container (`ehr-postgres`) is running and healthy
- Schema changes have been validated: `npx prisma validate` ✅

---

## Migration Steps

### Option 1: Apply Migration via Backend Container (Recommended)

This is the recommended approach as it uses the backend container's environment.

```bash
# Navigate to project root
cd /home/bkg/ns

# Apply migration using backend container
docker-compose exec backend npx prisma migrate deploy

# OR for development (creates migration and applies):
docker-compose exec backend npx prisma migrate dev --name aesthetic_surgery_workflows_phase1
```

**Note**: If using `migrate dev`, it will:
1. Create the migration file (if not exists)
2. Apply it to the database
3. Generate Prisma client

### Option 2: Apply Migration via Local Prisma (If Connected to Docker DB)

If your local environment has `DATABASE_URL` pointing to the Docker database:

```bash
cd backend

# Ensure DATABASE_URL points to Docker database
# Should be: postgresql://ehr_user:1xetra%2Aonmi@localhost:5432/surgical_ehr

# Apply migration
npx prisma migrate deploy
```

---

## Verification Steps

### 1. Verify Migration Applied

```bash
# Check migration status
docker-compose exec backend npx prisma migrate status

# Should show: "Database schema is up to date"
```

### 2. Verify New Enums Created

```bash
# Connect to database
docker-compose exec postgres psql -U ehr_user -d surgical_ehr

# Check enums
\dtT+ ConsultationOutcome
\dtT+ ProcedurePlanType
\dtT+ ProcedurePlanStatus
\dtT+ FollowUpPlanStatus

# Exit
\q
```

### 3. Verify New Columns Added

```bash
# Connect to database
docker-compose exec postgres psql -U ehr_user -d surgical_ehr

# Check consultations table
\d consultations
# Should show: consultationOutcome column

# Check procedure_plans table
\d procedure_plans
# Should show: planType, sessionCount, currentSession, sessionIntervalDays, etc.

# Check follow_up_plans table exists
\d follow_up_plans

# Exit
\q
```

### 4. Verify Prisma Client Generated

```bash
# Generate client (if not auto-generated)
docker-compose exec backend npx prisma generate

# Verify types are available
docker-compose exec backend node -e "const { ConsultationOutcome, ProcedurePlanType, FollowUpPlan } = require('@prisma/client'); console.log('Types loaded:', { ConsultationOutcome, ProcedurePlanType, FollowUpPlan });"
```

---

## Migration Rollback (If Needed)

If you need to rollback the migration:

```bash
# Connect to database
docker-compose exec postgres psql -U ehr_user -d surgical_ehr

# Manually rollback (CAUTION: Only if migration just applied)
-- Drop follow_up_plans table
DROP TABLE IF EXISTS follow_up_plans CASCADE;

-- Remove columns from procedure_plans
ALTER TABLE procedure_plans DROP COLUMN IF EXISTS planType;
ALTER TABLE procedure_plans DROP COLUMN IF EXISTS sessionCount;
ALTER TABLE procedure_plans DROP COLUMN IF EXISTS currentSession;
ALTER TABLE procedure_plans DROP COLUMN IF EXISTS sessionIntervalDays;
ALTER TABLE procedure_plans DROP COLUMN IF EXISTS sessionDetails;
ALTER TABLE procedure_plans DROP COLUMN IF EXISTS followUpRequired;
ALTER TABLE procedure_plans DROP COLUMN IF EXISTS followUpIntervalDays;
ALTER TABLE procedure_plans DROP COLUMN IF EXISTS followUpConsultationId;

-- Remove column from consultations
ALTER TABLE consultations DROP COLUMN IF EXISTS consultationOutcome;

-- Drop enums
DROP TYPE IF EXISTS "FollowUpPlanStatus";
DROP TYPE IF EXISTS "ProcedurePlanStatus";
DROP TYPE IF EXISTS "ProcedurePlanType";
DROP TYPE IF EXISTS "ConsultationOutcome";

-- Remove migration record
DELETE FROM "_prisma_migrations" WHERE migration_name = '20260113104250_aesthetic_surgery_workflows_phase1';
```

**Note**: Rollback should only be done if the migration was just applied and no data depends on it.

---

## Troubleshooting

### Issue: Migration Fails with "Relation Already Exists"

**Solution**: The migration may have been partially applied. Check migration status:

```bash
docker-compose exec backend npx prisma migrate status
```

If migration shows as applied but schema is incomplete, you may need to manually fix the database state.

### Issue: Prisma Client Not Updated

**Solution**: Regenerate Prisma client:

```bash
docker-compose exec backend npx prisma generate
```

### Issue: Connection Refused

**Solution**: Ensure database container is running and healthy:

```bash
docker-compose ps
docker-compose logs postgres
```

### Issue: Migration File is Empty

**Solution**: This should not happen if schema is valid. Verify:

```bash
cd backend
npx prisma validate
npx prisma format
```

Then recreate migration:

```bash
rm -rf prisma/migrations/20260113104250_aesthetic_surgery_workflows_phase1
npx prisma migrate dev --name aesthetic_surgery_workflows_phase1 --create-only
```

---

## Post-Migration Checklist

After migration is applied:

- [ ] Migration status shows "up to date"
- [ ] All enums created in database
- [ ] All columns added to tables
- [ ] FollowUpPlan table created
- [ ] All indexes created
- [ ] All foreign keys created
- [ ] Prisma client generated with new types
- [ ] Backend can start without errors
- [ ] Existing data intact (no data loss)

---

## Next Steps

Once migration is successfully applied:

1. **Verify Backend Starts**: Restart backend container and check logs
2. **Test Queries**: Verify you can query by new fields
3. **Begin Phase 2**: Start implementing backend service layer

---

**Migration Guide Version**: 1.0  
**Date**: 2026-01-13
