# Database Configuration Validation

This document describes the validation mechanisms in place to prevent database configuration mismatches.

## Problem

Previously, configuration mismatches between `.env` file and actual database could cause:
- Authentication failures
- Connection to wrong database
- Silent failures that were hard to debug

## Solution

Multiple layers of validation have been implemented:

### 1. Docker Entrypoint Validation

**Location**: `backend/docker-entrypoint.sh`

**What it does**:
- Validates database connection before starting the application
- Checks if database exists, creates it if missing
- Verifies database name matches `POSTGRES_DB` environment variable
- Fails fast with clear error messages

**When it runs**: Every time the backend container starts

### 2. Node.js Database Validation Script

**Location**: `backend/scripts/validate-db-connection.js`

**What it does**:
- Validates DATABASE_URL is correctly formatted
- Verifies database name matches expected value
- Tests actual database connection
- Checks for Prisma migrations table

**Usage**:
```bash
# From backend directory
npm run db:validate

# Or directly
node scripts/validate-db-connection.js
```

### 3. Enhanced Health Check Endpoint

**Location**: `backend/src/health/health.controller.ts`

**What it does**:
- `/api/v1/health` - Basic health check with database status
- `/api/v1/health/ready` - Readiness check that validates database name

**Usage**:
```bash
curl http://localhost:3002/api/v1/health
curl http://localhost:3002/api/v1/health/ready
```

### 4. Application Startup Validation

**Location**: `backend/src/main.ts`

**What it does**:
- Validates database connection before NestJS app starts
- Verifies database name matches `POSTGRES_DB`
- Exits with clear error message if validation fails

**When it runs**: Every time the application starts

### 5. Environment File Validation Script

**Location**: `scripts/validate-env.sh`

**What it does**:
- Validates `.env` file configuration
- Checks for common mistakes (e.g., POSTGRES_DB = POSTGRES_PASSWORD)
- Warns about suspicious values
- Creates template `.env` if missing

**Usage**:
```bash
# From project root
./scripts/validate-env.sh

# Or via npm
cd backend && npm run validate:env
```

## Validation Flow

```
Container Start
    ↓
docker-entrypoint.sh
    ↓
1. Wait for PostgreSQL
    ↓
2. Check if database exists (create if missing)
    ↓
3. Run Node.js validation script
    ↓
   ├─ Extract database name from DATABASE_URL
   ├─ Compare with POSTGRES_DB
   ├─ Test connection
   └─ Verify migrations table
    ↓
4. Start NestJS application
    ↓
5. main.ts validates again
    ↓
6. Application ready
```

## Error Messages

### Database Name Mismatch
```
❌ CRITICAL ERROR: Database name mismatch!
   Expected: surgical_ehr
   Actual: 1xetra*onmi
   This will cause authentication failures.
   
   Fix: Update POSTGRES_DB in .env file to match the actual database name.
```

### Database Doesn't Exist
```
❌ ERROR: Database "surgical_ehr" does not exist.
   Create it or update POSTGRES_DB in .env file.
```

### Authentication Failed
```
❌ Database connection failed!
   Error: authentication failed for user "ehr_user"
   
   This usually means:
   1. Wrong password in DATABASE_URL
   2. Wrong database name in DATABASE_URL
   3. User doesn't have access to the database
```

## Best Practices

1. **Always validate before deployment**:
   ```bash
   ./scripts/validate-env.sh
   cd backend && npm run db:validate
   ```

2. **Check health endpoints**:
   ```bash
   curl http://localhost:3002/api/v1/health/ready
   ```

3. **Monitor logs**:
   ```bash
   docker logs ehr-backend | grep -i "database\|validation\|error"
   ```

4. **Keep .env in sync**:
   - Use the same `POSTGRES_DB` value in `.env` and docker-compose.yml
   - Don't use password as database name
   - Use descriptive database names (e.g., `surgical_ehr`, not `1xetra*onmi`)

## Configuration Files

### .env (Root)
```env
POSTGRES_USER=ehr_user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=surgical_ehr  # ← Must match actual database name
POSTGRES_PORT=5432
```

### docker-compose.yml
```yaml
backend:
  environment:
    POSTGRES_DB: ${POSTGRES_DB:-surgical_ehr}  # ← Uses .env value
    # DATABASE_URL is constructed by docker-entrypoint.sh
```

## Troubleshooting

### Issue: "Database name mismatch"
**Solution**: Update `POSTGRES_DB` in `.env` to match the actual database name

### Issue: "Database does not exist"
**Solution**: 
1. Check if database exists: `docker exec ehr-postgres psql -U ehr_user -l`
2. Create it: `docker exec ehr-postgres psql -U ehr_user -d postgres -c "CREATE DATABASE surgical_ehr;"`
3. Or update `POSTGRES_DB` in `.env` to match existing database

### Issue: "Authentication failed"
**Solution**:
1. Verify password in `.env` matches postgres container
2. Check `POSTGRES_PASSWORD` in docker-compose.yml
3. Ensure password is URL-encoded in DATABASE_URL (special chars like `*` become `%2A`)

## Testing Validation

To test that validation works:

1. **Test database name mismatch**:
   ```bash
   # Temporarily change POSTGRES_DB in .env
   POSTGRES_DB=wrong_db_name
   docker-compose restart backend
   # Should fail with clear error message
   ```

2. **Test missing database**:
   ```bash
   # Drop database (careful!)
   docker exec ehr-postgres psql -U ehr_user -d postgres -c "DROP DATABASE surgical_ehr;"
   docker-compose restart backend
   # Should create database automatically or fail with clear message
   ```

## Summary

These validation layers ensure that:
- ✅ Database configuration is validated before app starts
- ✅ Clear error messages guide you to the fix
- ✅ Common mistakes are caught early
- ✅ Health checks verify ongoing connectivity
- ✅ Configuration mismatches are impossible to miss







