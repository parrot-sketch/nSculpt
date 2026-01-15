# Architecture Consistency Analysis
## Should All Domains Follow Event-Driven, Append-Only Pattern?

## Executive Summary

**Recommendation**: Apply event-driven patterns **selectively** based on regulatory requirements and legal defensibility needs. Not all domains need the same strict immutability as Inventory and Billing.

---

## Current State Analysis

### ✅ Already Event-Driven (or Close)
- **ClinicalNote**: Append-only (amendments create new records) ✅
- **PatientConsentAcknowledgement**: Immutable snapshots ✅
- **InventoryTransaction**: Strict append-only ✅
- **BillLineItem**: Strict append-only ✅
- **BillingAdjustment**: Strict append-only ✅

### ⚠️ Partially Event-Driven
- **UserRoleAssignment**: Has revocation tracking but allows updates
- **SurgicalCase**: Status transitions without event anchoring
- **TheaterReservation**: Status changes without event anchoring
- **PatientConsentInstance**: Can be revoked but revocation tracked

### ❌ Not Event-Driven
- **User**: Identity updates (password, email, etc.)
- **Role**: Permission changes
- **MedicalRecord**: Identity data updates (status, mergedInto)
- **ConsentTemplate**: Version changes
- **Department/OperatingTheater**: Administrative updates

---

## Recommendation by Domain

### 🔴 CRITICAL: Must Be Event-Driven (High Regulatory Risk)

#### 1. SurgicalCase Status Transitions
**Why**: Legal defensibility - case status changes (SCHEDULED → IN_PROGRESS → COMPLETED) are clinically significant.

**Recommendation**: 
- Add `triggeringEventId` to status changes
- Track all status transitions via events
- Store status history in append-only `CaseStatusHistory` table

```prisma
model CaseStatusHistory {
  id          String   @id @default(uuid())
  caseId      String   @db.Uuid
  fromStatus  String?  @db.VarChar(50)
  toStatus    String   @db.VarChar(50)
  triggeredByEventId String @db.Uuid // DomainEvent
  changedAt   DateTime @default(now())
  changedBy   String?  @db.Uuid
  reason      String?  @db.Text
  
  // Relations
  case        SurgicalCase @relation(...)
  triggeringEvent DomainEvent @relation(...)
  
  @@index([caseId])
  @@index([triggeringEventId])
}
```

#### 2. Consent Revocation
**Why**: Legal requirement - consent revocation must be immutable and traceable.

**Recommendation**:
- Keep current design (already tracks revocation)
- Add `triggeringEventId` to revocation
- Ensure revocation cannot be undone

#### 3. MedicalRecord Merging
**Why**: Legal requirement - record merges must be auditable and reversible for legal discovery.

**Recommendation**:
- Track merges via `triggeringEventId`
- Keep `mergedInto` field but make merge operation event-anchored
- Create append-only `RecordMergeHistory` table

---

### 🟡 IMPORTANT: Should Be Event-Driven (Audit Requirements)

#### 4. UserRoleAssignment Changes
**Why**: Security audit - role assignments affect access control and HIPAA compliance.

**Current**: Already tracks revocation, but role changes could be event-anchored.

**Recommendation**:
- Add `triggeringEventId` to UserRoleAssignment creation
- Role revocations already tracked (keep as-is)
- Consider role change history if role modifications are needed

#### 5. TheaterReservation Status Changes
**Why**: Operational audit - reservation cancellations/changes affect scheduling integrity.

**Recommendation**:
- Add `triggeringEventId` to status changes
- Track reservation lifecycle via events
- Current unique constraint prevents double-booking (keep)

---

### 🟢 OPTIONAL: Current Design Acceptable (Low Regulatory Risk)

#### 6. User Identity Updates
**Why**: Administrative - password changes, email updates are operational.

**Recommendation**: 
- Keep current design with `updatedAt` and `updatedBy`
- Password changes already tracked (`passwordChangedAt`)
- Consider event anchoring for security-sensitive changes (password, email)

#### 7. Role/Permission Changes
**Why**: Configuration - roles and permissions are administrative configurations.

**Recommendation**:
- Keep current design (version tracking sufficient)
- No need for strict immutability
- Version field provides audit trail

#### 8. MedicalRecord Identity Updates
**Why**: Data quality - correcting DOB, gender, etc. is operational.

**Recommendation**:
- Keep current design with version tracking
- Consider event anchoring only for status changes (ACTIVE → ARCHIVED → MERGED)

#### 9. Department/Theater Updates
**Why**: Administrative - operational configuration changes.

**Recommendation**:
- Current design acceptable (version tracking)
- No regulatory requirement for strict immutability

---

## Implementation Strategy

### Phase 1: Critical Domains (Do First)

1. **SurgicalCase Status Tracking**
   - Add `CaseStatusHistory` table
   - Event-anchor all status transitions
   - Update application to emit events on status changes

2. **Consent Revocation Anchoring**
   - Add `triggeringEventId` to `PatientConsentInstance.revokedAt` flow
   - Ensure revocation events are created

3. **Record Merge Tracking**
   - Add `RecordMergeHistory` table
   - Event-anchor merge operations

### Phase 2: Important Domains (Do Next)

4. **UserRoleAssignment Events**
   - Add `triggeringEventId` to assignments
   - Track role grant/revoke via events

5. **TheaterReservation Events**
   - Add `ReservationStatusHistory` table
   - Event-anchor status changes

### Phase 3: Optional Enhancements (Future)

6. **User Security Events**
   - Event-anchor password changes
   - Event-anchor email changes
   - Track security-sensitive updates

---

## Hybrid Approach: Recommended

**Not all domains need strict immutability.** Use a **hybrid approach**:

### Strict Immutability (Append-Only)
- ✅ Clinical data (notes, amendments)
- ✅ Billing charges and adjustments
- ✅ Inventory transactions
- ✅ Consent acknowledgements
- ✅ Case status history (add this)

### Event-Anchored Updates (Versioned with Events)
- ✅ Role assignments (track via events)
- ✅ Reservation status changes (track via events)
- ✅ Consent revocation (track via events)
- ✅ Record merges (track via events)

### Standard Versioning (Current Design OK)
- ✅ User identity updates (version tracking sufficient)
- ✅ Role/permission definitions (version tracking sufficient)
- ✅ Department/theater configuration (version tracking sufficient)
- ✅ MedicalRecord identity data (version tracking sufficient)

---

## Benefits of Hybrid Approach

1. **Regulatory Compliance**: Critical operations are event-driven
2. **Operational Flexibility**: Administrative updates remain practical
3. **Performance**: Not every update needs event sourcing overhead
4. **Audit Trail**: Complete history for legally significant changes
5. **Cost**: Event storage only for high-value audit requirements

---

## Decision Matrix

| Domain Entity | Current State | Recommendation | Priority | Rationale |
|--------------|---------------|----------------|----------|-----------|
| **ClinicalNote** | ✅ Append-only | Keep as-is | N/A | Already compliant |
| **SurgicalCase** | ⚠️ Status updates | Add status history + events | 🔴 Critical | Legal defensibility |
| **PatientConsent** | ✅ Immutable snapshots | Add revocation events | 🔴 Critical | Legal requirement |
| **BillLineItem** | ✅ Append-only | Keep as-is | N/A | Already compliant |
| **InventoryTransaction** | ✅ Append-only | Keep as-is | N/A | Already compliant |
| **UserRoleAssignment** | ⚠️ Has revocation | Add event anchoring | 🟡 Important | Security audit |
| **TheaterReservation** | ⚠️ Status updates | Add status history | 🟡 Important | Operational audit |
| **MedicalRecord** | ❌ Identity updates | Keep versioning, add merge events | 🟡 Important | Legal discovery |
| **User** | ❌ Identity updates | Keep current design | 🟢 Optional | Operational |
| **Role/Permission** | ❌ Config updates | Keep current design | 🟢 Optional | Administrative |

---

## Implementation Example: Case Status History

```prisma
// Add to theater.prisma

model CaseStatusHistory {
  id          String   @id @default(uuid()) @db.Uuid
  caseId      String   @db.Uuid
  fromStatus  String?  @db.VarChar(50)
  toStatus    String   @db.VarChar(50)
  
  // Event anchoring
  triggeringEventId String @db.Uuid // DomainEvent that caused status change
  
  // Context
  reason      String?  @db.Text
  changedBy   String?  @db.Uuid
  
  // Audit (immutable)
  changedAt   DateTime @default(now()) @db.Timestamptz(6)
  version     Int      @default(1) // Always 1 - immutable
  
  // Relations
  case        SurgicalCase @relation(fields: [caseId], references: [id], onDelete: Cascade)
  triggeringEvent DomainEvent @relation("CaseStatusEvent", fields: [triggeringEventId], references: [id])
  
  @@index([caseId])
  @@index([triggeringEventId])
  @@index([changedAt])
  @@map("case_status_history")
}

// Update SurgicalCase to remove direct status updates
// Status should be derived from latest CaseStatusHistory
```

**Application Pattern**:
```typescript
// Instead of: case.status = 'COMPLETED'
// Do this:
const event = await createDomainEvent({
  eventType: 'SurgicalCase.StatusChanged',
  domain: 'THEATER',
  aggregateId: case.id,
  payload: { fromStatus: 'IN_PROGRESS', toStatus: 'COMPLETED' }
});

await prisma.caseStatusHistory.create({
  data: {
    caseId: case.id,
    fromStatus: 'IN_PROGRESS',
    toStatus: 'COMPLETED',
    triggeringEventId: event.id
  }
});
```

---

## Summary

**Answer**: Not all domains need strict immutability. Use a **pragmatic hybrid approach**:

✅ **Strict Event-Driven** (critical regulatory/compliance):
- Clinical notes (already done)
- Billing (already done)
- Inventory (already done)
- Case status transitions (add this)

✅ **Event-Anchored Updates** (important audit requirements):
- Role assignments (enhance)
- Reservation status (enhance)
- Consent revocation (enhance)
- Record merges (add)

✅ **Standard Versioning** (sufficient for operational):
- User identity
- Role/permission definitions
- Department/theater config
- MedicalRecord identity data

**Key Principle**: Apply strict immutability where **legal defensibility** and **regulatory compliance** require it. Use lighter-weight event anchoring for **audit requirements**, and standard versioning for **operational** needs.

---

## Next Steps

1. **Immediate**: Add `CaseStatusHistory` to theater.prisma
2. **Immediate**: Add event anchoring to consent revocation
3. **Short-term**: Add `RecordMergeHistory` to medical_records.prisma
4. **Short-term**: Enhance UserRoleAssignment with event anchoring
5. **Long-term**: Consider event anchoring for security-sensitive user updates

This hybrid approach provides **optimal balance** between regulatory compliance, operational flexibility, and system performance.

