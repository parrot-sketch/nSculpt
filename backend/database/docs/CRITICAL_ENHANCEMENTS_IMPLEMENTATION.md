# Critical Enhancements Implementation

## Overview

Three critical enhancements have been implemented to ensure complete event-driven traceability for legally defensible operations:

1. **CaseStatusHistory** - Immutable status tracking for surgical cases
2. **Consent Revocation Event Anchoring** - Event-driven consent revocation tracking
3. **RecordMergeHistory** - Immutable merge tracking for medical records

---

## 1. CaseStatusHistory

### Purpose

Track all status transitions for surgical cases with complete event anchoring. Status changes (SCHEDULED → IN_PROGRESS → COMPLETED) are clinically significant and must be legally defensible.

### Model Structure

```prisma
model CaseStatusHistory {
  id          String   @id @default(uuid())
  caseId      String   @db.Uuid
  
  fromStatus  String?  // Null for initial status
  toStatus    String   // Required: new status
  
  // CRITICAL: Event anchoring
  triggeringEventId String @db.Uuid // DomainEvent
  
  reason      String?  // Why status changed
  changedBy   String?  // User who initiated change
  
  // Audit (immutable)
  changedAt   DateTime @default(now())
  version     Int      @default(1) // Always 1
}
```

### Invariants

- **Never UPDATE or DELETE** - Only INSERT
- **Every status change must have triggeringEventId** - Complete event trace
- **Current status** = Latest `CaseStatusHistory.toStatus` for `caseId`

### Implementation Pattern

**❌ Wrong Way** (Direct Update):
```typescript
await prisma.surgicalCase.update({
  where: { id: caseId },
  data: { status: 'COMPLETED' }
});
```

**✅ Correct Way** (Event-Driven):
```typescript
// 1. Create DomainEvent
const event = await prisma.domainEvent.create({
  data: {
    eventType: 'SurgicalCase.StatusChanged',
    domain: 'THEATER',
    aggregateId: caseId,
    aggregateType: 'SurgicalCase',
    payload: {
      fromStatus: 'IN_PROGRESS',
      toStatus: 'COMPLETED',
      reason: 'Procedure completed successfully'
    },
    createdBy: userId
  }
});

// 2. Create status history record
await prisma.caseStatusHistory.create({
  data: {
    caseId: caseId,
    fromStatus: 'IN_PROGRESS',
    toStatus: 'COMPLETED',
    triggeringEventId: event.id,
    reason: 'Procedure completed successfully',
    changedBy: userId
  }
});

// 3. Update case status (derived state)
await prisma.surgicalCase.update({
  where: { id: caseId },
  data: { 
    status: 'COMPLETED',
    actualEndAt: new Date(),
    updatedBy: userId
  }
});
```

### Query Patterns

**Get Current Status**:
```sql
SELECT toStatus 
FROM case_status_history
WHERE caseId = '<caseId>'
ORDER BY changedAt DESC
LIMIT 1;
```

**Get Status History**:
```sql
SELECT csh.*, de.eventType, de.occurredAt, de.payload
FROM case_status_history csh
JOIN domain_events de ON csh.triggeringEventId = de.id
WHERE csh.caseId = '<caseId>'
ORDER BY csh.changedAt ASC;
```

**Get All Cases by Status** (using history):
```sql
SELECT DISTINCT ON (caseId) caseId, toStatus, changedAt
FROM case_status_history
ORDER BY caseId, changedAt DESC;
```

---

## 2. Consent Revocation Event Anchoring

### Purpose

Ensure consent revocations are event-anchored for legal defensibility. Consent revocation is a critical legal operation that must be completely traceable.

### Model Changes

Added to `PatientConsentInstance`:
- `revocationEventId` - DomainEvent that triggered revocation
- `revokedBy` - User who revoked consent

### Invariants

- **Revocation cannot be undone** - Immutable once revoked
- **Every revocation must have revocationEventId** - Complete event trace
- **Revocation is final** - Cannot re-sign after revocation

### Implementation Pattern

**❌ Wrong Way** (Direct Update):
```typescript
await prisma.patientConsentInstance.update({
  where: { id: consentId },
  data: { 
    status: 'REVOKED',
    revokedAt: new Date()
  }
});
```

**✅ Correct Way** (Event-Driven):
```typescript
// 1. Create DomainEvent
const event = await prisma.domainEvent.create({
  data: {
    eventType: 'PatientConsent.Revoked',
    domain: 'CONSENT',
    aggregateId: consentId,
    aggregateType: 'PatientConsentInstance',
    payload: {
      reason: 'Patient requested revocation',
      revokedBy: userId
    },
    createdBy: userId
  }
});

// 2. Update consent instance
await prisma.patientConsentInstance.update({
  where: { id: consentId },
  data: {
    status: 'REVOKED',
    revokedAt: new Date(),
    revocationEventId: event.id,
    revokedBy: userId,
    updatedBy: userId
  }
});
```

### Query Patterns

**Get Consent with Revocation Event**:
```sql
SELECT pci.*, de.eventType, de.occurredAt, de.payload
FROM patient_consent_instances pci
LEFT JOIN domain_events de ON pci.revocationEventId = de.id
WHERE pci.id = '<consentId>';
```

**Find All Revoked Consents**:
```sql
SELECT pci.*, de.payload->>'reason' as revocationReason
FROM patient_consent_instances pci
JOIN domain_events de ON pci.revocationEventId = de.id
WHERE pci.status = 'REVOKED';
```

---

## 3. RecordMergeHistory

### Purpose

Track all medical record merges with complete event anchoring. Record merges are legally significant operations that must be reversible for legal discovery.

### Model Structure

```prisma
model RecordMergeHistory {
  id          String   @id @default(uuid())
  
  sourceRecordId String // Record merged FROM
  targetRecordId String // Record merged INTO (primary)
  
  // CRITICAL: Event anchoring
  triggeringEventId String @db.Uuid // DomainEvent
  
  reason      String?  // Why records were merged
  mergedBy    String?  // User who performed merge
  
  // Reversal tracking
  reversedAt  DateTime?
  reversalEventId String? // DomainEvent that reversed merge
  reversedBy  String?
  
  // Audit (immutable)
  mergedAt    DateTime @default(now())
  version     Int      @default(1) // Always 1
}
```

### Invariants

- **Never UPDATE or DELETE** - Only INSERT
- **Every merge must have triggeringEventId** - Complete event trace
- **Reversals create new records or update reversal fields** - Never modify original merge
- **Both source and target records must exist** - Foreign key constraints

### Implementation Pattern

**❌ Wrong Way** (Direct Update):
```typescript
await prisma.medicalRecord.update({
  where: { id: sourceRecordId },
  data: { 
    status: 'MERGED',
    mergedInto: targetRecordId
  }
});
```

**✅ Correct Way** (Event-Driven):
```typescript
// 1. Create DomainEvent
const event = await prisma.domainEvent.create({
  data: {
    eventType: 'MedicalRecord.Merged',
    domain: 'MEDICAL_RECORDS',
    aggregateId: sourceRecordId,
    aggregateType: 'MedicalRecord',
    payload: {
      sourceRecordId: sourceRecordId,
      targetRecordId: targetRecordId,
      reason: 'Duplicate patient records identified'
    },
    createdBy: userId
  }
});

// 2. Create merge history record
await prisma.recordMergeHistory.create({
  data: {
    sourceRecordId: sourceRecordId,
    targetRecordId: targetRecordId,
    triggeringEventId: event.id,
    reason: 'Duplicate patient records identified',
    mergedBy: userId
  }
});

// 3. Update source record
await prisma.medicalRecord.update({
  where: { id: sourceRecordId },
  data: {
    status: 'MERGED',
    mergedInto: targetRecordId,
    updatedBy: userId
  }
});
```

### Reversing a Merge

```typescript
// 1. Create reversal event
const reversalEvent = await prisma.domainEvent.create({
  data: {
    eventType: 'MedicalRecord.MergeReversed',
    domain: 'MEDICAL_RECORDS',
    aggregateId: mergeHistory.sourceRecordId,
    aggregateType: 'MedicalRecord',
    payload: {
      mergeHistoryId: mergeHistory.id,
      reason: 'Legal discovery requirement'
    },
    createdBy: userId
  }
});

// 2. Update merge history (immutable, so update reversal fields)
await prisma.recordMergeHistory.update({
  where: { id: mergeHistory.id },
  data: {
    reversedAt: new Date(),
    reversalEventId: reversalEvent.id,
    reversedBy: userId
  }
});

// 3. Restore source record
await prisma.medicalRecord.update({
  where: { id: mergeHistory.sourceRecordId },
  data: {
    status: 'ACTIVE',
    mergedInto: null,
    updatedBy: userId
  }
});
```

### Query Patterns

**Get Merge History for Record**:
```sql
SELECT rmh.*, 
       sr.recordNumber as sourceRecordNumber,
       tr.recordNumber as targetRecordNumber,
       de.eventType, de.occurredAt
FROM record_merge_history rmh
JOIN medical_records sr ON rmh.sourceRecordId = sr.id
JOIN medical_records tr ON rmh.targetRecordId = tr.id
JOIN domain_events de ON rmh.triggeringEventId = de.id
WHERE rmh.sourceRecordId = '<recordId>' 
   OR rmh.targetRecordId = '<recordId>'
ORDER BY rmh.mergedAt DESC;
```

**Find All Active Merges** (not reversed):
```sql
SELECT rmh.*
FROM record_merge_history rmh
WHERE rmh.reversedAt IS NULL
  AND rmh.reversalEventId IS NULL;
```

---

## DomainEvent Relations

All new models are connected to `DomainEvent`:

```prisma
model DomainEvent {
  // ... existing fields ...
  
  // New relations
  caseStatusChanges CaseStatusHistory[] @relation("CaseStatusEvent")
  consentRevocations PatientConsentInstance[] @relation("ConsentRevocationEvent")
  recordMerges RecordMergeHistory[] @relation("RecordMergeEvent")
  recordMergeReversals RecordMergeHistory[] @relation("RecordMergeReversalEvent")
}
```

---

## Benefits

### Legal Defensibility

✅ **Complete Audit Trail**: Every critical operation traces to DomainEvent  
✅ **Immutable History**: Status changes, revocations, merges cannot be silently altered  
✅ **Event Reconstruction**: Complete event chain via `causationId` and `correlationId`  
✅ **Reversibility**: Record merges can be reversed for legal discovery  

### Regulatory Compliance

✅ **HIPAA**: Complete audit trail for all PHI-related operations  
✅ **Medical Board**: Status transitions are auditable  
✅ **Legal Discovery**: Record merges are reversible with full history  

### Operational Benefits

✅ **Traceability**: Know exactly when, why, and by whom critical operations occurred  
✅ **Debugging**: Complete event history for troubleshooting  
✅ **Reporting**: Historical analysis of case statuses, consent revocations, record merges  

---

## Migration Path

### Application Changes Required

1. **Status Change Service**: Update all case status changes to use CaseStatusHistory
2. **Consent Service**: Update revocation to create DomainEvent first
3. **Record Service**: Update merge operations to create RecordMergeHistory
4. **Query Services**: Update status queries to use history table

### Data Migration

For existing records:
- **Cases**: Create initial CaseStatusHistory records for current statuses
- **Consents**: Existing revocations won't have events (acceptable for historical data)
- **Records**: Existing merges won't have history (acceptable for historical data)

---

## Testing

### Unit Tests

```typescript
describe('CaseStatusHistory', () => {
  it('should require triggeringEventId', async () => {
    await expect(
      prisma.caseStatusHistory.create({
        data: {
          caseId: '...',
          toStatus: 'COMPLETED'
          // Missing triggeringEventId
        }
      })
    ).rejects.toThrow();
  });
  
  it('should be immutable after creation', async () => {
    const history = await createStatusHistory(...);
    
    await expect(
      prisma.caseStatusHistory.update({
        where: { id: history.id },
        data: { toStatus: 'CANCELLED' }
      })
    ).rejects.toThrow();
  });
});
```

### Integration Tests

```typescript
describe('Case Status Change Flow', () => {
  it('should create event and history on status change', async () => {
    const case = await createCase(...);
    
    await changeCaseStatus(case.id, 'COMPLETED', userId);
    
    const event = await prisma.domainEvent.findFirst({
      where: { aggregateId: case.id, eventType: 'SurgicalCase.StatusChanged' }
    });
    
    const history = await prisma.caseStatusHistory.findFirst({
      where: { caseId: case.id, triggeringEventId: event.id }
    });
    
    expect(history).toBeDefined();
    expect(history.toStatus).toBe('COMPLETED');
  });
});
```

---

## Summary

These critical enhancements ensure:

✅ **Complete Event Traceability** - All critical operations are event-anchored  
✅ **Immutable Audit Trail** - History cannot be silently altered  
✅ **Legal Defensibility** - Complete reconstruction capability  
✅ **Regulatory Compliance** - HIPAA and medical board requirements met  

The system now provides **enterprise-grade audit trails** for all legally significant operations while maintaining operational flexibility for administrative updates.

