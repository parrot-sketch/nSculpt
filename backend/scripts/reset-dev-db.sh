#!/bin/bash
set -e

# Configuration
DB_CONTAINER="ehr-postgres"
DB_USER="ehr_user"
DB_NAME="surgical_ehr"
BACKEND_DIR="/home/bkg/ns/backend"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}☢️  INITIATING NUCLEAR DATABASE RESET v2 (Migration Rebuild) ☢️${NC}"

cd $BACKEND_DIR

# 0. Backup Hardening SQL (Safety Check)
if [ ! -f "prisma/sql/all_hardening.sql" ]; then
    echo -e "${RED}❌ Critical hardening SQL not found! Aborting.${NC}"
    exit 1
fi

# 1. Kill connections and drop database
echo "Stopping connections..."
docker exec $DB_CONTAINER psql -U $DB_USER -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" > /dev/null 2>&1 || true

echo "Dropping database '$DB_NAME'..."
docker exec $DB_CONTAINER psql -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"

echo "Recreating database '$DB_NAME'..."
docker exec $DB_CONTAINER psql -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"

# 2. DELETE BROKEN MIGRATIONS (Except .gitignore)
echo -e "${RED}🗑️  Deleting broken migration history...${NC}"
rm -rf prisma/migrations

# 3. Create Fresh Baseline Migration
echo -e "${GREEN}📦 Creating Base Migration (0_init)...${NC}"
# This maps the current Prisma schema to a fresh SQL migration
npx prisma migrate dev --name init_complete_schema

# 4. Create Hardening Migration (Data Only)
echo -e "${GREEN}🛡️  Injecting Security Hardening (1_hardening)...${NC}"
# We Create a new migration manually
npx prisma migrate dev --name apply_hardening --create-only

# Find the newly created migration folder
HARDENING_MIGRATION_DIR=$(ls -d prisma/migrations/*_apply_hardening | head -n 1)

# Overwrite its migration.sql with our hardening triggers
cp prisma/sql/all_hardening.sql "$HARDENING_MIGRATION_DIR/migration.sql"

# Apply it
echo -e "${GREEN}🚀 Applying Hardening...${NC}"
npx prisma migrate dev

# 5. Generate Client
echo -e "${GREEN}🏭 Generating Prisma Client...${NC}"
npx prisma generate

# 6. Verify Triggers
echo -e "${GREEN}🛡️  Verifying Safety Triggers...${NC}"
npm run safety:verify

# 7. Seed Data
echo -e "${GREEN}🌱 Seeding Database...${NC}"
npx prisma db seed

echo -e "${GREEN}✅ RESET COMPLETE. Database is fresh, synced, and hardened.${NC}"
