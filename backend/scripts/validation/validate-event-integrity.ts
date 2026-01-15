#!/usr/bin/env ts-node
/**
 * Event Integrity Validation Script
 * 
 * Validates contentHash integrity for domain events
 * Run periodically for audit verification
 */

import { PrismaClient } from '@prisma/client';
import { DomainEventService } from '../../src/services/domainEvent.service';

const prisma = new PrismaClient();
const eventService = new DomainEventService();

interface ValidationResult {
  total: number;
  valid: number;
  invalid: number;
  failures: Array<{ eventId: string; eventType: string; reason: string }>;
}

async function validateEventIntegrity(
  startDate?: Date,
  endDate?: Date,
  limit: number = 1000
): Promise<ValidationResult> {
  const result: ValidationResult = {
    total: 0,
    valid: 0,
    invalid: 0,
    failures: []
  };

  const where: any = {};
  if (startDate || endDate) {
    where.occurredAt = {};
    if (startDate) where.occurredAt.gte = startDate;
    if (endDate) where.occurredAt.lte = endDate;
  }

  const events = await prisma.domainEvent.findMany({
    where,
    take: limit,
    select: {
      id: true,
      eventType: true,
      occurredAt: true
    }
  });

  result.total = events.length;

  console.log(`Validating ${result.total} events...`);

  for (const event of events) {
    try {
      const isValid = await eventService.verifyEventIntegrity(event.id);

      if (isValid) {
        result.valid++;
      } else {
        result.invalid++;
        result.failures.push({
          eventId: event.id,
          eventType: event.eventType,
          reason: 'Content hash mismatch - possible tampering'
        });
      }
    } catch (error: any) {
      result.invalid++;
      result.failures.push({
        eventId: event.id,
        eventType: event.eventType,
        reason: error.message
      });
    }
  }

  return result;
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  let startDate: Date | undefined;
  let endDate: Date | undefined;
  let limit = 1000;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--start' && args[i + 1]) {
      startDate = new Date(args[i + 1]);
      i++;
    } else if (args[i] === '--end' && args[i + 1]) {
      endDate = new Date(args[i + 1]);
      i++;
    } else if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    }
  }

  console.log('Event Integrity Validation');
  console.log('='.repeat(50));

  const result = await validateEventIntegrity(startDate, endDate, limit);

  console.log(`\nResults:`);
  console.log(`  Total: ${result.total}`);
  console.log(`  Valid: ${result.valid} ✅`);
  console.log(`  Invalid: ${result.invalid} ❌`);

  if (result.failures.length > 0) {
    console.log(`\n❌ Failures:`);
    result.failures.slice(0, 10).forEach((failure) => {
      console.log(`  - ${failure.eventId} (${failure.eventType}): ${failure.reason}`);
    });
    if (result.failures.length > 10) {
      console.log(`  ... and ${result.failures.length - 10} more`);
    }
  }

  await prisma.$disconnect();

  process.exit(result.invalid > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Validation error:', error);
    process.exit(1);
  });
}

export { validateEventIntegrity };



