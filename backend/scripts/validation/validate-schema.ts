#!/usr/bin/env ts-node
/**
 * Schema Validation Script
 * 
 * Validates Prisma schema for immutability requirements
 * Run as part of CI/CD pipeline
 */

import * as fs from 'fs';
import * as path from 'path';

const SCHEMA_PATH = path.join(__dirname, '../../prisma/schema.prisma');

interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

function validateSchema(): ValidationResult {
  const result: ValidationResult = {
    passed: true,
    errors: [],
    warnings: []
  };

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');

  // 1. Check domain_events has no updatedAt
  if (schema.includes('model DomainEvent') && 
      schema.match(/model DomainEvent[\s\S]*?@@map\("domain_events"\)/)?.some(
        (match) => match.includes('updatedAt') && match.includes('@updatedAt')
      )) {
    result.errors.push('DomainEvent model must NOT have updatedAt field');
    result.passed = false;
  }

  // 2. Check domain_events has contentHash
  if (!schema.match(/model DomainEvent[\s\S]*?contentHash[\s\S]*?String/)) {
    result.errors.push('DomainEvent model must have contentHash field');
    result.passed = false;
  }

  // 3. Check CaseStatusHistory has version = 1
  if (schema.includes('model CaseStatusHistory')) {
    const versionMatch = schema.match(/model CaseStatusHistory[\s\S]*?version[\s\S]*?@default\((\d+)\)/);
    if (!versionMatch || versionMatch[1] !== '1') {
      result.errors.push('CaseStatusHistory must have version @default(1)');
      result.passed = false;
    }
  }

  // 4. Check RecordMergeHistory has version = 1
  if (schema.includes('model RecordMergeHistory')) {
    const versionMatch = schema.match(/model RecordMergeHistory[\s\S]*?version[\s\S]*?@default\((\d+)\)/);
    if (!versionMatch || versionMatch[1] !== '1') {
      result.errors.push('RecordMergeHistory must have version @default(1)');
      result.passed = false;
    }
  }

  // 5. Check triggeringEventId is required
  const requiredEventRefs = [
    'CaseStatusHistory.triggeringEventId',
    'RecordMergeHistory.triggeringEventId'
  ];

  for (const ref of requiredEventRefs) {
    const [model, field] = ref.split('.');
    const modelRegex = new RegExp(`model ${model}[\\s\\S]*?${field}[\\s\\S]*?String`);
    const match = schema.match(modelRegex);
    if (match && match[0].includes('?')) {
      result.warnings.push(`${model}.${field} should be required (non-nullable)`);
    }
  }

  return result;
}

// Run validation
const result = validateSchema();

console.log('Schema Validation Results:');
console.log('=' .repeat(50));

if (result.errors.length > 0) {
  console.error('\n❌ ERRORS:');
  result.errors.forEach((error) => console.error(`  - ${error}`));
}

if (result.warnings.length > 0) {
  console.warn('\n⚠️  WARNINGS:');
  result.warnings.forEach((warning) => console.warn(`  - ${warning}`));
}

if (result.passed && result.warnings.length === 0) {
  console.log('\n✅ All validations passed!');
  process.exit(0);
} else if (result.passed) {
  console.log('\n✅ Validation passed with warnings');
  process.exit(0);
} else {
  console.error('\n❌ Validation failed');
  process.exit(1);
}












