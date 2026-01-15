#!/usr/bin/env node
/**
 * Database Connection Validation Script
 * 
 * Validates that:
 * 1. Database connection is successful
 * 2. Database name matches expected value
 * 3. Required tables exist
 * 
 * This script is called during container startup to catch configuration mismatches early.
 */

const { PrismaClient } = require('@prisma/client');

const DATABASE_URL = process.env.DATABASE_URL;
const EXPECTED_DB_NAME = process.env.POSTGRES_DB || 'surgical_ehr';

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Extract database name from DATABASE_URL
const dbNameMatch = DATABASE_URL.match(/\/\/(?:[^:]+:[^@]+@)?[^\/]+\/([^?]+)/);
const actualDbName = dbNameMatch ? dbNameMatch[1] : null;

if (!actualDbName) {
  console.error('❌ ERROR: Could not extract database name from DATABASE_URL');
  process.exit(1);
}

console.log(`🔍 Validating database connection...`);
console.log(`   Expected database: ${EXPECTED_DB_NAME}`);
console.log(`   Actual database: ${actualDbName}`);

// Check if database name matches
if (actualDbName !== EXPECTED_DB_NAME) {
  console.error(`\n❌ CRITICAL ERROR: Database name mismatch!`);
  console.error(`   Expected: ${EXPECTED_DB_NAME}`);
  console.error(`   Actual: ${actualDbName}`);
  console.error(`   This will cause authentication failures.`);
  console.error(`\n   Fix: Update POSTGRES_DB in .env file to match the actual database name.`);
  process.exit(1);
}

const prisma = new PrismaClient({
  log: ['error'],
});

async function validateConnection() {
  try {
    // Test connection by querying database name
    const result = await prisma.$queryRaw`SELECT current_database() as db_name`;
    const connectedDbName = result[0]?.db_name;

    if (connectedDbName !== EXPECTED_DB_NAME) {
      console.error(`\n❌ ERROR: Connected to wrong database!`);
      console.error(`   Expected: ${EXPECTED_DB_NAME}`);
      console.error(`   Connected to: ${connectedDbName}`);
      process.exit(1);
    }

    // Verify Prisma can connect and query
    await prisma.$queryRaw`SELECT 1`;

    // Check if _prisma_migrations table exists (indicates migrations have run)
    const migrationsTable = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '_prisma_migrations'
      ) as exists
    `;

    if (!migrationsTable[0]?.exists) {
      console.warn(`⚠️  WARNING: Prisma migrations table not found. Run migrations first.`);
    }

    console.log(`✅ Database connection validated successfully`);
    console.log(`   Connected to: ${connectedDbName}`);
    console.log(`   Migrations table: ${migrationsTable[0]?.exists ? 'exists' : 'missing'}`);

  } catch (error) {
    console.error(`\n❌ Database connection failed!`);
    console.error(`   Error: ${error.message}`);
    
    if (error.message.includes('authentication failed')) {
      console.error(`\n   This usually means:`);
      console.error(`   1. Wrong password in DATABASE_URL`);
      console.error(`   2. Wrong database name in DATABASE_URL`);
      console.error(`   3. User doesn't have access to the database`);
    } else if (error.message.includes('does not exist')) {
      console.error(`\n   Database "${actualDbName}" does not exist.`);
      console.error(`   Create it or update POSTGRES_DB in .env file.`);
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

validateConnection();







