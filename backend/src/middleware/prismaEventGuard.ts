/**
 * Prisma Middleware: DomainEvent and History Table Protection
 * 
 * CRITICAL: Prevents direct mutations to immutable tables at the ORM level
 * This is defense-in-depth - database triggers are the primary enforcement
 */

import { Prisma } from '@prisma/client';

export const prismaEventGuard = async (
  params: Prisma.MiddlewareParams,
  next: (params: Prisma.MiddlewareParams) => Promise<any>
) => {
  // Prevent updates to domain_events
  if (params.model === 'DomainEvent') {
    if (params.action === 'update' || params.action === 'updateMany') {
      throw new Error(
        'DomainEvent is immutable. UPDATE operations are forbidden. ' +
        'Use event sourcing pattern: create new event instead of updating existing.'
      );
    }

    if (params.action === 'delete' || params.action === 'deleteMany') {
      throw new Error(
        'DomainEvent is immutable. DELETE operations are forbidden. ' +
        'Events must be preserved for legal and audit requirements.'
      );
    }

    // Validate required fields on create
    if (params.action === 'create' || params.action === 'createMany') {
      const data = Array.isArray(params.args.data)
        ? params.args.data
        : [params.args.data];

      for (const event of data) {
        validateDomainEvent(event);
      }
    }
  }

  // Prevent updates to case_status_history
  if (params.model === 'CaseStatusHistory') {
    if (params.action === 'update' || params.action === 'updateMany') {
      throw new Error(
        'CaseStatusHistory is immutable. UPDATE operations are forbidden. ' +
        'Status history must remain unchanged for legal defensibility.'
      );
    }

    if (params.action === 'delete' || params.action === 'deleteMany') {
      throw new Error(
        'CaseStatusHistory is immutable. DELETE operations are forbidden.'
      );
    }

    // Validate triggeringEventId on create
    if (params.action === 'create' || params.action === 'createMany') {
      const data = Array.isArray(params.args.data)
        ? params.args.data
        : [params.args.data];

      for (const history of data) {
        if (!history.triggeringEventId) {
          throw new Error(
            'CaseStatusHistory requires triggeringEventId. ' +
            'Every status change must be event-anchored.'
          );
        }
      }
    }
  }

  // Prevent deletes from record_merge_history, allow limited updates for reversals
  if (params.model === 'RecordMergeHistory') {
    if (params.action === 'delete' || params.action === 'deleteMany') {
      throw new Error(
        'RecordMergeHistory is immutable. DELETE operations are forbidden.'
      );
    }

    // Allow updates only for reversal fields
    if (params.action === 'update' || params.action === 'updateMany') {
      const allowedFields = ['reversedAt', 'reversalEventId', 'reversedBy'];
      const updateFields = Object.keys(params.args.data || {});

      // Check if any immutable fields are being updated
      const immutableFields = [
        'id',
        'sourceRecordId',
        'targetRecordId',
        'triggeringEventId',
        'reason',
        'mergedBy',
        'mergedAt',
        'version'
      ];

      const invalidFields = updateFields.filter(
        (f) => !allowedFields.includes(f) && immutableFields.includes(f)
      );

      if (invalidFields.length > 0) {
        throw new Error(
          `Cannot update immutable fields in RecordMergeHistory: ${invalidFields.join(', ')}. ` +
          `Only reversal fields (reversedAt, reversalEventId, reversedBy) can be updated.`
        );
      }
    }

    // Validate triggeringEventId on create
    if (params.action === 'create' || params.action === 'createMany') {
      const data = Array.isArray(params.args.data)
        ? params.args.data
        : [params.args.data];

      for (const merge of data) {
        if (!merge.triggeringEventId) {
          throw new Error(
            'RecordMergeHistory requires triggeringEventId. ' +
            'Every merge operation must be event-anchored.'
          );
        }
      }
    }
  }

  // Prevent updates/deletes from data_access_logs (HIPAA requirement)
  if (params.model === 'DataAccessLog') {
    if (params.action === 'update' || params.action === 'updateMany') {
      throw new Error(
        'DataAccessLog is immutable. UPDATE operations are forbidden. ' +
        'Access logs must remain unchanged for HIPAA compliance.'
      );
    }

    if (params.action === 'delete' || params.action === 'deleteMany') {
      throw new Error(
        'DataAccessLog is immutable. DELETE operations are forbidden. ' +
        'Access logs must be preserved for HIPAA audit requirements.'
      );
    }
  }

  return next(params);
};

function validateDomainEvent(event: any): void {
  // Required fields
  if (!event.eventType || !event.domain || !event.aggregateId ||
      !event.aggregateType || !event.payload || !event.contentHash) {
    throw new Error(
      'DomainEvent missing required fields: ' +
      'eventType, domain, aggregateId, aggregateType, payload, contentHash'
    );
  }

  // Validate eventType pattern
  if (!/^[A-Z][a-zA-Z0-9]*\.[A-Z][a-zA-Z0-9]*$/.test(event.eventType)) {
    throw new Error(
      `Invalid eventType format: ${event.eventType}. ` +
      `Must match pattern: DomainEntity.Action (e.g., "SurgicalCase.StatusChanged")`
    );
  }

  // Validate contentHash format
  if (!/^[a-f0-9]{64}$/.test(event.contentHash)) {
    throw new Error(
      `Invalid contentHash format: ${event.contentHash}. ` +
      `Must be 64-character hexadecimal string (SHA-256).`
    );
  }

  // Validate causationId doesn't reference self
  if (event.causationId && event.causationId === event.id) {
    throw new Error('causationId cannot reference self');
  }
}

/**
 * Apply middleware to Prisma client
 */
export function applyPrismaEventGuard(prisma: any): void {
  prisma.$use(prismaEventGuard);
}












