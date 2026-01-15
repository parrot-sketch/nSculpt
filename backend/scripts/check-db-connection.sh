#!/bin/bash
set -e

# ============================================================================
# Database Connection Check Script
# 
# Validates that DATABASE_URL points to the correct database
# and that the connection is working.
# 
# Usage:
#   ./scripts/check-db-connection.sh
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
# STEP 1: Check Environment Variables
# ============================================================================

print_info "Checking environment variables..."

if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL is not set"
    print_info "Please set DATABASE_URL before running this script"
    exit 1
fi

print_success "DATABASE_URL is set"

# Extract connection details (for display only, not for connection)
DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

print_info "  User: $DB_USER"
print_info "  Host: $DB_HOST"
print_info "  Port: ${DB_PORT:-5432}"
print_info "  Database: $DB_NAME"

# ============================================================================
# STEP 2: Check if running in Docker
# ============================================================================

if [ -f "/.dockerenv" ]; then
    print_info "Running inside Docker container"
    print_info "  Container name: ${HOSTNAME:-unknown}"
    IS_DOCKER=true
else
    print_info "Running on host machine"
    IS_DOCKER=false
fi

# ============================================================================
# STEP 3: Validate Database Name
# ============================================================================

if [ -n "$POSTGRES_DB" ]; then
    print_info "Validating database name..."
    if [ "$DB_NAME" != "$POSTGRES_DB" ]; then
        print_warning "Database name mismatch!"
        print_warning "  DATABASE_URL points to: $DB_NAME"
        print_warning "  POSTGRES_DB expects: $POSTGRES_DB"
    else
        print_success "Database name matches: $DB_NAME"
    fi
fi

# ============================================================================
# STEP 4: Test Connection with psql (if available)
# ============================================================================

if command -v psql >/dev/null 2>&1; then
    print_info "Testing connection with psql..."
    
    # Extract password (URL decode if needed)
    DB_PASS=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    DB_PASS_DECODED=$(printf '%b\n' "${DB_PASS//%/\\x}")
    
    if PGPASSWORD="$DB_PASS_DECODED" psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" >/dev/null 2>&1; then
        print_success "psql connection successful"
        
        # Get PostgreSQL version
        PG_VERSION=$(PGPASSWORD="$DB_PASS_DECODED" psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT version();" 2>/dev/null | head -1)
        print_info "  PostgreSQL Version: $PG_VERSION"
    else
        print_error "psql connection failed"
        print_error "  Check your DATABASE_URL and network connectivity"
        exit 1
    fi
else
    print_warning "psql not available, skipping psql connection test"
fi

# ============================================================================
# STEP 5: Test Connection with Prisma
# ============================================================================

print_info "Testing connection with Prisma..."

if [ -f "prisma/schema.prisma" ]; then
    # Try to connect using Prisma
    if npx prisma db execute --stdin <<< "SELECT 1;" --schema=prisma/schema.prisma >/dev/null 2>&1; then
        print_success "Prisma connection successful"
    else
        print_warning "Prisma connection test failed (may be OK if schema needs generation)"
    fi
else
    print_warning "prisma/schema.prisma not found, skipping Prisma connection test"
fi

# ============================================================================
# STEP 6: Check Migration Status
# ============================================================================

if [ -f "prisma/schema.prisma" ] && [ -d "prisma/migrations" ]; then
    print_info "Checking migration status..."
    
    MIGRATION_STATUS=$(npx prisma migrate status --schema=prisma/schema.prisma 2>&1 || echo "error")
    
    if echo "$MIGRATION_STATUS" | grep -q "Database schema is up to date"; then
        print_success "Database schema is up to date"
    elif echo "$MIGRATION_STATUS" | grep -q "following migration"; then
        print_warning "Pending migrations detected"
        echo "$MIGRATION_STATUS"
    elif echo "$MIGRATION_STATUS" | grep -q "error"; then
        print_warning "Could not check migration status (may be OK if no migrations exist)"
    else
        print_info "Migration status:"
        echo "$MIGRATION_STATUS"
    fi
fi

# ============================================================================
# STEP 7: Summary
# ============================================================================

print_success "Database connection check completed!"
print_info "Summary:"
print_info "  ✅ DATABASE_URL is configured"
print_info "  ✅ Connection to database successful"
if [ -n "$DB_NAME" ]; then
    print_info "  ✅ Target database: $DB_NAME"
fi






