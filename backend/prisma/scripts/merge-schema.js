#!/usr/bin/env node
/**
 * Prisma Schema Merger
 * 
 * Combines multiple schema files from schema/ directory into a single schema.prisma file.
 * This enables domain-driven design with modular schema files while maintaining
 * Prisma's requirement for a single schema file.
 * 
 * Usage: node scripts/merge-schema.js
 */

const fs = require('fs');
const path = require('path');

const SCHEMA_DIR = path.join(__dirname, '../schema');
const OUTPUT_FILE = path.join(__dirname, '../schema.prisma');

// Order matters: base and foundation must come first, then domains
const SCHEMA_ORDER = [
  'base.prisma',
  'foundation.prisma',
  'rbac.prisma',
  'expert.prisma',
  'service.prisma',
  'clinical-enums.prisma',
  'patient.prisma',
  'patient-intake.prisma',
  'patient-lifecycle-transition.prisma',
  'frontdesk_ops.prisma',
  'appointment.prisma',
  'consultation-request.prisma',
  'consultation.prisma',
  'emr.prisma',
  'orders.prisma',
  'prescription.prisma',
  'procedure-plan.prisma',
  'follow-up-plan.prisma',
  'theater.prisma',
  'encounter.prisma',
  'condition.prisma',
  'clinical-observation.prisma',
  'access-control.prisma',
  'medical_records.prisma',
  'consent.prisma',
  'billing.prisma',
  'inventory.prisma',
  'password-history.prisma',
  'audit.prisma',
  'notification.prisma',
];

function mergeSchemas() {
  console.log('🔄 Merging Prisma schema files...\n');

  let mergedContent = '';
  let fileCount = 0;

  for (const filename of SCHEMA_ORDER) {
    const filePath = path.join(SCHEMA_DIR, filename);

    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  Warning: ${filename} not found, skipping...`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');

    // Add header comment for each domain
    mergedContent += `// ============================================================================\n`;
    mergedContent += `// ${filename.replace('.prisma', '').toUpperCase()}\n`;
    mergedContent += `// Source: schema/${filename}\n`;
    mergedContent += `// ============================================================================\n\n`;
    mergedContent += content.trim();
    mergedContent += '\n\n';

    fileCount++;
    console.log(`✅ Merged: ${filename}`);
  }

  // Write merged schema
  fs.writeFileSync(OUTPUT_FILE, mergedContent.trim() + '\n', 'utf8');

  console.log(`\n✨ Successfully merged ${fileCount} schema files into schema.prisma`);
  console.log(`📄 Output: ${OUTPUT_FILE}\n`);
}

try {
  mergeSchemas();
  process.exit(0);
} catch (error) {
  console.error('❌ Error merging schemas:', error.message);
  process.exit(1);
}

