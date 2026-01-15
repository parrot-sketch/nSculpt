# Docker Migration Workflow (Local Development)

## Quick Start

Since you're **always working in Docker locally**, use these commands:

### Check Database Status
```bash
docker-compose exec backend npm run db:check
```

### Apply Pending Migrations
```bash
docker-compose exec backend npx prisma migrate deploy
```

### Create New Migration
```bash
docker-compose exec backend npm run db:migrate:safe my_migration_name
```

### Generate Prisma Client Only
```bash
docker-compose exec backend npm run db:generate:safe
```

### Fix Shadow Database Issues
```bash
docker-compose exec backend npm run db:fix-shadow
```

---

## Understanding Shadow Database Errors

### What is a Shadow Database?

When you run `prisma migrate dev`, Prisma creates a **temporary test database** (shadow database) to:
- Validate your migrations work correctly
- Detect differences between schema and database
- Generate new migration SQL safely

### Why You're Getting Errors

**Error:**
```
Migration failed to apply cleanly to the shadow database.
The underlying table for model `surgical_cases` does not exist.
```

**Cause:**
- Your migration references `surgical_cases` table
- Shadow database is empty (created fresh each time)
- `surgical_cases` table doesn't exist in shadow DB yet
- Migration fails because it can't add foreign key to non-existent table

**Solution:**
Apply all pending migrations to your real database first, then create new migrations.

---

## Complete Workflow

### 1. Make Schema Changes

Edit files in `prisma/schema/*.prisma`:
```bash
# Example: Edit patient schema
vim backend/prisma/schema/patient.prisma
```

### 2. Merge Schema

```bash
docker-compose exec backend npm run schema:merge
```

### 3. Check Migration Status

```bash
docker-compose exec backend npx prisma migrate status
```

**If you see "not yet been applied":**
```bash
# Apply pending migrations first
docker-compose exec backend npx prisma migrate deploy
```

### 4. Create New Migration

```bash
docker-compose exec backend npm run db:migrate:safe add_new_feature
```

This will:
- ✅ Check for pending migrations
- ✅ Apply them first (if any)
- ✅ Create new migration
- ✅ Apply it to database
- ✅ Generate Prisma Client

### 5. Verify

```bash
# Check status
docker-compose exec backend npx prisma migrate status

# Should show: "Database schema is up to date"
```

---

## Troubleshooting

### Shadow Database Error

**Error:**
```
Migration failed to apply cleanly to the shadow database
```

**Fix:**
```bash
# Option 1: Apply pending migrations first
docker-compose exec backend npx prisma migrate deploy

# Option 2: Use fix script
docker-compose exec backend npm run db:fix-shadow

# Option 3: Check what's pending
docker-compose exec backend npx prisma migrate status
```

### Migration Order Issues

If migrations reference tables that don't exist:

1. **Check migration order:**
   ```bash
   ls -la backend/prisma/migrations/
   ```

2. **Verify table exists:**
   ```bash
   docker-compose exec backend npx prisma db execute --stdin <<< "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'surgical_cases';"
   ```

3. **Apply all migrations:**
   ```bash
   docker-compose exec backend npx prisma migrate deploy
   ```

### Schema Out of Sync

**Error:**
```
Schema is out of sync with database
```

**Fix:**
```bash
# 1. Check what's different
docker-compose exec backend npx prisma migrate status

# 2. Apply pending migrations
docker-compose exec backend npx prisma migrate deploy

# 3. Or reset (⚠️ destroys data)
docker-compose exec backend npx prisma migrate reset
```

---

## Common Commands Reference

| Task | Command |
|------|---------|
| Check connection | `docker-compose exec backend npm run db:check` |
| Check migration status | `docker-compose exec backend npx prisma migrate status` |
| Apply pending migrations | `docker-compose exec backend npx prisma migrate deploy` |
| Create new migration | `docker-compose exec backend npm run db:migrate:safe name` |
| Generate Prisma Client | `docker-compose exec backend npm run db:generate:safe` |
| Fix shadow DB issues | `docker-compose exec backend npm run db:fix-shadow` |
| View database | `docker-compose exec backend npx prisma studio` |

---

## Best Practices

1. **Always check status first:**
   ```bash
   docker-compose exec backend npx prisma migrate status
   ```

2. **Apply pending migrations before creating new ones:**
   ```bash
   docker-compose exec backend npx prisma migrate deploy
   ```

3. **Use safe migration scripts:**
   ```bash
   docker-compose exec backend npm run db:migrate:safe
   ```
   (They handle pending migrations automatically)

4. **Verify after migration:**
   ```bash
   docker-compose exec backend npx prisma migrate status
   ```

5. **Test your application:**
   ```bash
   docker-compose restart backend
   ```

---

## What the Scripts Do

### `db:migrate:safe`
1. ✅ Validates Docker environment
2. ✅ Tests database connection
3. ✅ Merges schema files
4. ✅ Validates schema syntax
5. ✅ **Checks for pending migrations**
6. ✅ **Applies pending migrations first** (prevents shadow DB errors)
7. ✅ Creates new migration
8. ✅ Generates Prisma Client

### `db:generate:safe`
1. ✅ Merges schema files
2. ✅ Validates schema syntax
3. ✅ Generates Prisma Client
4. ✅ Does NOT run migrations

### `db:fix-shadow`
1. ✅ Checks migration status
2. ✅ Applies pending migrations
3. ✅ Verifies schema is in sync

---

## Summary

**For Docker-only development:**

1. Always apply pending migrations first
2. Use `npm run db:migrate:safe` for new migrations
3. Use `npm run db:fix-shadow` if shadow DB errors occur
4. Check status regularly with `npx prisma migrate status`

**Shadow database errors = pending migrations need to be applied first**






