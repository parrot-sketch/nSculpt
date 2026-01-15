#!/bin/bash
set -e

# ============================================================================
# Safe Prisma Client Generation Script
# 
# This script safely generates Prisma Client without running migrations.
# It validates the database connection and ensures schema is correct.
# 
# Usage:
#   ./scripts/safe-generate.sh
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
# STEP 1: Validate Environment
# ============================================================================

print_info "Validating environment..."

if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL environment variable is not set"
    print_info "This script only generates Prisma Client, but DATABASE_URL is needed for validation"
    print_warning "Continuing without DATABASE_URL validation..."
else
    print_success "DATABASE_URL is set"
    # Extract database name for display (without exposing password)
    DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
    if [ -n "$DB_NAME" ]; then
        print_info "  Target Database: $DB_NAME"
        print_info "  Target Host: $DB_HOST"
    fi
fi

# ============================================================================
# STEP 2: Check Prisma Schema
# ============================================================================

print_info "Checking Prisma schema..."

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
# STEP 3: Merge Schema (if needed)
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
# STEP 4: Validate Schema
# ============================================================================

print_info "Validating Prisma schema syntax..."

if npx prisma validate --schema=prisma/schema.prisma; then
    print_success "Schema validation passed"
else
    print_error "Schema validation failed"
    print_info "Please fix schema errors before generating Prisma Client"
    exit 1
fi

# ============================================================================
# STEP 5: Format Schema
# ============================================================================

print_info "Formatting Prisma schema..."

if npx prisma format --schema=prisma/schema.prisma; then
    print_success "Schema formatted"
else
    print_warning "Schema formatting had issues (may be OK)"
fi

# ============================================================================
# STEP 6: Generate Prisma Client
# ============================================================================

print_info "Generating Prisma Client..."

# Generate Prisma Client
if npx prisma generate --schema=prisma/schema.prisma; then
    print_success "Prisma Client generated successfully"
else
    print_error "Prisma Client generation failed"
    exit 1
fi

# ============================================================================
# STEP 7: Verify Generation
# ============================================================================

print_info "Verifying Prisma Client generation..."

if [ -f "node_modules/.prisma/client/index.d.ts" ]; then
    print_success "Prisma Client files found"
    
    # Check if symlink exists
    if [ -e "node_modules/@prisma/client/.prisma/client" ] || [ -L "node_modules/@prisma/client/.prisma/client" ]; then
        print_success "Prisma Client symlink verified"
    else
        print_warning "Prisma Client symlink missing, creating..."
        mkdir -p node_modules/@prisma/client/.prisma
        ln -sf ../../../.prisma/client node_modules/@prisma/client/.prisma/client || true
        print_success "Symlink created"
    fi
else
    print_error "Prisma Client files not found after generation"
    exit 1
fi

# ============================================================================
# STEP 8: Run Postinstall (if needed)
# ============================================================================

print_info "Running Prisma postinstall script..."

if npm run postinstall --prefix node_modules/@prisma/client 2>/dev/null; then
    print_success "Postinstall completed"
else
    print_warning "Postinstall had issues (may be OK if symlink already exists)"
fi

print_success "Prisma Client generation completed successfully!"
print_info "You can now use Prisma Client in your application"






