#!/bin/bash
set -e

# ============================================================================
# Fix Shadow Database Issues
# 
# This script helps resolve Prisma shadow database errors by:
# 1. Applying pending migrations first
# 2. Providing options to configure shadow database
# 
# Usage:
#   ./scripts/fix-shadow-db.sh
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

print_info "Fixing Prisma shadow database issues..."

# ============================================================================
# STEP 1: Check Migration Status
# ============================================================================

print_info "Checking migration status..."

MIGRATION_STATUS=$(npx prisma migrate status --schema=prisma/schema.prisma 2>&1 || echo "error")

if echo "$MIGRATION_STATUS" | grep -q "Database schema is up to date"; then
    print_success "Database schema is up to date"
    print_info "No action needed"
    exit 0
elif echo "$MIGRATION_STATUS" | grep -q "not yet been applied"; then
    print_warning "Pending migrations found"
    echo "$MIGRATION_STATUS"
    
    # ============================================================================
    # STEP 2: Apply Pending Migrations
    # ============================================================================
    
    print_info "Applying pending migrations..."
    
    if npx prisma migrate deploy --schema=prisma/schema.prisma; then
        print_success "Pending migrations applied successfully"
    else
        print_error "Failed to apply pending migrations"
        print_info ""
        print_info "Common solutions:"
        print_info "  1. Check if migration SQL has errors"
        print_info "  2. Ensure database connection is correct"
        print_info "  3. Check if tables referenced in migrations exist"
        exit 1
    fi
else
    print_error "Could not determine migration status"
    echo "$MIGRATION_STATUS"
    exit 1
fi

# ============================================================================
# STEP 3: Verify Schema Sync
# ============================================================================

print_info "Verifying schema is in sync..."

if npx prisma migrate status --schema=prisma/schema.prisma | grep -q "Database schema is up to date"; then
    print_success "Schema is now in sync"
    print_info "You can now create new migrations safely"
else
    print_warning "Schema may still have issues"
    print_info "Run 'npx prisma migrate status' to see details"
fi

print_success "Shadow database fix completed!"






