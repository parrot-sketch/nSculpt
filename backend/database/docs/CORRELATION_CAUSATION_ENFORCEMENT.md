# Correlation & Causation Chain Enforcement
## Complete Event Replay and Legal Reconstruction Guarantees

## Overview

This document defines **mandatory correlation and causation rules** to guarantee complete event replay and legal reconstruction of surgical case timelines. Every event must be traceable to a workflow and identify what caused it.

---

## 1. Mandatory Rules

### Rule 1: Workflow Correlation (REQUIRED)

**Every user-initiated action MUST have a `correlationId`**

- Correlation ID is generated at **request start** (HTTP request, command handler)
- All events in the same workflow share the same `correlationId`
- Enables complete reconstruction of user session/workflow

**Validation**:
- Application MUST generate correlationId if missing
- Database constraint: `correlationId` can be NULL (for backward compatibility) but SHOULD be populated

### Rule 2: Causation Chains (REQUIRED for Event Chains)

**Every event triggered by another event MUST have `causationId`**

- Direct user actions: `causationId = NULL`
- System reactions: `causationId` = ID of triggering event
- Enables event chain reconstruction

**Validation**:
- If `causationId` is provided, it MUST reference existing DomainEvent
- Self-reference is forbidden: `causationId != id`
- Database enforces foreign key and self-reference check

### Rule 3: Session Tracking (REQUIRED)

**All events in same user session share `sessionId`**

- Session ID propagates through event chains
- Enables user session reconstruction
- Links events across multiple requests in same session

**Validation**:
- Application SHOULD populate `sessionId` for all user-initiated events
- System events: `sessionId = NULL` with metadata explanation

---

## 2. ID Generation and Propagation

### Correlation ID Generation

```typescript
// services/correlationService.ts
import { v4 as uuidv4 } from 'uuid';

export class CorrelationService {
  /**
   * Generate new correlation ID for workflow
   * Call at start of HTTP request or command handler
   */
  generateCorrelationId(): string {
    return uuidv4();
  }
  
  /**
   * Get correlation ID from request context
   * Checks: X-Correlation-ID header, context, or generates new
   */
  getOrCreateCorrelationId(context: RequestContext): string {
    // 1. Check HTTP header
    const headerId = context.headers['x-correlation-id'];
    if (headerId) return headerId;
    
    // 2. Check request context
    if (context.correlationId) return context.correlationId;
    
    // 3. Generate new
    return this.generateCorrelationId();
  }
}
```

### Causation ID Propagation

```typescript
// Middleware pattern for event chains
export class EventChainMiddleware {
  private causationId: string | null = null;
  
  /**
   * Set causation ID after creating event
   * Next event in chain will use this as causationId
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
  
  /**
   * Get current causation ID
   */
  getCausation(): string | null {
    return this.causationId;
  }
}
```

### Session ID Propagation

```typescript
// Extract session ID from request
export function extractSessionId(req: Request): string | null {
  // From JWT token
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    const decoded = jwt.decode(token) as any;
    return decoded?.sessionId || null;
  }
  
  // From cookie
  return req.cookies?.sessionId || null;
}
```

---

## 3. Service-Layer Propagation Patterns

### Pattern 1: HTTP Request Handler

```typescript
// Express.js example
app.post('/api/cases/:id/start', async (req, res) => {
  // 1. Extract correlation context
  const correlationId = correlationService.getOrCreateCorrelationId(req);
  const sessionId = extractSessionId(req);
  const requestId = req.headers['x-request-id'] || uuidv4();
  
  // 2. Set context for this request
  correlationService.setContext({
    correlationId,
    sessionId,
    requestId,
    causationId: null // User action, no causation
  });
  
  try {
    // 3. Process request (all events will use context)
    const caseId = req.params.id;
    await caseService.startCase(caseId, req.user.id);
    
    res.json({ success: true });
  } finally {
    // 4. Clear context
    correlationService.clearContext();
  }
});
```

### Pattern 2: Event-Driven Service

```typescript
// Case service with event propagation
export class CaseService {
  async startCase(caseId: string, userId: string): Promise<void> {
    const context = correlationService.getContext();
    
    // 1. Create status change event (user-initiated)
    const statusEvent = await eventService.createEvent({
      eventType: 'SurgicalCase.StatusChanged',
      domain: 'THEATER',
      aggregateId: caseId,
      aggregateType: 'SurgicalCase',
      payload: { fromStatus: 'SCHEDULED', toStatus: 'IN_PROGRESS' },
      correlationId: context.correlationId,
      causationId: null, // Direct user action
      createdBy: userId,
      sessionId: context.sessionId,
      requestId: context.requestId
    });
    
    // 2. Create status history
    await prisma.caseStatusHistory.create({
      data: {
        caseId,
        fromStatus: 'SCHEDULED',
        toStatus: 'IN_PROGRESS',
        triggeringEventId: statusEvent.id,
        changedBy: userId
      }
    });
    
    // 3. Update case status
    await prisma.surgicalCase.update({
      where: { id: caseId },
      data: { status: 'IN_PROGRESS', actualStartAt: new Date() }
    });
    
    // 4. Set causation for subsequent events
    correlationService.setCausation(statusEvent.id);
    
    // 5. Trigger inventory allocation (system reaction)
    await this.allocateInventoryForCase(caseId, userId);
    
    // 6. Clear causation for next user action
    correlationService.clearCausation();
  }
  
  private async allocateInventoryForCase(caseId: string, userId: string): Promise<void> {
    const context = correlationService.getContext();
    const causationId = context.causationId; // From case start event
    
    // This event is CAUSED by case start
    const inventoryEvent = await eventService.createEvent({
      eventType: 'InventoryItem.Reserved',
      domain: 'INVENTORY',
      aggregateId: itemId,
      aggregateType: 'InventoryItem',
      payload: { caseId, quantity: 5 },
      correlationId: context.correlationId, // Same workflow
      causationId: causationId, // Caused by case start
      createdBy: userId,
      sessionId: context.sessionId
    });
    
    // ... create inventory transaction
  }
}
```

### Pattern 3: Event Handler (Event Sourcing)

```typescript
// Event handler for inventory consumption
export class InventoryEventHandler {
  async handleCaseCompleted(event: DomainEvent): Promise<void> {
    const context = correlationService.getContext();
    
    // This handler is triggered by CaseCompleted event
    // So causationId = event.id
    const consumptionEvent = await eventService.createEvent({
      eventType: 'InventoryItem.Consumed',
      domain: 'INVENTORY',
      aggregateId: itemId,
      aggregateType: 'InventoryItem',
      payload: { caseId: event.aggregateId, quantity: 2 },
      correlationId: event.correlationId, // Preserve correlation
      causationId: event.id, // Caused by case completion
      createdBy: event.createdBy, // Preserve actor
      sessionId: event.sessionId // Preserve session
    });
    
    // ... process consumption
  }
}
```

---

## 4. Validation Middleware Logic

### Request Validation Middleware

```typescript
// middleware/correlationValidation.ts
export const correlationValidationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Ensure correlation ID exists
  const correlationId = correlationService.getOrCreateCorrelationId(req);
  
  // Set in response headers for tracing
  res.setHeader('X-Correlation-ID', correlationId);
  
  // Attach to request for downstream use
  req.correlationId = correlationId;
  
  next();
};
```

### Event Creation Validation

```typescript
// In DomainEventService.createEvent()
async createEvent(params: CreateEventParams): Promise<DomainEvent> {
  // 1. Validate correlation ID format
  if (params.correlationId && !isValidUUID(params.correlationId)) {
    throw new Error(`Invalid correlationId format: ${params.correlationId}`);
  }
  
  // 2. Validate causation ID references existing event
  if (params.causationId) {
    const causationEvent = await this.prisma.domainEvent.findUnique({
      where: { id: params.causationId }
    });
    
    if (!causationEvent) {
      throw new Error(`Causation event ${params.causationId} not found`);
    }
    
    // Validate causation event is in same correlation (best practice)
    if (params.correlationId && causationEvent.correlationId !== params.correlationId) {
      console.warn(
        `Causation event ${params.causationId} has different correlationId. ` +
        `Expected: ${params.correlationId}, Got: ${causationEvent.correlationId}`
      );
    }
  }
  
  // 3. Ensure correlation ID for user-initiated events
  if (params.createdBy && !params.correlationId) {
    console.warn(
      `User-initiated event missing correlationId. Event: ${params.eventType}, User: ${params.createdBy}`
    );
    // Auto-generate if missing (fail-safe)
    params.correlationId = correlationService.generateCorrelationId();
  }
  
  // ... create event
}
```

---

## 5. Example Event Chains

### Example 1: Complete Surgical Case Workflow

```
Request: POST /api/cases/123/start
Correlation ID: abc-123
Session ID: sess-456

1. User Action: Start Case
   Event: SurgicalCase.StatusChanged
   - correlationId: abc-123
   - causationId: NULL (user action)
   - sessionId: sess-456
   - createdBy: user-789

2. System Reaction: Reserve Inventory (caused by #1)
   Event: InventoryItem.Reserved
   - correlationId: abc-123 (same workflow)
   - causationId: <event-1-id> (caused by case start)
   - sessionId: sess-456 (preserved)
   - createdBy: user-789 (preserved)

3. System Reaction: Create Billing Charge (caused by #1)
   Event: BillLineItem.Created
   - correlationId: abc-123 (same workflow)
   - causationId: <event-1-id> (caused by case start)
   - sessionId: sess-456 (preserved)
   - createdBy: user-789 (preserved)

4. User Action: Complete Case
   Event: SurgicalCase.StatusChanged
   - correlationId: abc-123 (same workflow, same session)
   - causationId: NULL (new user action)
   - sessionId: sess-456
   - createdBy: user-789

5. System Reaction: Consume Inventory (caused by #4)
   Event: InventoryItem.Consumed
   - correlationId: abc-123 (same workflow)
   - causationId: <event-4-id> (caused by case completion)
   - sessionId: sess-456 (preserved)
   - createdBy: user-789 (preserved)
```

### Example 2: Consent Revocation

```
Request: POST /api/consents/456/revoke
Correlation ID: xyz-789
Session ID: sess-456

1. User Action: Revoke Consent
   Event: PatientConsent.Revoked
   - correlationId: xyz-789
   - causationId: NULL (user action)
   - sessionId: sess-456
   - createdBy: user-789

2. System Reaction: Update Related Records (caused by #1)
   Event: MedicalRecord.Updated
   - correlationId: xyz-789 (same workflow)
   - causationId: <event-1-id> (caused by revocation)
   - sessionId: sess-456 (preserved)
   - createdBy: user-789 (preserved)
```

### Example 3: Record Merge

```
Request: POST /api/records/merge
Correlation ID: merge-001
Session ID: sess-123

1. User Action: Merge Records
   Event: MedicalRecord.Merged
   - correlationId: merge-001
   - causationId: NULL (user action)
   - sessionId: sess-123
   - createdBy: user-456

2. System Reaction: Update Source Record (caused by #1)
   Event: MedicalRecord.StatusChanged
   - correlationId: merge-001 (same workflow)
   - causationId: <event-1-id> (caused by merge)
   - sessionId: sess-123 (preserved)
   - createdBy: user-456 (preserved)

3. System Reaction: Consolidate Notes (caused by #1)
   Event: ClinicalNote.Consolidated
   - correlationId: merge-001 (same workflow)
   - causationId: <event-1-id> (caused by merge)
   - sessionId: sess-123 (preserved)
   - createdBy: user-456 (preserved)
```

---

## 6. Failure Behavior

### Missing Correlation ID

**Scenario**: User-initiated event missing correlationId

**Behavior**:
- Application auto-generates correlationId (fail-safe)
- Log warning for monitoring
- Event is created successfully
- Alert sent to monitoring system

**Code**:
```typescript
if (params.createdBy && !params.correlationId) {
  logger.warn('Missing correlationId for user event', {
    eventType: params.eventType,
    userId: params.createdBy
  });
  params.correlationId = correlationService.generateCorrelationId();
}
```

### Invalid Causation ID

**Scenario**: Causation ID references non-existent event

**Behavior**:
- **REJECT** event creation
- Return error to caller
- Event is NOT created
- Transaction rolled back

**Code**:
```typescript
if (params.causationId) {
  const causationEvent = await this.prisma.domainEvent.findUnique({
    where: { id: params.causationId }
  });
  
  if (!causationEvent) {
    throw new Error(
      `Invalid causationId: ${params.causationId}. Event does not exist.`
    );
  }
}
```

### Broken Causation Chain

**Scenario**: Causation event has different correlationId

**Behavior**:
- **WARN** but allow (cross-workflow causation can be valid)
- Log warning for monitoring
- Event is created successfully
- Alert sent if pattern detected

**Code**:
```typescript
if (params.causationId && params.correlationId) {
  const causationEvent = await this.prisma.domainEvent.findUnique({
    where: { id: params.causationId },
    select: { correlationId: true }
  });
  
  if (causationEvent?.correlationId !== params.correlationId) {
    logger.warn('Causation chain crosses workflows', {
      eventId: params.causationId,
      expectedCorrelation: params.correlationId,
      actualCorrelation: causationEvent.correlationId
    });
  }
}
```

---

## 7. Event Replay and Reconstruction

### Reconstruct Workflow Timeline

```sql
-- Get complete workflow timeline
WITH RECURSIVE event_chain AS (
  -- Start with root event (no causation)
  SELECT id, event_type, occurred_at, causation_id, correlation_id, payload
  FROM domain_events
  WHERE correlation_id = '<correlationId>'
    AND causation_id IS NULL
  
  UNION ALL
  
  -- Follow causation chain
  SELECT e.id, e.event_type, e.occurred_at, e.causation_id, e.correlation_id, e.payload
  FROM domain_events e
  INNER JOIN event_chain ec ON e.causation_id = ec.id
  WHERE e.correlation_id = '<correlationId>'
)
SELECT * FROM event_chain
ORDER BY occurred_at ASC;
```

### Reconstruct Case Timeline

```sql
-- Get all events related to a case
SELECT 
  de.id,
  de.event_type,
  de.domain,
  de.occurred_at,
  de.correlation_id,
  de.causation_id,
  de.payload,
  de.created_by
FROM domain_events de
WHERE de.aggregate_id = '<caseId>'
  AND de.aggregate_type = 'SurgicalCase'
ORDER BY de.occurred_at ASC;
```

### Find Event Chain Root

```sql
-- Find root event of a causation chain
WITH RECURSIVE causation_chain AS (
  SELECT id, event_type, causation_id, 0 as depth
  FROM domain_events
  WHERE id = '<eventId>'
  
  UNION ALL
  
  SELECT e.id, e.event_type, e.causation_id, cc.depth + 1
  FROM domain_events e
  INNER JOIN causation_chain cc ON e.id = cc.causation_id
)
SELECT * FROM causation_chain
WHERE causation_id IS NULL
ORDER BY depth DESC
LIMIT 1;
```

---

## 8. Validation Queries

### Verify Workflow Completeness

```sql
-- Check for events missing correlation ID
SELECT COUNT(*) as missing_correlation
FROM domain_events
WHERE created_by IS NOT NULL
  AND correlation_id IS NULL
  AND occurred_at > NOW() - INTERVAL '24 hours';
```

### Verify Causation Chains

```sql
-- Find broken causation chains
SELECT e1.id, e1.event_type, e1.causation_id
FROM domain_events e1
WHERE e1.causation_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM domain_events e2
    WHERE e2.id = e1.causation_id
  );
```

### Verify Session Integrity

```sql
-- Check for events with inconsistent session IDs in same correlation
SELECT correlation_id, COUNT(DISTINCT session_id) as session_count
FROM domain_events
WHERE correlation_id IS NOT NULL
  AND session_id IS NOT NULL
GROUP BY correlation_id
HAVING COUNT(DISTINCT session_id) > 1;
```

---

## Summary

### Mandatory Rules

✅ **Correlation ID**: Required for user-initiated events  
✅ **Causation ID**: Required for event chains  
✅ **Session ID**: Required for user events  
✅ **Validation**: Database + application level  

### Propagation Patterns

✅ **Request Handler**: Extract and set context  
✅ **Service Layer**: Preserve context through chains  
✅ **Event Handlers**: Preserve correlation, set causation  

### Failure Handling

✅ **Missing Correlation**: Auto-generate with warning  
✅ **Invalid Causation**: Reject event creation  
✅ **Broken Chains**: Warn but allow (cross-workflow valid)  

### Result

**Complete event replay and legal reconstruction guaranteed** for all surgical case workflows, consent operations, and record merges.












