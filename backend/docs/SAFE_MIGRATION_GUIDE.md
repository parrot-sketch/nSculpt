# Safe Migration and Schema Management Guide

## ⚠️ Critical: Database Safety

**NEVER run migrations without validating:**
1. ✅ Correct `DATABASE_URL` is set
2. ✅ Database name matches expected
3. ✅ You're connected to the right database (dev/staging/prod)
4. ✅ Schema is valid before migration
5. ✅ Prisma Client is regenerated after migration

---

## 🐳 Docker Environment Setup

### Current Configuration

The Docker setup uses:
- **Database Service**: `postgres` (container name: `ehr-postgres`)
- **Database Name**: `surgical_ehr` (configurable via `POSTGRES_DB`)
- **Database User**: `ehr_user` (configurable via `POSTGRES_USER`)
- **Network**: `ehr-network` (bridge network)

### Environment Variables

The `docker-entrypoint.sh` script:
1. ✅ Constructs `DATABASE_URL` with proper URL encoding
2. ✅ Validates database connection
3. ✅ Creates database if it doesn't exist
4. ✅ Generates Prisma Client on container startup

**Key Variables:**
```bash
POSTGRES_USER=ehr_user
POSTGRES_PASSWORD=1xetra*onmi  # URL-encoded as %2A in DATABASE_URL
POSTGRES_DB=surgical_ehr
POSTGRES_HOST=postgres  # Service name in Docker network
POSTGRES_PORT=5432
DATABASE_URL=postgresql://ehr_user:1xetra%2Aonmi@postgres:5432/surgical_ehr?schema=public
```

---

## 📋 Safe Migration Workflows

### Option 1: Using Safe Migration Script (Recommended)

#### From Host Machine:
```bash
# Ensure you're in the backend directory
cd backend

# Set environment variables (if not using .env)
export DATABASE_URL="postgresql://ehr_user:1xetra%2Aonmi@localhost:5432/surgical_ehr?schema=public"
export POSTGRES_DB="surgical_ehr"
export POSTGRES_HOST="localhost"

# Run safe migration
./scripts/safe-migrate.sh my_migration_name
```

#### Inside Docker Container:
```bash
# From host
docker-compose exec backend ./scripts/docker-migrate.sh my_migration_name

# Or inside container
./scripts/docker-migrate.sh my_migration_name
```

### Option 2: Manual Migration (Advanced)

#### Step-by-Step Process:

1. **Validate Environment**
   ```bash
   ./scripts/check-db-connection.sh
   ```

2. **Merge Schema** (if using modular schema)
   ```bash
   npm run schema:merge
   ```

3. **Validate Schema**
   ```bash
   npx prisma validate
   ```

4. **Check Current Migration Status**
   ```bash
   npx prisma migrate status
   ```

5. **Create Migration** (development)
   ```bash
   npx prisma migrate dev --name descriptive_migration_name
   ```

6. **Apply Migration** (production - no prompt)
   ```bash
   npx prisma migrate deploy
   ```

7. **Generate Prisma Client**
   ```bash
   npm run schema:generate
   ```

---

## 🔒 Safety Checks

### Before Running Migrations:

1. **Check DATABASE_URL**
   ```bash
   echo $DATABASE_URL
   # Verify it points to the correct database
   ```

2. **Verify Database Name**
   ```bash
   # Extract database name from URL
   echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p'
   # Should match POSTGRES_DB
   ```

3. **Test Connection**
   ```bash
   ./scripts/check-db-connection.sh
   ```

4. **Check Migration Status**
   ```bash
   npx prisma migrate status
   ```

### Database Name Validation

The safe migration scripts validate that:
- `DATABASE_URL` database name matches `POSTGRES_DB`
- Connection is successful before proceeding
- Schema is valid before migration

---

## 🚨 Common Pitfalls to Avoid

### ❌ DON'T:

1. **Don't run migrations without checking DATABASE_URL**
   ```bash
   # BAD: Could migrate wrong database
   npx prisma migrate dev
   ```

2. **Don't use `migrate dev` in production**
   ```bash
   # BAD: Creates new migration files
   npx prisma migrate dev  # ❌ Production
   
   # GOOD: Applies existing migrations
   npx prisma migrate deploy  # ✅ Production
   ```

3. **Don't skip Prisma Client regeneration**
   ```bash
   # BAD: Types won't match schema
   npx prisma migrate dev
   # Missing: npm run schema:generate
   ```

4. **Don't run migrations on host if DATABASE_URL points to Docker**
   ```bash
   # BAD: Host machine may not have correct DATABASE_URL
   # Use docker-compose exec instead
   ```

### ✅ DO:

1. **Always validate before migrating**
   ```bash
   ./scripts/check-db-connection.sh
   ```

2. **Use safe migration scripts**
   ```bash
   ./scripts/safe-migrate.sh migration_name
   ```

3. **Regenerate Prisma Client after schema changes**
   ```bash
   npm run schema:generate
   ```

4. **Run migrations inside Docker container**
   ```bash
   docker-compose exec backend ./scripts/docker-migrate.sh
   ```

---

## 🔧 Prisma Client Generation (No Migration)

### Safe Generation Script:

```bash
# From host
./scripts/safe-generate.sh

# Inside Docker
docker-compose exec backend ./scripts/docker-generate.sh
```

This script:
- ✅ Merges schema files
- ✅ Validates schema syntax
- ✅ Generates Prisma Client
- ✅ Verifies generation
- ✅ Does NOT run migrations

---

## 📊 Migration Status Commands

### Check Migration Status:
```bash
# Inside Docker
docker-compose exec backend npx prisma migrate status

# From host (if DATABASE_URL points to Docker)
npx prisma migrate status
```

### View Applied Migrations:
```bash
docker-compose exec backend npx prisma migrate status
```

### List Migration Files:
```bash
ls -la backend/prisma/migrations/
```

---

## 🎯 Recommended Workflow

### Development (Local Docker):

1. **Make schema changes** in `prisma/schema/*.prisma` files

2. **Run safe migration**:
   ```bash
   docker-compose exec backend ./scripts/docker-migrate.sh descriptive_name
   ```

3. **Verify migration**:
   ```bash
   docker-compose exec backend npx prisma migrate status
   ```

4. **Test application**:
   ```bash
   # Restart backend to pick up new Prisma Client
   docker-compose restart backend
   ```

### Production:

1. **Review migration files** in version control

2. **Apply migrations** (no new files created):
   ```bash
   docker-compose exec backend npx prisma migrate deploy
   ```

3. **Generate Prisma Client**:
   ```bash
   docker-compose exec backend npm run schema:generate
   ```

4. **Restart application**:
   ```bash
   docker-compose restart backend
   ```

---

## 🔍 Troubleshooting

### Issue: "Database schema is out of sync"

**Solution:**
```bash
# Check migration status
docker-compose exec backend npx prisma migrate status

# If migrations are pending, apply them
docker-compose exec backend npx prisma migrate deploy
```

### Issue: "Prisma Client types don't match schema"

**Solution:**
```bash
# Regenerate Prisma Client
docker-compose exec backend npm run schema:generate

# Restart backend
docker-compose restart backend
```

### Issue: "Cannot connect to database"

**Check:**
1. Is postgres service running?
   ```bash
   docker-compose ps postgres
   ```

2. Is DATABASE_URL correct?
   ```bash
   docker-compose exec backend echo $DATABASE_URL
   ```

3. Test connection:
   ```bash
   docker-compose exec backend ./scripts/check-db-connection.sh
   ```

### Issue: "Migration runs against wrong database"

**Prevention:**
- Always use safe migration scripts
- They validate database name before proceeding
- Check DATABASE_URL before running

---

## 📝 Script Reference

### Available Scripts:

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `safe-migrate.sh` | Safe migration with validation | Host machine migrations |
| `docker-migrate.sh` | Safe migration in Docker | Container migrations |
| `safe-generate.sh` | Generate Prisma Client only | After schema changes, no migration |
| `docker-generate.sh` | Generate in Docker | Container Prisma generation |
| `check-db-connection.sh` | Validate connection | Before any operation |

### NPM Scripts:

| Command | Purpose |
|---------|---------|
| `npm run schema:merge` | Merge modular schema files |
| `npm run schema:generate` | Merge + Generate Prisma Client |
| `npm run schema:migrate` | Merge + Create migration (dev) |
| `npm run db:migrate` | Apply migrations (production) |
| `npm run db:seed` | Seed database |
| `npm run db:validate` | Validate database connection |

---

## ✅ Pre-Migration Checklist

Before running any migration:

- [ ] Verified `DATABASE_URL` points to correct database
- [ ] Checked database name matches `POSTGRES_DB`
- [ ] Tested database connection
- [ ] Validated Prisma schema syntax
- [ ] Checked current migration status
- [ ] Backed up database (production)
- [ ] Reviewed migration SQL (if applicable)
- [ ] Ensured no other processes are using database

---

## 🎓 Best Practices

1. **Always use safe migration scripts** - They include validation
2. **Run migrations inside Docker** - Ensures correct environment
3. **Validate before migrating** - Check connection and schema
4. **Regenerate Prisma Client** - After every schema change
5. **Test after migration** - Verify application works
6. **Commit migration files** - Version control all migrations
7. **Review migration SQL** - Understand what changes
8. **Backup production** - Before any production migration

---

## 📚 Additional Resources

- [Prisma Migrate Guide](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)

---

**Remember**: When in doubt, use the safe migration scripts. They include all necessary validations to prevent database mishaps.






