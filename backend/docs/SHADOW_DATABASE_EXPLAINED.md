# Shadow Database Explained

## What is a Shadow Database?

A **shadow database** is a temporary database that Prisma creates when you run `prisma migrate dev`. It's used to validate your migrations before applying them to your real database.

### Why Does Prisma Use Shadow Databases?

When you run `prisma migrate dev`, Prisma needs to:

1. **Validate migrations** - Ensure all migrations can be applied cleanly
2. **Detect schema drift** - Find differences between your Prisma schema and actual database
3. **Test migration order** - Verify migrations work in sequence
4. **Generate migration SQL** - Create the SQL for new migrations

To do this safely, Prisma:
- Creates a temporary "shadow" database
- Applies all existing migrations to it
- Compares it with your Prisma schema
- Uses it to generate new migration SQL

### The Problem You're Experiencing

**Error:**
```
Migration `20260103131901_add_patient_module` failed to apply cleanly to the shadow database.
Error: The underlying table for model `surgical_cases` does not exist.
```

**What's happening:**
1. Your migration `20260103131901_add_patient_module` tries to add a foreign key:
   ```sql
   ALTER TABLE "surgical_cases" ADD CONSTRAINT "surgical_cases_patientId_fkey" 
   FOREIGN KEY ("patientId") REFERENCES "patients"("id")
   ```

2. Prisma creates an empty shadow database
3. It tries to apply migrations in order
4. But `surgical_cases` table doesn't exist yet in the shadow DB
5. The migration fails because it references a non-existent table

**Why this happens:**
- The `surgical_cases` table was created in a different migration
- That migration may not have been applied to the shadow database
- Or the migration order is incorrect

---

## Solutions for Docker-Only Development

Since you're always working in Docker locally, here are the best approaches:

### Solution 1: Apply Pending Migrations First (Recommended)

Before creating new migrations, apply any pending ones:

```bash
# Check status
docker-compose exec backend npx prisma migrate status

# Apply pending migrations
docker-compose exec backend npx prisma migrate deploy

# Then create new migration
docker-compose exec backend npx prisma migrate dev --name new_migration
```

**Why this works:**
- Ensures all migrations are applied to your real database
- Shadow database will have all tables when validating
- Most reliable approach

### Solution 2: Use a Separate Shadow Database

Configure Prisma to use a dedicated shadow database:

**In `docker-compose.yml` (add to backend service):**
```yaml
environment:
  SHADOW_DATABASE_URL: postgresql://ehr_user:password@postgres:5432/surgical_ehr_shadow?schema=public
```

**Create shadow database:**
```bash
docker-compose exec postgres psql -U ehr_user -d postgres -c "CREATE DATABASE surgical_ehr_shadow;"
```

**Benefits:**
- Shadow database persists between runs
- Faster validation (doesn't recreate each time)
- More reliable for complex migrations

### Solution 3: Skip Shadow Database (Development Only)

For development, you can skip shadow database validation:

```bash
# Use --skip-seed flag (also skips shadow DB in some cases)
docker-compose exec backend npx prisma migrate dev --name migration_name --skip-seed

# Or use migrate deploy (doesn't use shadow DB)
docker-compose exec backend npx prisma migrate deploy
```

**⚠️ Warning:** This is less safe - migrations aren't validated before applying.

### Solution 4: Fix Migration Order

If migrations are out of order, you may need to:
1. Check which migration creates `surgical_cases`
2. Ensure it runs before `20260103131901_add_patient_module`
3. Or modify the migration to check if table exists first

---

## Best Practice for Your Workflow

Since you're **always working in Docker locally**, here's the recommended workflow:

### Daily Development:

```bash
# 1. Check migration status
docker-compose exec backend npm run db:check

# 2. Apply any pending migrations first
docker-compose exec backend npx prisma migrate deploy

# 3. Make schema changes in prisma/schema/*.prisma files

# 4. Merge schema
docker-compose exec backend npm run schema:merge

# 5. Create new migration
docker-compose exec backend npm run db:migrate:safe new_feature_name

# 6. Generate Prisma Client
docker-compose exec backend npm run db:generate:safe
```

### When Shadow Database Error Occurs:

```bash
# Option 1: Apply pending migrations first
docker-compose exec backend npx prisma migrate deploy

# Option 2: Use the fix script
docker-compose exec backend ./scripts/fix-shadow-db.sh

# Option 3: Reset migrations (⚠️ destroys data)
docker-compose exec backend npx prisma migrate reset
```

---

## Understanding the Error Message

```
Error: P3006
Migration `20260103131901_add_patient_module` failed to apply cleanly to the shadow database.
Error code: P1014
Error: The underlying table for model `surgical_cases` does not exist.
```

**Breaking it down:**
- **P3006**: Prisma error code for shadow database validation failure
- **P1014**: Database error - table doesn't exist
- **Shadow database**: Temporary DB used for validation
- **Root cause**: Migration references table that doesn't exist in shadow DB

**This means:**
- Your real database might be fine
- But Prisma can't validate the migration
- Need to fix the migration or apply pending ones first

---

## Quick Reference

| Command | Uses Shadow DB? | When to Use |
|---------|----------------|-------------|
| `migrate dev` | ✅ Yes | Creating new migrations |
| `migrate deploy` | ❌ No | Applying existing migrations |
| `migrate status` | ❌ No | Checking migration status |
| `migrate reset` | ✅ Yes | Resetting database (destroys data) |

---

## Summary

**Shadow Database = Temporary test database** that Prisma uses to validate migrations.

**Your issue:** Migration references a table that doesn't exist in the shadow DB.

**Best fix for Docker:** Apply pending migrations first, then create new ones.

**Updated scripts:** The migration scripts now handle this automatically by checking for pending migrations first.






