#!/bin/bash
set -e

# ============================================================================
# Fix Missing Migration Files
# 
# This script helps fix migration issues where:
# - Migration directory exists but migration.sql is missing
# - Migration is corrupted or incomplete
# 
# Usage:
#   ./scripts/fix-missing-migration.sh [migration-name]
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

print_info "Checking for missing migration files..."

# Find all migration directories
MIGRATION_DIRS=$(find prisma/migrations -mindepth 1 -maxdepth 1 -type d | sort)

if [ -z "$MIGRATION_DIRS" ]; then
    print_warning "No migration directories found"
    exit 0
fi

MISSING_COUNT=0
EMPTY_DIRS=()

for dir in $MIGRATION_DIRS; do
    MIGRATION_FILE="$dir/migration.sql"
    
    if [ ! -f "$MIGRATION_FILE" ]; then
        MISSING_COUNT=$((MISSING_COUNT + 1))
        EMPTY_DIRS+=("$dir")
        print_warning "Missing migration.sql in: $dir"
    fi
done

if [ $MISSING_COUNT -eq 0 ]; then
    print_success "All migration directories have migration.sql files"
    exit 0
fi

print_warning "Found $MISSING_COUNT migration directory(ies) without migration.sql"

# If specific migration name provided, only fix that one
if [ -n "$1" ]; then
    TARGET_DIR="prisma/migrations/$1"
    if [ -d "$TARGET_DIR" ] && [ ! -f "$TARGET_DIR/migration.sql" ]; then
        print_info "Fixing migration: $1"
        read -p "Delete empty migration directory? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            rm -rf "$TARGET_DIR"
            print_success "Deleted empty migration directory: $1"
        else
            print_info "Migration directory kept. You may need to create migration.sql manually"
        fi
    else
        print_error "Migration $1 not found or already has migration.sql"
        exit 1
    fi
else
    # Fix all empty directories
    print_info "Empty migration directories found:"
    for dir in "${EMPTY_DIRS[@]}"; do
        echo "  - $dir"
    done
    
    read -p "Delete all empty migration directories? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
        for dir in "${EMPTY_DIRS[@]}"; do
            rm -rf "$dir"
            print_success "Deleted: $dir"
        done
        print_success "All empty migration directories removed"
    else
        print_info "Migration directories kept. You may need to:"
        print_info "  1. Create migration.sql files manually"
        print_info "  2. Or delete the directories if they're not needed"
        exit 0
    fi
fi

# Verify migration status
print_info "Checking migration status..."
if npx prisma migrate status --schema=prisma/schema.prisma 2>&1 | grep -q "Database schema is up to date"; then
    print_success "Migration status is now valid"
else
    print_warning "Migration status check:"
    npx prisma migrate status --schema=prisma/schema.prisma 2>&1 | head -10
fi

print_success "Migration fix completed!"






