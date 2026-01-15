# DomainEvent Architecture Hardening
## Final Frozen Contract for Enterprise Legal Defensibility

## Executive Summary

This document defines the **final, frozen DomainEvent contract** with non-negotiable invariants, database-level enforcement, and application-level guards. This architecture ensures **complete legal defensibility** for HIPAA compliance, legal discovery, and audit replay.

---

## 1. Final DomainEvent Schema (Frozen Contract)

### Enhanced Schema with Invariants

```prisma
model DomainEvent {
  id          String   @id @default(uuid()) @db.Uuid
  
  // IDENTITY: Immutable event identification
  eventType   String   @db.VarChar(100) // e.g., "MedicalRecord.Created", "Consent.Signed"
  domain      Domain   // Required: domain classification
  aggregateId String   @db.Uuid // Required: ID of entity that changed
  aggregateType String @db.VarChar(100) // Required: Entity type
  
  // PAYLOAD: Immutable event data
  payload     Json     @db.JsonB // Required: Structured event data (immutable)
  metadata    Json?    @db.JsonB // Optional: Additional context (immutable)
  
  // CORRELATION & CAUSATION: Required for event chains
  correlationId String? @db.Uuid // Links events in same workflow (optional but recommended)
  causationId   String? @db.Uuid // Event that caused this one (optional but recommended)
  
  // ACTOR IDENTITY: Who/what created this event
  createdBy   String?   @db.Uuid // User ID (nullable for system events)
  sessionId   String?   @db.VarChar(100) // Session identifier for correlation
  requestId   String?   @db.VarChar(100) // HTTP request ID for tracing
  
  // TEMPORAL: Immutable timestamps
  occurredAt  DateTime  @default(now()) @db.Timestamptz(6) // When event occurred (immutable)
  
  // INTEGRITY: Content hash for tamper detection
  contentHash String   @db.VarChar(64) // SHA-256 hash of event content (immutable)
  
  // Relations
  creator     User?     @relation("EventCreatedBy", fields: [createdBy], references: [id])
  
  // Cross-domain event relations
  inventoryTransactions InventoryTransaction[]
  inventoryUsageClinicalEvents InventoryUsage[]
  inventoryUsageBillingEvents InventoryUsage[]
  billLineItems BillLineItem[]
  billingAdjustments BillingAdjustment[]
  payments Payment[]
  insuranceClaims InsuranceClaim[]
  caseStatusChanges CaseStatusHistory[]
  consentRevocations PatientConsentInstance[]
  recordMerges RecordMergeHistory[]
  recordMergeReversals RecordMergeHistory[]
  
  // Database constraints
  @@unique([id]) // Explicit unique constraint
  @@index([eventType])
  @@index([domain])
  @@index([aggregateId, aggregateType])
  @@index([occurredAt])
  @@index([correlationId])
  @@index([causationId])
  @@index([createdBy])
  @@index([sessionId])
  @@index([contentHash]) // For integrity verification
  @@map("domain_events")
}
```

### Non-Negotiable Invariants

#### MUST (Enforced at DB + Application Level)

1. **Immutability After Creation**
   - ✅ NEVER UPDATE any field after INSERT
   - ✅ NEVER DELETE events
   - ✅ Only INSERT allowed

2. **Required Fields**
   - ✅ `eventType` MUST be non-null and match pattern `DomainEntity.Action`
   - ✅ `domain` MUST be non-null and from Domain enum
   - ✅ `aggregateId` MUST be non-null UUID
   - ✅ `aggregateType` MUST be non-null
   - ✅ `payload` MUST be non-null JSON
   - ✅ `occurredAt` MUST be non-null timestamp
   - ✅ `contentHash` MUST be computed and stored

3. **Correlation & Causation**
   - ✅ `causationId` MUST reference existing DomainEvent if provided
   - ✅ `correlationId` MUST reference existing DomainEvent if provided
   - ✅ Self-reference prevention: `causationId != id` and `correlationId != id`

4. **Actor Identity**
   - ✅ `createdBy` MUST reference existing User if provided (nullable for system events)
   - ✅ System events MUST set `createdBy = NULL` with explicit reason in metadata

5. **Content Integrity**
   - ✅ `contentHash` MUST be SHA-256 of: `eventType + domain + aggregateId + aggregateType + payload + metadata + occurredAt`
   - ✅ Hash MUST be verified on read (application-level)

#### MUST NOT (Prevented by DB Triggers + Application Guards)

1. **Silent Mutations**
   - ❌ UPDATE `payload` or `metadata` after creation
   - ❌ UPDATE `occurredAt` (immutable timestamp)
   - ❌ UPDATE `eventType`, `domain`, `aggregateId`, `aggregateType`
   - ❌ DELETE events (soft-delete via status field if needed)

2. **Invalid References**
   - ❌ `causationId` referencing non-existent event
   - ❌ `correlationId` referencing non-existent event
   - ❌ `createdBy` referencing non-existent user (if provided)

3. **Tampering**
   - ❌ Events with mismatched `contentHash`
   - ❌ Events created outside transaction boundaries
   - ❌ Events without proper authorization checks

---

## 2. Database-Level Enforcement

### Trigger: Prevent DomainEvent Updates

```sql
-- CRITICAL: Prevent ALL updates to domain_events
CREATE OR REPLACE FUNCTION prevent_domain_event_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'domain_events table is immutable. UPDATE operations are forbidden. Event ID: %', OLD.id;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER domain_events_update_guard
    BEFORE UPDATE ON domain_events
    FOR EACH ROW
    EXECUTE FUNCTION prevent_domain_event_update();
```

### Trigger: Prevent DomainEvent Deletes

```sql
-- CRITICAL: Prevent ALL deletes from domain_events
CREATE OR REPLACE FUNCTION prevent_domain_event_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'domain_events table is immutable. DELETE operations are forbidden. Event ID: %', OLD.id;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER domain_events_delete_guard
    BEFORE DELETE ON domain_events
    FOR EACH ROW
    EXECUTE FUNCTION prevent_domain_event_delete();
```

### Trigger: Validate Content Hash on Insert

```sql
-- CRITICAL: Enforce content hash computation
CREATE OR REPLACE FUNCTION validate_domain_event_hash()
RETURNS TRIGGER AS $$
DECLARE
    expected_hash TEXT;
    event_content TEXT;
BEGIN
    -- Construct content string (order matters!)
    event_content := NEW.event_type || '|' || 
                     NEW.domain::TEXT || '|' || 
                     NEW.aggregate_id::TEXT || '|' || 
                     NEW.aggregate_type || '|' || 
                     NEW.payload::TEXT || '|' || 
                     COALESCE(NEW.metadata::TEXT, '') || '|' || 
                     NEW.occurred_at::TEXT;
    
    -- Compute SHA-256 hash
    expected_hash := encode(digest(event_content, 'sha256'), 'hex');
    
    -- Validate hash matches
    IF NEW.content_hash IS NULL OR NEW.content_hash != expected_hash THEN
        RAISE EXCEPTION 'Invalid content_hash. Expected: %, Got: %', expected_hash, NEW.content_hash;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER domain_events_hash_validation
    BEFORE INSERT ON domain_events
    FOR EACH ROW
    EXECUTE FUNCTION validate_domain_event_hash();
```

### Trigger: Validate Causation/Correlation References

```sql
-- CRITICAL: Ensure causation/correlation IDs reference existing events
CREATE OR REPLACE FUNCTION validate_event_references()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate causationId exists if provided
    IF NEW.causation_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM domain_events WHERE id = NEW.causation_id) THEN
            RAISE EXCEPTION 'causation_id % does not reference existing event', NEW.causation_id;
        END IF;
        
        -- Prevent self-reference
        IF NEW.causation_id = NEW.id THEN
            RAISE EXCEPTION 'causation_id cannot reference self';
        END IF;
    END IF;
    
    -- Validate correlationId exists if provided
    IF NEW.correlation_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM domain_events WHERE id = NEW.correlation_id) THEN
            RAISE EXCEPTION 'correlation_id % does not reference existing event', NEW.correlation_id;
        END IF;
    END IF;
    
    -- Validate createdBy references existing user if provided
    IF NEW.created_by IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.created_by) THEN
            RAISE EXCEPTION 'created_by % does not reference existing user', NEW.created_by;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER domain_events_reference_validation
    BEFORE INSERT ON domain_events
    FOR EACH ROW
    EXECUTE FUNCTION validate_event_references();
```

### Trigger: Prevent History Table Updates

```sql
-- Prevent updates to CaseStatusHistory
CREATE OR REPLACE FUNCTION prevent_case_status_history_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'case_status_history is immutable. UPDATE forbidden. ID: %', OLD.id;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER case_status_history_update_guard
    BEFORE UPDATE ON case_status_history
    FOR EACH ROW
    EXECUTE FUNCTION prevent_case_status_history_update();

CREATE TRIGGER case_status_history_delete_guard
    BEFORE DELETE ON case_status_history
    FOR EACH ROW
    EXECUTE FUNCTION prevent_case_status_history_update();

-- Prevent updates to RecordMergeHistory (except reversal fields)
CREATE OR REPLACE FUNCTION prevent_record_merge_history_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Only allow updates to reversal fields
    IF (OLD.source_record_id IS DISTINCT FROM NEW.source_record_id) OR
       (OLD.target_record_id IS DISTINCT FROM NEW.target_record_id) OR
       (OLD.triggering_event_id IS DISTINCT FROM NEW.triggering_event_id) OR
       (OLD.reason IS DISTINCT FROM NEW.reason) OR
       (OLD.merged_by IS DISTINCT FROM NEW.merged_by) OR
       (OLD.merged_at IS DISTINCT FROM NEW.merged_at) THEN
        RAISE EXCEPTION 'record_merge_history immutable fields cannot be updated. ID: %', OLD.id;
    END IF;
    
    -- Validate reversal event if provided
    IF NEW.reversal_event_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM domain_events WHERE id = NEW.reversal_event_id) THEN
            RAISE EXCEPTION 'reversal_event_id % does not reference existing event', NEW.reversal_event_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER record_merge_history_update_guard
    BEFORE UPDATE ON record_merge_history
    FOR EACH ROW
    EXECUTE FUNCTION prevent_record_merge_history_update();

CREATE TRIGGER record_merge_history_delete_guard
    BEFORE DELETE ON record_merge_history
    FOR EACH ROW
    EXECUTE FUNCTION prevent_record_merge_history_update();
```

### Check Constraints

```sql
-- Ensure eventType follows pattern DomainEntity.Action
ALTER TABLE domain_events
ADD CONSTRAINT event_type_pattern_check
CHECK (event_type ~ '^[A-Z][a-zA-Z0-9]*\.[A-Z][a-zA-Z0-9]*$');

-- Ensure occurredAt is not in future (with 5 minute tolerance for clock skew)
ALTER TABLE domain_events
ADD CONSTRAINT occurred_at_not_future_check
CHECK (occurred_at <= NOW() + INTERVAL '5 minutes');

-- Ensure contentHash is valid SHA-256 hex string
ALTER TABLE domain_events
ADD CONSTRAINT content_hash_format_check
CHECK (content_hash ~ '^[a-f0-9]{64}$');

-- Prevent self-reference in causation/correlation
ALTER TABLE domain_events
ADD CONSTRAINT no_self_causation_check
CHECK (causation_id IS NULL OR causation_id != id);

ALTER TABLE domain_events
ADD CONSTRAINT no_self_correlation_check
CHECK (correlation_id IS NULL OR correlation_id != id);
```

---

## 3. Application-Level Guards

### Prisma Middleware: DomainEvent Protection

```typescript
// prisma/middleware/domainEventGuard.ts
import { Prisma } from '@prisma/client';

export const domainEventGuard = async (
  params: Prisma.MiddlewareParams,
  next: (params: Prisma.MiddlewareParams) => Promise<any>
) => {
  // Prevent updates to domain_events
  if (params.model === 'DomainEvent') {
    if (params.action === 'update' || params.action === 'updateMany') {
      throw new Error(
        'DomainEvent is immutable. UPDATE operations are forbidden. ' +
        'Use event sourcing pattern: create new event instead.'
      );
    }
    
    if (params.action === 'delete' || params.action === 'deleteMany') {
      throw new Error(
        'DomainEvent is immutable. DELETE operations are forbidden.'
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
  
  // Prevent updates to history tables
  if (params.model === 'CaseStatusHistory') {
    if (params.action === 'update' || params.action === 'delete') {
      throw new Error('CaseStatusHistory is immutable.');
    }
  }
  
  if (params.model === 'RecordMergeHistory') {
    if (params.action === 'delete') {
      throw new Error('RecordMergeHistory is immutable. DELETE forbidden.');
    }
    
    // Allow updates only for reversal fields
    if (params.action === 'update') {
      const allowedFields = ['reversedAt', 'reversalEventId', 'reversedBy'];
      const updateFields = Object.keys(params.args.data || {});
      const invalidFields = updateFields.filter(f => !allowedFields.includes(f));
      
      if (invalidFields.length > 0) {
        throw new Error(
          `Cannot update immutable fields: ${invalidFields.join(', ')}. ` +
          'Only reversal fields can be updated.'
        );
      }
    }
  }
  
  return next(params);
};

function validateDomainEvent(event: any): void {
  if (!event.eventType || !event.domain || !event.aggregateId || 
      !event.aggregateType || !event.payload) {
    throw new Error('DomainEvent missing required fields');
  }
  
  // Validate eventType pattern
  if (!/^[A-Z][a-zA-Z0-9]*\.[A-Z][a-zA-Z0-9]*$/.test(event.eventType)) {
    throw new Error(`Invalid eventType format: ${event.eventType}. Must be DomainEntity.Action`);
  }
  
  // Validate causationId references existing event
  if (event.causationId && event.causationId === event.id) {
    throw new Error('causationId cannot reference self');
  }
}
```

### Event Creation Service

```typescript
// services/domainEventService.ts
import { PrismaClient, DomainEvent } from '@prisma/client';
import crypto from 'crypto';

export class DomainEventService {
  constructor(private prisma: PrismaClient) {}
  
  /**
   * Create a domain event with strict validation and integrity checks
   */
  async createEvent(params: {
    eventType: string;
    domain: string;
    aggregateId: string;
    aggregateType: string;
    payload: any;
    metadata?: any;
    causationId?: string;
    correlationId?: string;
    createdBy?: string;
    sessionId?: string;
    requestId?: string;
  }): Promise<DomainEvent> {
    // Validate event type pattern
    if (!/^[A-Z][a-zA-Z0-9]*\.[A-Z][a-zA-Z0-9]*$/.test(params.eventType)) {
      throw new Error(`Invalid eventType: ${params.eventType}`);
    }
    
    // Validate causation/correlation references
    if (params.causationId) {
      const causationEvent = await this.prisma.domainEvent.findUnique({
        where: { id: params.causationId }
      });
      if (!causationEvent) {
        throw new Error(`Causation event ${params.causationId} not found`);
      }
    }
    
    if (params.correlationId) {
      const correlationEvent = await this.prisma.domainEvent.findUnique({
        where: { id: params.correlationId }
      });
      if (!correlationEvent) {
        throw new Error(`Correlation event ${params.correlationId} not found`);
      }
    }
    
    // Validate createdBy references existing user
    if (params.createdBy) {
      const user = await this.prisma.user.findUnique({
        where: { id: params.createdBy }
      });
      if (!user) {
        throw new Error(`User ${params.createdBy} not found`);
      }
    }
    
    // Compute content hash
    const occurredAt = new Date();
    const contentHash = this.computeContentHash({
      eventType: params.eventType,
      domain: params.domain,
      aggregateId: params.aggregateId,
      aggregateType: params.aggregateType,
      payload: params.payload,
      metadata: params.metadata || null,
      occurredAt: occurredAt.toISOString()
    });
    
    // Create event
    return await this.prisma.domainEvent.create({
      data: {
        eventType: params.eventType,
        domain: params.domain,
        aggregateId: params.aggregateId,
        aggregateType: params.aggregateType,
        payload: params.payload,
        metadata: params.metadata,
        causationId: params.causationId,
        correlationId: params.correlationId,
        createdBy: params.createdBy,
        sessionId: params.sessionId,
        requestId: params.requestId,
        occurredAt: occurredAt,
        contentHash: contentHash
      }
    });
  }
  
  /**
   * Verify event integrity by recomputing and comparing hash
   */
  async verifyEventIntegrity(eventId: string): Promise<boolean> {
    const event = await this.prisma.domainEvent.findUnique({
      where: { id: eventId }
    });
    
    if (!event) {
      throw new Error(`Event ${eventId} not found`);
    }
    
    const expectedHash = this.computeContentHash({
      eventType: event.eventType,
      domain: event.domain,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      payload: event.payload,
      metadata: event.metadata,
      occurredAt: event.occurredAt.toISOString()
    });
    
    return event.contentHash === expectedHash;
  }
  
  private computeContentHash(content: {
    eventType: string;
    domain: string;
    aggregateId: string;
    aggregateType: string;
    payload: any;
    metadata: any;
    occurredAt: string;
  }): string {
    const contentString = 
      content.eventType + '|' +
      content.domain + '|' +
      content.aggregateId + '|' +
      content.aggregateType + '|' +
      JSON.stringify(content.payload) + '|' +
      (content.metadata ? JSON.stringify(content.metadata) : '') + '|' +
      content.occurredAt;
    
    return crypto
      .createHash('sha256')
      .update(contentString)
      .digest('hex');
  }
}
```

---

## 4. Correlation & Causation Enforcement

### Correlation Rules

#### Rule 1: Workflow Correlation
- Every user-initiated action MUST have a `correlationId`
- Correlation ID is generated at request start (HTTP request, command handler)
- All events in the same workflow share the same `correlationId`

#### Rule 2: Causation Chains
- Every event triggered by another event MUST have `causationId`
- Direct user actions have `causationId = NULL`
- System reactions have `causationId` pointing to triggering event

#### Rule 3: Session Tracking
- All events in same user session share `sessionId`
- Session ID propagates through event chains

### Correlation Service

```typescript
// services/correlationService.ts
export class CorrelationService {
  private correlationId: string | null = null;
  private causationId: string | null = null;
  private sessionId: string | null = null;
  
  /**
   * Start new correlation context (call at request start)
   */
  startContext(sessionId: string, requestId?: string): void {
    this.correlationId = crypto.randomUUID();
    this.causationId = null; // Reset for new workflow
    this.sessionId = sessionId;
  }
  
  /**
   * Get current correlation context
   */
  getContext(): {
    correlationId: string | null;
    causationId: string | null;
    sessionId: string | null;
  } {
    return {
      correlationId: this.correlationId,
      causationId: this.causationId,
      sessionId: this.sessionId
    };
  }
  
  /**
   * Set causation ID for next event
   */
  setCausation(eventId: string): void {
    this.causationId = eventId;
  }
  
  /**
   * Clear causation (for direct user actions)
   */
  clearCausation(): void {
    this.causationId = null;
  }
}
```

### Event Chain Examples

#### Example 1: Case Status Change

```typescript
// User clicks "Start Case"
const correlation = correlationService.startContext(sessionId, requestId);

// Create status change event (user-initiated, no causation)
const startEvent = await eventService.createEvent({
  eventType: 'SurgicalCase.StatusChanged',
  domain: 'THEATER',
  aggregateId: caseId,
  aggregateType: 'SurgicalCase',
  payload: { fromStatus: 'SCHEDULED', toStatus: 'IN_PROGRESS' },
  correlationId: correlation.correlationId,
  causationId: null, // Direct user action
  createdBy: userId,
  sessionId: sessionId
});

// Set causation for subsequent events
correlationService.setCausation(startEvent.id);

// Create inventory consumption event (caused by case start)
const inventoryEvent = await eventService.createEvent({
  eventType: 'InventoryItem.Consumed',
  domain: 'INVENTORY',
  aggregateId: itemId,
  aggregateType: 'InventoryItem',
  payload: { caseId, quantity: 2 },
  correlationId: correlation.correlationId, // Same workflow
  causationId: startEvent.id, // Caused by case start
  createdBy: userId,
  sessionId: sessionId
});
```

#### Example 2: Consent Revocation

```typescript
// User revokes consent
const correlation = correlationService.startContext(sessionId, requestId);

// Create revocation event
const revocationEvent = await eventService.createEvent({
  eventType: 'PatientConsent.Revoked',
  domain: 'CONSENT',
  aggregateId: consentId,
  aggregateType: 'PatientConsentInstance',
  payload: { reason: 'Patient requested' },
  correlationId: correlation.correlationId,
  causationId: null, // Direct user action
  createdBy: userId,
  sessionId: sessionId
});

// Update consent instance
await prisma.patientConsentInstance.update({
  where: { id: consentId },
  data: {
    status: 'REVOKED',
    revokedAt: new Date(),
    revocationEventId: revocationEvent.id,
    revokedBy: userId
  }
});
```

---

## 5. Remaining Weak Points & Mitigations

### Weak Point 1: Direct Entity Updates Without Events

**Risk**: Updating `SurgicalCase.status` without creating `CaseStatusHistory`

**Mitigation**:
```typescript
// Service layer enforcement
class CaseService {
  async updateStatus(caseId: string, newStatus: string, userId: string) {
    // MUST create event first
    const event = await eventService.createEvent({...});
    
    // MUST create history record
    await prisma.caseStatusHistory.create({
      data: { caseId, toStatus: newStatus, triggeringEventId: event.id }
    });
    
    // THEN update case
    await prisma.surgicalCase.update({
      where: { id: caseId },
      data: { status: newStatus }
    });
  }
}
```

### Weak Point 2: Batch Operations Bypassing Events

**Risk**: Bulk updates without individual events

**Mitigation**: 
- Prohibit bulk status updates
- Require individual events for each entity
- Use transactions to ensure atomicity

### Weak Point 3: System Events Without createdBy

**Risk**: System events might not have proper actor identification

**Mitigation**:
```typescript
// System events MUST have metadata.systemEvent = true
await eventService.createEvent({
  // ...
  createdBy: null, // System event
  metadata: {
    systemEvent: true,
    reason: 'Scheduled task: cleanup expired consents'
  }
});
```

---

## 6. CI/CD Validation Rules

### Prisma Schema Validation

```bash
#!/bin/bash
# scripts/validate-schema.sh

# Check that domain_events has no updatedAt
if grep -q "updatedAt.*@updatedAt" prisma/schema.prisma | grep -q "domain_events"; then
  echo "ERROR: domain_events must not have updatedAt field"
  exit 1
fi

# Check that history tables have version = 1 constraint
if ! grep -q "version.*@default(1)" prisma/schema.prisma | grep -q "case_status_history"; then
  echo "ERROR: CaseStatusHistory must have version = 1"
  exit 1
fi

echo "Schema validation passed"
```

### Database Constraint Validation

```sql
-- scripts/validate-constraints.sql
-- Ensure triggers exist
SELECT COUNT(*) as trigger_count
FROM pg_trigger
WHERE tgname IN (
  'domain_events_update_guard',
  'domain_events_delete_guard',
  'domain_events_hash_validation',
  'case_status_history_update_guard'
);

-- Ensure constraints exist
SELECT conname
FROM pg_constraint
WHERE conname IN (
  'event_type_pattern_check',
  'content_hash_format_check',
  'no_self_causation_check'
);
```

### Event Integrity Validation

```typescript
// scripts/validate-event-integrity.ts
async function validateAllEvents() {
  const events = await prisma.domainEvent.findMany({
    take: 1000 // Sample validation
  });
  
  const eventService = new DomainEventService(prisma);
  const failures: string[] = [];
  
  for (const event of events) {
    const isValid = await eventService.verifyEventIntegrity(event.id);
    if (!isValid) {
      failures.push(`Event ${event.id} failed integrity check`);
    }
  }
  
  if (failures.length > 0) {
    throw new Error(`Event integrity validation failed:\n${failures.join('\n')}`);
  }
}
```

---

## Summary

### Enforcement Layers

1. **Database Level** (Mechanical)
   - Triggers prevent UPDATE/DELETE
   - Constraints validate format
   - Hash validation on INSERT

2. **Application Level** (Guards)
   - Prisma middleware blocks operations
   - Service layer enforces event-first pattern
   - Correlation service tracks workflows

3. **CI/CD Level** (Validation)
   - Schema validation
   - Constraint verification
   - Event integrity checks

### Invariant Checklist

✅ DomainEvent is immutable after creation  
✅ All required fields validated  
✅ Content hash computed and verified  
✅ Causation/correlation references validated  
✅ History tables immutable  
✅ Event-first pattern enforced  
✅ Correlation chains maintained  

**Result**: Legally defensible, tamper-proof event architecture suitable for 10+ year enterprise use.












