#!/bin/bash
set -e

# ============================================================================
# Docker Migration Script
# 
# Safely run migrations inside Docker container.
# This script ensures we're using the correct database from environment.
# 
# Usage (from host):
#   docker-compose exec backend ./scripts/docker-migrate.sh [migration-name]
# 
# Or inside container:
#   ./scripts/docker-migrate.sh [migration-name]
# ============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
# STEP 1: Validate We're in Docker
# ============================================================================

if [ ! -f "/.dockerenv" ]; then
    print_warning "Not running inside Docker container"
    print_info "This script is designed for Docker. For host machine, use: ./scripts/safe-migrate.sh"
    read -p "Continue anyway? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        exit 1
    fi
fi

# ============================================================================
# STEP 2: Validate Environment
# ============================================================================

print_info "Validating Docker environment..."

if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL not set in container"
    print_error "This should be set by docker-entrypoint.sh"
    exit 1
fi

# Extract database info (for display)
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')

print_success "Environment validated"
print_info "  Database: $DB_NAME"
print_info "  Host: $DB_HOST"

# Validate database name matches expected
if [ -n "$POSTGRES_DB" ] && [ "$DB_NAME" != "$POSTGRES_DB" ]; then
    print_error "Database name mismatch!"
    print_error "  DATABASE_URL: $DB_NAME"
    print_error "  POSTGRES_DB: $POSTGRES_DB"
    exit 1
fi

# ============================================================================
# STEP 3: Check Database Connection
# ============================================================================

print_info "Testing database connection..."

if node scripts/validate-db-connection.js 2>/dev/null; then
    print_success "Database connection successful"
else
    print_error "Cannot connect to database"
    print_error "Check DATABASE_URL and ensure postgres service is running"
    exit 1
fi

# ============================================================================
# STEP 4: Merge Schema
# ============================================================================

print_info "Merging Prisma schema files..."

if npm run schema:merge; then
    print_success "Schema merged"
else
    print_error "Schema merge failed"
    exit 1
fi

# ============================================================================
# STEP 5: Validate Schema
# ============================================================================

print_info "Validating Prisma schema..."

if npx prisma validate --schema=prisma/schema.prisma; then
    print_success "Schema valid"
else
    print_error "Schema validation failed"
    exit 1
fi

# ============================================================================
# STEP 6: Run Migration
# ============================================================================

MIGRATION_NAME=${1:-"auto_$(date +%Y%m%d%H%M%S)"}

print_info "Running migration: $MIGRATION_NAME"
print_warning "Target: $DB_NAME on $DB_HOST"

# Check if there are pending migrations to apply first
print_info "Checking for pending migrations..."
MIGRATION_STATUS=$(npx prisma migrate status --schema=prisma/schema.prisma 2>&1 || echo "error")

if echo "$MIGRATION_STATUS" | grep -q "not yet been applied"; then
    print_warning "Found pending migrations. Applying them first to avoid shadow database issues..."
    if npx prisma migrate deploy --schema=prisma/schema.prisma; then
        print_success "Pending migrations applied"
    else
        print_error "Failed to apply pending migrations"
        print_info "You may need to fix migration issues before creating new ones"
        print_info "Run: ./scripts/fix-shadow-db.sh to diagnose"
        exit 1
    fi
elif echo "$MIGRATION_STATUS" | grep -q "Database schema is up to date"; then
    print_success "All migrations are applied"
else
    print_warning "Could not determine migration status (may be OK)"
fi

# Now create new migration if name provided
if [ -n "$1" ]; then
    print_info "Creating new migration: $MIGRATION_NAME"
    print_info "Note: Prisma will use a shadow database to validate this migration"
    
    # Try migrate dev first (uses shadow DB for validation)
    if npx prisma migrate dev --name "$MIGRATION_NAME" --schema=prisma/schema.prisma --skip-seed 2>&1 | tee /tmp/migrate_output.log; then
        print_success "Migration created and applied"
    else
        MIGRATE_ERROR=$(cat /tmp/migrate_output.log 2>/dev/null || echo "")
        
        if echo "$MIGRATE_ERROR" | grep -qi "shadow database"; then
            print_error "Shadow database validation failed"
            print_info ""
            print_info "This usually means:"
            print_info "  1. A migration references a table that doesn't exist yet"
            print_info "  2. Migration order is incorrect"
            print_info ""
            print_info "Solutions:"
            print_info "  1. Apply all pending migrations first: npx prisma migrate deploy"
            print_info "  2. Check migration order in prisma/migrations/"
            print_info "  3. Use: ./scripts/fix-shadow-db.sh to diagnose"
            print_info "  4. For development only: Use 'migrate deploy' instead (less safe)"
        else
            print_error "Migration failed for other reasons"
            echo "$MIGRATE_ERROR"
        fi
        exit 1
    fi
else
    # No migration name - just apply pending migrations
    print_info "Applying pending migrations (no new migration created)..."
    if npx prisma migrate deploy --schema=prisma/schema.prisma; then
        print_success "Migrations applied"
    else
        print_error "Migration deployment failed"
        exit 1
    fi
fi

# ============================================================================
# STEP 7: Generate Prisma Client
# ============================================================================

print_info "Generating Prisma Client..."

if npm run schema:generate; then
    print_success "Prisma Client generated"
else
    print_error "Prisma Client generation failed"
    exit 1
fi

print_success "Migration process completed!"

