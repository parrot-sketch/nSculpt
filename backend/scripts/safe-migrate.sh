#!/bin/bash
set -e

# ============================================================================
# Safe Migration Script
# 
# This script ensures migrations are run against the correct database
# and prevents accidental schema mismatches.
# 
# Usage:
#   ./scripts/safe-migrate.sh [migration-name]
# 
# Environment Variables Required:
#   - DATABASE_URL: Full PostgreSQL connection string
#   - POSTGRES_DB: Database name (for validation)
#   - POSTGRES_HOST: Database host (for validation)
# ============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

# ============================================================================
# STEP 1: Validate Environment Variables
# ============================================================================

print_info "Validating environment configuration..."

if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL environment variable is not set"
    print_info "Please set DATABASE_URL before running migrations"
    exit 1
fi

if [ -z "$POSTGRES_DB" ]; then
    print_warning "POSTGRES_DB not set, using default: surgical_ehr"
    POSTGRES_DB=${POSTGRES_DB:-surgical_ehr}
fi

if [ -z "$POSTGRES_HOST" ]; then
    print_warning "POSTGRES_HOST not set, using default: postgres"
    POSTGRES_HOST=${POSTGRES_HOST:-postgres}
fi

# Extract database name from DATABASE_URL for validation
# Format: postgresql://user:pass@host:port/dbname?schema=public
DB_NAME_FROM_URL=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

if [ -z "$DB_NAME_FROM_URL" ]; then
    print_error "Could not extract database name from DATABASE_URL"
    exit 1
fi

print_success "Environment variables validated"
print_info "  Database URL: postgresql://***@${POSTGRES_HOST}/***"
print_info "  Database Name (from URL): $DB_NAME_FROM_URL"
print_info "  Database Name (expected): $POSTGRES_DB"

# ============================================================================
# STEP 2: Validate Database Name Match
# ============================================================================

if [ "$DB_NAME_FROM_URL" != "$POSTGRES_DB" ]; then
    print_error "Database name mismatch!"
    print_error "  DATABASE_URL points to: $DB_NAME_FROM_URL"
    print_error "  POSTGRES_DB expects: $POSTGRES_DB"
    print_warning "This could cause migrations to run against the wrong database"
    read -p "Continue anyway? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        print_info "Migration cancelled"
        exit 1
    fi
else
    print_success "Database name matches: $POSTGRES_DB"
fi

# ============================================================================
# STEP 3: Check if running in Docker
# ============================================================================

if [ -f "/.dockerenv" ]; then
    print_info "Running inside Docker container"
    IS_DOCKER=true
else
    print_info "Running on host machine"
    IS_DOCKER=false
fi

# ============================================================================
# STEP 4: Validate Database Connection
# ============================================================================

print_info "Testing database connection..."

# Try to connect to database
if command -v psql >/dev/null 2>&1; then
    # Extract connection details from DATABASE_URL
    DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    DB_PASS=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    
    # URL decode password if needed
    DB_PASS_DECODED=$(printf '%b\n' "${DB_PASS//%/\\x}")
    
    if PGPASSWORD="$DB_PASS_DECODED" psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME_FROM_URL" -c "SELECT 1" >/dev/null 2>&1; then
        print_success "Database connection successful"
    else
        print_error "Cannot connect to database"
        print_error "  Host: $DB_HOST"
        print_error "  Port: ${DB_PORT:-5432}"
        print_error "  Database: $DB_NAME_FROM_URL"
        print_error "  User: $DB_USER"
        exit 1
    fi
else
    print_warning "psql not available, skipping connection test"
    print_info "Will rely on Prisma connection validation"
fi

# ============================================================================
# STEP 5: Check Prisma Schema Status
# ============================================================================

print_info "Checking Prisma schema status..."

if [ ! -f "prisma/schema.prisma" ]; then
    print_error "prisma/schema.prisma not found"
    print_info "Please ensure you're in the backend directory"
    exit 1
fi

# Check if schema needs merging
if [ -d "prisma/schema" ] && [ "$(ls -A prisma/schema/*.prisma 2>/dev/null)" ]; then
    print_info "Found modular schema files, merging required"
    MERGE_NEEDED=true
else
    print_info "Using single schema.prisma file"
    MERGE_NEEDED=false
fi

# ============================================================================
# STEP 6: Merge Schema (if needed)
# ============================================================================

if [ "$MERGE_NEEDED" = true ]; then
    print_info "Merging schema files..."
    if npm run schema:merge; then
        print_success "Schema merged successfully"
    else
        print_error "Schema merge failed"
        exit 1
    fi
fi

# ============================================================================
# STEP 7: Validate Schema
# ============================================================================

print_info "Validating Prisma schema..."

if npx prisma validate; then
    print_success "Schema validation passed"
else
    print_error "Schema validation failed"
    print_info "Please fix schema errors before running migrations"
    exit 1
fi

# ============================================================================
# STEP 8: Check Migration Status
# ============================================================================

print_info "Checking migration status..."

# Get list of applied migrations
APPLIED_MIGRATIONS=$(npx prisma migrate status --schema=prisma/schema.prisma 2>&1 || echo "")

if echo "$APPLIED_MIGRATIONS" | grep -q "Database schema is up to date"; then
    print_success "Database schema is up to date"
elif echo "$APPLIED_MIGRATIONS" | grep -q "following migration"; then
    print_warning "Pending migrations detected"
    echo "$APPLIED_MIGRATIONS"
else
    print_info "Migration status check completed"
fi

# ============================================================================
# STEP 9: Confirm Migration
# ============================================================================

MIGRATION_NAME=${1:-"auto_$(date +%Y%m%d%H%M%S)"}

print_warning "About to run migration: $MIGRATION_NAME"
print_warning "Target Database: $DB_NAME_FROM_URL"
print_warning "Target Host: ${DB_HOST:-$POSTGRES_HOST}"

if [ "$IS_DOCKER" = false ]; then
    print_warning "Running on HOST machine - ensure DATABASE_URL points to correct database"
fi

read -p "Continue with migration? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    print_info "Migration cancelled"
    exit 0
fi

# ============================================================================
# STEP 10: Run Migration
# ============================================================================

print_info "Running Prisma migration..."

# Check if there are pending migrations to apply first
print_info "Checking for pending migrations..."
PENDING_MIGRATIONS=$(npx prisma migrate status --schema=prisma/schema.prisma 2>&1 | grep -c "not yet been applied" || echo "0")

if [ "$PENDING_MIGRATIONS" -gt 0 ]; then
    print_warning "Found pending migrations. Applying them first..."
    if npx prisma migrate deploy --schema=prisma/schema.prisma; then
        print_success "Pending migrations applied"
    else
        print_error "Failed to apply pending migrations"
        print_info "You may need to fix migration issues before creating new ones"
        exit 1
    fi
fi

# Now create new migration if name provided
if [ -n "$1" ]; then
    print_info "Creating new migration: $MIGRATION_NAME"
    # Use migrate dev for development (creates new migration)
    if npx prisma migrate dev --name "$MIGRATION_NAME" --schema=prisma/schema.prisma --skip-seed; then
        print_success "Migration '$MIGRATION_NAME' completed successfully"
    else
        print_error "Migration failed"
        print_info "If shadow database error occurs:"
        print_info "  1. Ensure all previous migrations are applied: npx prisma migrate deploy"
        print_info "  2. Or set SHADOW_DATABASE_URL to a separate database for validation"
        print_info "  3. Or use 'migrate deploy' for production (doesn't create new migrations)"
        exit 1
    fi
else
    # No migration name - just apply pending migrations
    print_info "Applying pending migrations (no new migration created)..."
    if npx prisma migrate deploy --schema=prisma/schema.prisma; then
        print_success "Migrations applied successfully"
    else
        print_error "Migration deployment failed"
        exit 1
    fi
fi

# ============================================================================
# STEP 11: Generate Prisma Client
# ============================================================================

print_info "Generating Prisma Client..."

if npm run schema:generate; then
    print_success "Prisma Client generated successfully"
else
    print_error "Prisma Client generation failed"
    print_warning "Application may not work correctly without regenerated client"
    exit 1
fi

# ============================================================================
# STEP 12: Verify Migration
# ============================================================================

print_info "Verifying migration status..."

if npx prisma migrate status --schema=prisma/schema.prisma | grep -q "Database schema is up to date"; then
    print_success "Migration verified - database is up to date"
else
    print_warning "Migration status check shows pending changes"
    print_info "This may be normal if you're using migrate dev"
fi

print_success "Migration process completed successfully!"
print_info "Next steps:"
print_info "  1. Test your application"
print_info "  2. Commit migration files to version control"
print_info "  3. Update application code if schema changed"

