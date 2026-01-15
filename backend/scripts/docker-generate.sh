#!/bin/bash
set -e

# ============================================================================
# Docker Prisma Client Generation Script
# 
# Safely generates Prisma Client inside Docker container.
# Does NOT run migrations - only generates client.
# 
# Usage (from host):
#   docker-compose exec backend ./scripts/docker-generate.sh
# 
# Or inside container:
#   ./scripts/docker-generate.sh
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

print_error() {
    echo -e "${RED}❌${NC} $1"
}

# ============================================================================
# STEP 1: Merge Schema
# ============================================================================

print_info "Merging Prisma schema files..."

if npm run schema:merge; then
    print_success "Schema merged"
else
    print_error "Schema merge failed"
    exit 1
fi

# ============================================================================
# STEP 2: Validate Schema
# ============================================================================

print_info "Validating Prisma schema..."

if npx prisma validate --schema=prisma/schema.prisma; then
    print_success "Schema valid"
else
    print_error "Schema validation failed"
    exit 1
fi

# ============================================================================
# STEP 3: Generate Prisma Client
# ============================================================================

print_info "Generating Prisma Client..."

if npx prisma generate --schema=prisma/schema.prisma; then
    print_success "Prisma Client generated"
else
    print_error "Prisma Client generation failed"
    exit 1
fi

# ============================================================================
# STEP 4: Verify Generation
# ============================================================================

if [ -f "node_modules/.prisma/client/index.d.ts" ]; then
    print_success "Prisma Client files verified"
else
    print_error "Prisma Client files not found"
    exit 1
fi

print_success "Prisma Client generation completed!"






