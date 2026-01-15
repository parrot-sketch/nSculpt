# Event-Driven Inventory & Billing Architecture

## Overview

The Inventory and Billing domains are designed with **strict event-driven, append-only architecture** to ensure:

1. **Complete Traceability**: Every transaction traces to a DomainEvent
2. **Immutable Audit Trail**: No silent mutations of stock or charges
3. **Clinical Defensibility**: Billing never alters clinical truth
4. **Recall Capability**: Track every item from receipt to patient
5. **Financial Reconciliation**: Complete audit trail for all financial operations

---

## Core Principles

### 1. Append-Only Transactions

**Inventory**: `InventoryTransaction` is immutable after creation. Stock levels are **derived** from transactions, never directly updated.

**Billing**: `BillLineItem` and `BillingAdjustment` are immutable. Corrections create new adjustment records, never modify existing ones.

### 2. Event Anchoring

**Every transaction must reference a DomainEvent**:
- `InventoryTransaction.triggeringEventId` → `DomainEvent`
- `BillLineItem.triggeringEventId` → `DomainEvent`
- `BillingAdjustment.triggeringEventId` → `DomainEvent`
- `InventoryUsage.clinicalEventId` → `DomainEvent`

### 3. No Direct Stock Mutations

**CRITICAL**: The `InventoryStock` table is a **materialized view pattern**. 

- Application **MUST** recompute stock from `InventoryTransaction`
- Never directly `UPDATE InventoryStock`
- Only `INSERT` new transactions, then recompute stock

---

## Inventory Flow

### 1. Receipt Flow

```
DomainEvent (InventoryItem.Received) 
  → InventoryTransaction (RECEIPT, +quantity)
  → InventoryBatch (if batch-tracked)
  → InventoryStock (recomputed: +quantity)
```

### 2. Case Consumption Flow

```
SurgicalCase (procedure completed)
  → DomainEvent (InventoryItem.Consumed)
  → InventoryTransaction (CONSUMPTION, -quantity)
  → InventoryUsage (links to case, patient, batch)
  → InventoryStock (recomputed: -quantity)
```

### 3. Reservation Flow

```
SurgicalCase (scheduled)
  → DomainEvent (InventoryItem.Reserved)
  → InventoryTransaction (RESERVATION, -available)
  → InventoryStock (recomputed: -available, +reserved)
  
Case completed:
  → DomainEvent (InventoryItem.Consumed)
  → InventoryTransaction (CONSUMPTION, -reserved)
  → InventoryUsage (clinical trace)
  → InventoryStock (recomputed: -reserved)
```

### 4. Recall Flow (Batch Tracking)

```
FDA Recall (batch XYZ)
  → Query InventoryUsage WHERE batchNumber = 'XYZ'
  → Find all patients who received items from batch XYZ
  → Complete clinical traceability
```

---

## Billing Flow

### 1. Procedure-Based Billing

```
SurgicalCase (procedure completed)
  → DomainEvent (SurgicalCase.Completed)
  → BillLineItem (procedure charge)
    - triggeringEventId → DomainEvent
    - caseId → SurgicalCase
    - billingCodeId → CPT code
  → Bill (groups line items)
```

### 2. Inventory-Based Billing

```
InventoryUsage (item consumed in case)
  → DomainEvent (InventoryItem.Billed)
  → BillLineItem (consumable charge)
    - triggeringEventId → DomainEvent
    - usageId → InventoryUsage
    - caseId → SurgicalCase
  → Bill (groups line items)
```

### 3. Adjustment Flow

```
Billing Error Detected
  → DomainEvent (BillingAdjustment.Authorized)
  → BillingAdjustment (append-only correction)
    - triggeringEventId → DomainEvent
    - billId → Bill
    - lineItemId → BillLineItem (if specific)
    - amount → correction amount
  → Bill (balance recomputed)
```

### 4. Payment Flow

```
Payment Received
  → DomainEvent (Payment.Received)
  → Payment
    - triggeringEventId → DomainEvent (optional)
  → PaymentAllocation
    - paymentId → Payment
    - billId → Bill (or lineItemId)
    - amount → allocated amount
  → Bill (paidAmount, balance updated)
```

---

## Cross-Domain Integration

### Inventory → Billing Link

```
InventoryUsage (consumption)
  ├─ clinicalEventId → DomainEvent (case completion)
  └─ billingEventId → DomainEvent (billing creation)
      └─ BillLineItem.usageId → InventoryUsage
```

### Clinical → Billing Link

```
SurgicalCase
  ├─ BillLineItem.caseId → SurgicalCase
  └─ InventoryUsage.caseId → SurgicalCase
```

### Medical Record → Billing Link

```
MedicalRecord
  └─ BillLineItem.recordId → MedicalRecord
```

---

## Invariants (Never Violate)

### Inventory Invariants

1. **Never UPDATE InventoryTransaction**: Transactions are immutable
2. **Never DELETE InventoryTransaction**: Only insert new transactions
3. **Never UPDATE InventoryStock directly**: Only recompute from transactions
4. **Every transaction must have triggeringEventId**: Complete event trace
5. **Consumption transactions must have caseId**: Clinical traceability

### Billing Invariants

1. **Never UPDATE BillLineItem**: Line items are immutable
2. **Never DELETE BillLineItem**: Use BillingAdjustment for corrections
3. **Every BillLineItem must have triggeringEventId**: Event traceability
4. **Billing never modifies clinical data**: Only reads clinical truth
5. **Adjustments are append-only**: Never modify existing adjustments

---

## Event Examples

### Inventory Events

```json
{
  "eventType": "InventoryItem.Received",
  "domain": "INVENTORY",
  "aggregateId": "<itemId>",
  "aggregateType": "InventoryItem",
  "payload": {
    "batchNumber": "XYZ123",
    "quantity": 100,
    "unitCost": 25.50,
    "vendorId": "<vendorId>"
  }
}
```

```json
{
  "eventType": "InventoryItem.Consumed",
  "domain": "INVENTORY",
  "aggregateId": "<itemId>",
  "aggregateType": "InventoryItem",
  "payload": {
    "caseId": "<caseId>",
    "patientId": "<patientId>",
    "quantity": 2,
    "batchNumber": "XYZ123"
  }
}
```

### Billing Events

```json
{
  "eventType": "BillLineItem.Created",
  "domain": "BILLING",
  "aggregateId": "<billId>",
  "aggregateType": "Bill",
  "payload": {
    "caseId": "<caseId>",
    "billingCode": "CPT-12345",
    "amount": 1500.00,
    "serviceDate": "2024-01-15"
  },
  "causationId": "<surgicalCaseCompletedEventId>"
}
```

---

## Query Patterns

### Find All Items Used in a Case

```sql
SELECT iu.*, it.itemNumber, it.name, ib.batchNumber
FROM inventory_usages iu
JOIN inventory_items it ON iu.itemId = it.id
LEFT JOIN inventory_batches ib ON iu.batchId = ib.id
WHERE iu.caseId = '<caseId>'
```

### Find All Patients Who Received a Batch

```sql
SELECT DISTINCT iu.patientId, iu.caseId, iu.batchNumber
FROM inventory_usages iu
WHERE iu.batchNumber = '<batchNumber>'
```

### Trace Bill to Clinical Event

```sql
SELECT bli.*, de.eventType, de.payload, sc.caseNumber
FROM bill_line_items bli
JOIN domain_events de ON bli.triggeringEventId = de.id
LEFT JOIN surgical_cases sc ON bli.caseId = sc.id
WHERE bli.billId = '<billId>'
```

### Recompute Stock for an Item

```sql
SELECT 
  SUM(CASE WHEN transactionType IN ('RECEIPT', 'RETURN', 'ADJUSTMENT') THEN quantity ELSE 0 END) -
  SUM(CASE WHEN transactionType IN ('CONSUMPTION', 'WASTAGE') THEN quantity ELSE 0 END) as onHand,
  SUM(CASE WHEN transactionType = 'RESERVATION' THEN quantity ELSE 0 END) as reserved
FROM inventory_transactions
WHERE itemId = '<itemId>'
```

---

## HIPAA & Audit Compliance

### Why This Design is Compliant

1. **Complete Audit Trail**: Every transaction traces to a DomainEvent with user, timestamp, and payload
2. **Immutable Records**: No silent modifications - all changes are append-only
3. **Clinical Traceability**: Every billing item can trace back to clinical event
4. **Recall Capability**: Complete tracking from vendor receipt to patient administration
5. **Financial Reconciliation**: All adjustments are audited and event-anchored

### Access Patterns

All PHI access (billing, inventory usage) must be logged via `DataAccessLog`:
- Access to `Bill` records
- Access to `InventoryUsage` records
- Access to patient billing information

---

## Implementation Notes

### Stock Computation Service

```typescript
// Pseudo-code for stock computation
async function recomputeStock(itemId: string, batchId?: string, locationId?: string) {
  const transactions = await prisma.inventoryTransaction.findMany({
    where: { itemId, batchId, ...locationFilter },
    orderBy: { transactionDate: 'asc' }
  });
  
  const stock = transactions.reduce((acc, tx) => {
    switch(tx.transactionType) {
      case 'RECEIPT':
      case 'RETURN':
        acc.onHand += tx.quantity;
        break;
      case 'CONSUMPTION':
      case 'WASTAGE':
        acc.onHand -= tx.quantity;
        break;
      case 'RESERVATION':
        acc.onHand -= tx.quantity;
        acc.reserved += tx.quantity;
        break;
      // ... other types
    }
    return acc;
  }, { onHand: 0, reserved: 0 });
  
  // Upsert InventoryStock
  await prisma.inventoryStock.upsert({
    where: { itemId_batchId_locationId: { itemId, batchId, locationId } },
    update: {
      quantityOnHand: stock.onHand,
      quantityReserved: stock.reserved,
      quantityAvailable: stock.onHand - stock.reserved,
      lastComputedAt: new Date()
    },
    create: { ... }
  });
}
```

### Event-Driven Transaction Creation

```typescript
// Pseudo-code for creating inventory transaction from event
async function createInventoryTransaction(event: DomainEvent) {
  // 1. Validate event
  if (event.domain !== 'INVENTORY') throw new Error('Invalid event domain');
  
  // 2. Create transaction
  const transaction = await prisma.inventoryTransaction.create({
    data: {
      triggeringEventId: event.id,
      itemId: event.payload.itemId,
      transactionType: event.payload.transactionType,
      quantity: event.payload.quantity,
      // ... other fields from event payload
    }
  });
  
  // 3. Recompute stock
  await recomputeStock(event.payload.itemId);
  
  // 4. Create usage record if consumption
  if (event.payload.transactionType === 'CONSUMPTION') {
    await prisma.inventoryUsage.create({
      data: {
        transactionId: transaction.id,
        caseId: event.payload.caseId,
        patientId: event.payload.patientId,
        clinicalEventId: event.id,
        // ...
      }
    });
  }
}
```

---

## Summary

This event-driven architecture ensures:

✅ **Complete Traceability**: Every transaction → DomainEvent  
✅ **Immutable Audit Trail**: Append-only, no mutations  
✅ **Clinical Defensibility**: Billing derives from events, never alters clinical data  
✅ **Recall Capability**: Track every item from receipt to patient  
✅ **Financial Reconciliation**: All adjustments are audited and event-anchored  
✅ **HIPAA Compliance**: Complete audit trail for all PHI access












