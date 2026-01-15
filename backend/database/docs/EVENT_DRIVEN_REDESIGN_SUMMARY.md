# Event-Driven Inventory & Billing Redesign - Summary

## Overview

The Inventory and Billing domains have been completely redesigned with a **strict event-driven, append-only architecture** that ensures complete traceability, immutability, and legal defensibility.

---

## Key Architectural Changes

### Before (Original Design)
- ❌ Stock levels could be directly updated
- ❌ Billing charges could be modified
- ❌ Limited traceability to clinical events
- ❌ No event anchoring for transactions

### After (Event-Driven Design)
- ✅ **Append-only transactions**: No mutations, only inserts
- ✅ **Event anchoring**: Every transaction references DomainEvent
- ✅ **Derived stock**: Stock computed from transactions, never directly updated
- ✅ **Immutable billing**: Adjustments create new records, never modify existing
- ✅ **Complete traceability**: Every charge traces to clinical/inventory event

---

## Inventory Domain Changes

### New Models

1. **InventoryBatch**: Lot/batch tracking with expiry dates
2. **InventoryStock**: Derived stock levels (materialized view pattern)
3. **InventoryTransaction**: Immutable append-only transaction log
4. **InventoryUsage**: Clinical traceability linking consumption to cases/patients

### Key Features

- **No Direct Stock Mutations**: Stock is computed from transactions
- **Batch Tracking**: Support for lot numbers, expiry dates, recalls
- **Clinical Traceability**: Every consumption links to case and patient
- **Event-Driven**: Every transaction requires `triggeringEventId`
- **Multiple Transaction Types**: RECEIPT, RESERVATION, CONSUMPTION, RETURN, WASTAGE, ADJUSTMENT, TRANSFER, ALLOCATION, DEALLOCATION

### Invariants

1. **Never UPDATE InventoryTransaction** - Transactions are immutable
2. **Never DELETE InventoryTransaction** - Only insert new transactions
3. **Never UPDATE InventoryStock directly** - Only recompute from transactions
4. **Every transaction must have triggeringEventId** - Complete event trace
5. **Consumption transactions must have caseId** - Clinical traceability

---

## Billing Domain Changes

### New Models

1. **Bill**: Groups billable items (replaces Invoice)
2. **BillLineItem**: Individual charge items (immutable)
3. **BillingAdjustment**: Append-only corrections
4. **Payment**: Payment tracking with event anchoring
5. **PaymentAllocation**: Flexible payment allocation
6. **InsuranceClaim**: Insurance claims with event tracing

### Key Features

- **Event-Driven Charges**: Every `BillLineItem` references `triggeringEventId`
- **Clinical Linkage**: Line items can link to `SurgicalCase`, `MedicalRecord`, or `InventoryUsage`
- **Immutable Adjustments**: Corrections create new adjustment records
- **Never Alters Clinical Data**: Billing only reads clinical truth, never modifies
- **Complete Audit Trail**: All financial operations are event-anchored

### Invariants

1. **Never UPDATE BillLineItem** - Line items are immutable
2. **Never DELETE BillLineItem** - Use BillingAdjustment for corrections
3. **Every BillLineItem must have triggeringEventId** - Event traceability
4. **Billing never modifies clinical data** - Only reads clinical truth
5. **Adjustments are append-only** - Never modify existing adjustments

---

## Cross-Domain Integration

### Inventory → Billing

```
InventoryUsage
  ├─ clinicalEventId → DomainEvent (case completion)
  └─ billingEventId → DomainEvent (billing creation)
      └─ BillLineItem.usageId → InventoryUsage
```

### Clinical → Billing

```
SurgicalCase
  ├─ BillLineItem.caseId → SurgicalCase
  └─ InventoryUsage.caseId → SurgicalCase

MedicalRecord
  └─ BillLineItem.recordId → MedicalRecord
```

### Event Relations in DomainEvent

The `DomainEvent` model now includes relations to:
- `InventoryTransaction[]` - Inventory transactions
- `InventoryUsage[]` - Clinical usages (clinical and billing events)
- `BillLineItem[]` - Billing line items
- `BillingAdjustment[]` - Billing adjustments
- `Payment[]` - Payments
- `InsuranceClaim[]` - Insurance claims

---

## Event Flow Examples

### Surgery → Inventory Consumption → Billing

```
1. SurgicalCase.Completed
   → DomainEvent (SurgicalCase.Completed)

2. Inventory Consumption
   → DomainEvent (InventoryItem.Consumed)
   → InventoryTransaction (CONSUMPTION)
   → InventoryUsage (links to case, patient, batch)
   → InventoryStock (recomputed: -quantity)

3. Billing Creation
   → DomainEvent (BillLineItem.Created)
   → BillLineItem
     - triggeringEventId → DomainEvent (step 2)
     - usageId → InventoryUsage
     - caseId → SurgicalCase
   → Bill (total updated)
```

### Procedure Billing

```
1. SurgicalCase.Completed
   → DomainEvent (SurgicalCase.Completed)

2. Procedure Charge
   → DomainEvent (BillLineItem.Created)
   → BillLineItem
     - triggeringEventId → DomainEvent (step 1)
     - caseId → SurgicalCase
     - billingCodeId → CPT code
   → Bill (total updated)
```

---

## Foundation Enums Added

```prisma
enum InventoryTransactionType {
  RECEIPT
  RESERVATION
  CONSUMPTION
  RETURN
  WASTAGE
  ADJUSTMENT
  TRANSFER
  ALLOCATION
  DEALLOCATION
}

enum BillStatus {
  DRAFT
  PENDING
  SENT
  PARTIALLY_PAID
  PAID
  OVERDUE
  CANCELLED
  WRITTEN_OFF
}

enum PaymentStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  REFUNDED
  VOIDED
}

enum BillingAdjustmentType {
  DISCOUNT
  WRITE_OFF
  CORRECTION
  ADJUSTMENT
}
```

---

## Recall Capability

### Find All Patients Who Received a Batch

```sql
SELECT DISTINCT 
  iu.patientId, 
  iu.caseId, 
  iu.batchNumber,
  sc.caseNumber,
  sc.procedureName
FROM inventory_usages iu
JOIN surgical_cases sc ON iu.caseId = sc.id
WHERE iu.batchNumber = '<recalled_batch_number>'
```

### Complete Traceability

Every item can be traced:
- **Vendor Receipt** → `InventoryTransaction` (RECEIPT)
- **Batch Creation** → `InventoryBatch`
- **Case Consumption** → `InventoryUsage` (links to case, patient)
- **Billing** → `BillLineItem` (links to usage via `billingEventId`)

---

## Financial Reconciliation

### Complete Audit Trail

```
Bill
  ├─ BillLineItem (immutable charges)
  │   └─ triggeringEventId → DomainEvent
  ├─ BillingAdjustment (append-only corrections)
  │   └─ triggeringEventId → DomainEvent
  └─ PaymentAllocation (payment applications)
      └─ Payment (with optional triggeringEventId)
```

**Every financial operation is audited and event-anchored.**

---

## HIPAA Compliance

### Why This Design is Compliant

1. **Complete Audit Trail**: Every transaction traces to DomainEvent with user, timestamp, payload
2. **Immutable Records**: No silent modifications - all changes are append-only
3. **Clinical Traceability**: Every billing item can trace back to clinical event
4. **Recall Capability**: Complete tracking from vendor receipt to patient administration
5. **PHI Access Logging**: All access to billing/inventory usage must be logged via `DataAccessLog`

---

## Implementation Requirements

### Stock Computation

**CRITICAL**: Application must implement stock computation service that:
1. Reads all `InventoryTransaction` records for an item/batch/location
2. Computes stock levels (onHand, reserved, available)
3. Updates `InventoryStock` (upsert pattern)
4. Never directly updates stock quantities

### Event-Driven Transaction Creation

**CRITICAL**: Application must:
1. Create `DomainEvent` first
2. Use `DomainEvent.id` as `triggeringEventId` for transaction
3. Never create transactions without event anchoring

### Billing Creation

**CRITICAL**: Application must:
1. Identify clinical/inventory event that triggers billing
2. Create `DomainEvent` for billing creation
3. Create `BillLineItem` with `triggeringEventId` pointing to event
4. Link to clinical context (`caseId`, `recordId`, or `usageId`)

---

## Schema Statistics

- **Total Models**: ~35 models across all domains
- **Inventory Models**: 8 models (Category, Item, Vendor, Batch, Stock, Transaction, Usage)
- **Billing Models**: 10 models (Provider, Policy, Code, FeeSchedule, Bill, LineItem, Adjustment, Payment, Allocation, Claim)
- **Event Relations**: 7 event relation types in DomainEvent
- **Schema Size**: ~1,618 lines (merged)

---

## Benefits

✅ **Legal Defensibility**: Complete audit trail, no silent mutations  
✅ **Recall Capability**: Track every item from vendor to patient  
✅ **Financial Integrity**: All adjustments are audited  
✅ **Clinical Accuracy**: Billing never alters clinical truth  
✅ **HIPAA Compliance**: Complete traceability and access logging  
✅ **Scalability**: Event-driven architecture scales horizontally  

---

## Documentation

For detailed information, see:
- [EVENT_DRIVEN_ARCHITECTURE.md](./EVENT_DRIVEN_ARCHITECTURE.md) - Complete architecture guide
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Overall system architecture
- [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) - Entity relationship diagrams

---

**This redesign ensures the system is legally defensible, clinically accurate, and financially auditable for 10+ years of operation.**












