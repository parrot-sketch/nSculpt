# Inventory Ledger System - Phase 1 Implementation

## Overview

The Inventory Ledger System has been implemented as a **ledger-based, append-only inventory management system** following accounting principles. Inventory is treated as a ledger of all material movement, not just stock counts.

## Core Architecture Principle

**Inventory is NOT "just stock"** — it's a **ledger of all material movement** inside the hospital.

- **No edits** — transactions are immutable
- **No deletes** — everything is preserved
- **Everything traceable** — complete audit trail
- **Ledger is source of truth** — Stock = SUM(receipts) - SUM(outgoing)

## What Was Implemented (Phase 1)

### 1. Enhanced Prisma Schema

**Transaction Types** (added to existing enum):
- `RECEIPT` - Stock received from vendor
- `TRANSFER_OUT` - Transferred out of location
- `TRANSFER_IN` - Transferred into location
- `CONSUMPTION` - Used on patient
- `REVERSAL` - Reversal of previous transaction (not edit)
- `ADJUSTMENT` - Stock count corrections (ADMIN only)
- `RETURN` - Returned to stock
- `WASTAGE` - Lost, expired, damaged

**Existing Models** (already in place):
- `InventoryItem` - Catalog of items
- `InventoryBatch` - Stock units with lot/batch/expiry
- `InventoryTransaction` - Ledger entries (immutable)
- `InventoryStock` - Materialized view (computed from transactions)
- `InventoryUsage` - Clinical consumption tracking

### 2. Ledger Operations (Phase 1)

**1️⃣ Receive Stock**
- Creates receipt transaction
- Creates/updates batch if batch tracking enabled
- Tracks lot, batch, expiry, vendor info
- Emits `INVENTORY_RECEIVED` event

**2️⃣ Consume Stock (FIFO)**
- Uses FIFO (First In, First Out) - oldest expiration first
- Deducts from multiple batches if needed
- Creates consumption transaction(s)
- Validates sufficient stock before consumption
- Emits `INVENTORY_CONSUMED` event

**3️⃣ Reverse Transaction**
- Creates reversal entry (NOT an edit)
- Links to original transaction
- Opposite quantity sign
- Required reason for audit
- Emits `INVENTORY_REVERSED` event

**4️⃣ Adjust Stock**
- ADMIN only
- For stock count corrections
- Requires documented reason
- Emits `INVENTORY_ADJUSTED` event

**5️⃣ Transfer Stock**
- Between locations (Store → Theatre, etc.)
- Creates TRANSFER_OUT and TRANSFER_IN transactions
- Validates sufficient stock at source
- Emits `INVENTORY_TRANSFERRED` event

### 3. Stock Calculation

**Stock Calculation Formula:**
```
Stock = SUM(RECEIPT) 
      + SUM(RETURN) 
      + SUM(TRANSFER_IN) 
      - SUM(CONSUMPTION) 
      - SUM(WASTAGE) 
      - SUM(TRANSFER_OUT) 
      + SUM(ADJUSTMENT)
```

**FIFO Implementation:**
- Batches sorted by expiration date (oldest first)
- Non-expiring items sorted by received date
- Consumption uses oldest batches first
- Automatically handles partial batch consumption

### 4. API Endpoints (`/inventory/ledger/`)

**Phase 1 Ledger Operations:**
- `POST /ledger/receive` - Receive stock
- `POST /ledger/consume` - Consume stock (FIFO)
- `POST /ledger/reverse` - Reverse transaction
- `POST /ledger/adjust` - Adjust stock (ADMIN only)
- `POST /ledger/transfer` - Transfer between locations
- `GET /ledger/stock/:itemId` - Get current stock (calculated)

**Existing Endpoints:**
- `POST /items` - Create inventory item
- `GET /items` - List items
- `GET /items/:id` - Get item details
- `PATCH /items/:id` - Update item

### 5. Role-Based Access Control

**INVENTORY_MANAGER / ADMIN:**
- ✅ Receive stock
- ✅ Transfer stock
- ✅ Reverse transactions
- ✅ Adjust stock (ADMIN only)

**DOCTOR / SURGEON / NURSE:**
- ✅ Consume stock
- ✅ View stock levels

**All Roles:**
- ✅ View items and stock

### 6. Features Implemented

✅ **Ledger-Based Architecture**: All movement through immutable transactions
✅ **FIFO Deduction**: Automatic oldest-first consumption
✅ **Batch/Lot Tracking**: Full traceability for recalls
✅ **Expiry Management**: Automatic sorting by expiration
✅ **Stock Calculation**: Computed from ledger, not stored directly
✅ **Reversal Support**: Non-destructive error correction
✅ **Transfer Tracking**: Complete location movement history
✅ **Event-Driven**: Domain events for all operations
✅ **Audit Trail**: Complete immutability and traceability

## Workflow Examples

### Receiving Stock

```bash
POST /inventory/ledger/receive
{
  "itemId": "...",
  "quantity": 100,
  "unitCost": 5.50,
  "batchNumber": "BATCH-2024-001",
  "lotNumber": "LOT-12345",
  "expirationDate": "2025-12-31",
  "vendorId": "...",
  "purchaseOrderNumber": "PO-2024-001"
}
```

**Result:**
- Creates RECEIPT transaction
- Creates/updates InventoryBatch
- Emits INVENTORY_RECEIVED event
- Stock increases by 100

### Consuming Stock (FIFO)

```bash
POST /inventory/ledger/consume
{
  "itemId": "...",
  "quantity": 25,
  "consultationId": "...",
  "patientId": "...",
  "reason": "Surgical procedure"
}
```

**Result:**
- Calculates available stock
- Selects oldest batches (FIFO)
- Creates CONSUMPTION transaction(s)
- Stock decreases by 25
- Emits INVENTORY_CONSUMED event

### Reversing Transaction

```bash
POST /inventory/ledger/reverse
{
  "transactionId": "...",
  "reason": "Wrong item consumed - needs correction"
}
```

**Result:**
- Creates REVERSAL transaction
- Links to original transaction
- Opposite quantity sign
- Emits INVENTORY_REVERSED event
- Stock adjusted accordingly

### Transferring Stock

```bash
POST /inventory/ledger/transfer
{
  "itemId": "...",
  "quantity": 50,
  "fromLocationId": "store-room-1",
  "toLocationId": "theater-2",
  "reason": "Scheduled surgery"
}
```

**Result:**
- Creates TRANSFER_OUT from source
- Creates TRANSFER_IN to destination
- Validates sufficient stock
- Emits INVENTORY_TRANSFERRED event

## Stock Calculation Details

### Current Stock Query

```bash
GET /inventory/ledger/stock/:itemId?batchId=...&locationId=...
```

**Returns:**
- Calculated stock from ledger
- Can filter by batch or location
- Real-time calculation (not cached)

### FIFO Batch Selection

When consuming stock:
1. Get all active batches for item
2. Sort by expiration date (ascending)
3. Non-expiring items sorted by received date
4. Calculate available quantity per batch
5. Consume from oldest batches first
6. Handle partial batch consumption

## Event-Driven Architecture

All inventory operations emit domain events:

- `Inventory.Received` - Stock received
- `Inventory.Consumed` - Stock consumed
- `Inventory.Reversed` - Transaction reversed
- `Inventory.Adjusted` - Stock adjusted
- `Inventory.Transferred` - Stock transferred

**Event Payload Includes:**
- itemId
- quantity
- batch/lot information
- location information
- reference to consultation/case/patient
- timestamp

**Future Integration:**
- Billing listens to consumption events
- EMR receives usage notifications
- Notifications for low stock
- Recall alerts when batch issues detected

## Compliance & Safety Features

✅ **Lot Recall Tracking**: Find all patients who received a batch
✅ **Expiry Warnings**: FIFO ensures oldest stock used first
✅ **Immutable Ledger**: No edits, only reversals
✅ **Complete Audit Trail**: Every transaction recorded
✅ **Role-Based Controls**: Restricted access to sensitive operations
✅ **Stock Validation**: Prevents negative stock
✅ **Batch Traceability**: Full chain of custody

## Phase 1 Scope Limitations

**What's NOT in Phase 1** (future phases):
- Prescription dispensing pipeline
- Surgery usage interface
- Lab auto-consumption
- Nursing administration logs
- Automatic reorder triggers
- Multi-location transfers
- Variance audits
- Narcotics special rules

**Phase 1 is Foundation:**
- Catalog management ✅
- Receiving ✅
- Consumption (FIFO) ✅
- Transfers ✅
- Reversals ✅
- Adjustments ✅
- Stock calculation ✅

## Testing Scenarios

### 1. Receive and Consume Stock
```bash
# Receive stock
POST /inventory/ledger/receive { itemId, quantity: 100, ... }

# Check stock
GET /inventory/ledger/stock/:itemId
# Expected: 100

# Consume stock
POST /inventory/ledger/consume { itemId, quantity: 25, ... }

# Check stock
GET /inventory/ledger/stock/:itemId
# Expected: 75
```

### 2. FIFO Consumption
```bash
# Receive batch 1 (expires 2025-12-31)
POST /inventory/ledger/receive { batchNumber: "B1", expirationDate: "2025-12-31", ... }

# Receive batch 2 (expires 2025-06-30)
POST /inventory/ledger/receive { batchNumber: "B2", expirationDate: "2025-06-30", ... }

# Consume
POST /inventory/ledger/consume { quantity: 50, ... }
# Expected: Consumes from B2 first (older expiration)
```

### 3. Insufficient Stock Error
```bash
POST /inventory/ledger/consume { quantity: 200, ... }
# When only 100 available
# Expected: 400 Bad Request - Insufficient stock
```

### 4. Reverse Transaction
```bash
POST /inventory/ledger/reverse { transactionId: "...", reason: "Error" }
# Expected: Creates reversal transaction, stock adjusted
```

### 5. Adjust Stock (ADMIN only)
```bash
POST /inventory/ledger/adjust { itemId, quantityAdjustment: -10, reason: "Stock count" }
# Expected: Creates adjustment transaction, stock decreased by 10
```

## Design Decisions

### Why Ledger-Based?

**Like accounting:**
- Complete audit trail
- Immutable history
- Can reconstruct any point in time
- Supports complex scenarios (returns, reversals, adjustments)

### Why FIFO?

**Clinical safety:**
- Oldest stock used first
- Minimizes expired product usage
- Reduces waste
- Standard inventory practice

### Why Not Direct Stock Updates?

**Data integrity:**
- Stock calculated from ledger = single source of truth
- Prevents inconsistencies
- Supports audit requirements
- Enables transaction-level reporting

### Why Reversals Instead of Edits?

**Audit compliance:**
- Original transaction preserved
- Reason for reversal documented
- Complete history maintained
- Legal defensibility

## File Structure

### Created/Enhanced Files
- `src/modules/inventory/dto/receive-stock.dto.ts`
- `src/modules/inventory/dto/consume-stock.dto.ts`
- `src/modules/inventory/dto/reverse-transaction.dto.ts`
- `src/modules/inventory/dto/adjust-stock.dto.ts`
- `src/modules/inventory/dto/transfer-stock.dto.ts`
- `src/modules/inventory/services/inventory.service.ts` (enhanced)
- `src/modules/inventory/repositories/inventory.repository.ts` (enhanced)
- `src/modules/inventory/controllers/inventory.controller.ts` (enhanced)
- `src/modules/inventory/events/inventory.events.ts` (enhanced)

### Schema Updates
- `prisma/schema/foundation.prisma` - Added TRANSFER_OUT, TRANSFER_IN, REVERSAL

## Next Steps

1. **Run Migration:**
   ```bash
   cd backend
   npx prisma migrate dev --name enhance_inventory_ledger
   npx prisma generate
   ```

2. **Test Phase 1 Operations:**
   - Receive stock with batches
   - Consume using FIFO
   - Transfer between locations
   - Reverse transactions
   - Adjust stock

3. **Phase 2 Planning:**
   - Prescription integration
   - Surgery usage interface
   - Lab auto-consumption
   - Billing hooks

## Acceptance Criteria ✅

✅ Ledger-based architecture (append-only)
✅ FIFO deduction (oldest first)
✅ Stock calculation from ledger
✅ Batch/lot tracking
✅ Reversal support (not edits)
✅ Transfer tracking
✅ Event-driven (domain events)
✅ Role-based access control
✅ Complete audit trail
✅ Safe and incremental (no breaking changes)









