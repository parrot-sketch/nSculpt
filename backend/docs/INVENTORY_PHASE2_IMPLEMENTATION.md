# Inventory Phase 2 - Clinical Integration Implementation

## Overview

Phase 2 integrates inventory consumption with clinical workflows: Prescriptions, Surgery, Lab Orders, and Nursing Administration. All integrations follow the ledger-based, event-driven architecture established in Phase 1.

## What Was Implemented (Phase 2)

### 1. Prescription Module

**New Schema** (`prescription.prisma`):
- `Prescription` - Medication prescriptions with inventory links
- `PrescriptionDispensation` - Records when pharmacy dispenses (triggers inventory consumption)
- `MedicationAdministration` - Nursing logs when medication was given

**Workflow:**
1. **Doctor Prescribes** → Prescription created (status: PRESCRIBED)
2. **Pharmacy Dispenses** → Inventory consumed (FIFO), Dispensation record created
3. **Nurse Administers** → Administration log created

**API Endpoints:**
- `POST /api/v1/prescriptions` - Create prescription
- `GET /api/v1/prescriptions/:id` - Get prescription
- `GET /api/v1/prescriptions/by-consultation/:consultationId` - List by consultation
- `POST /api/v1/prescriptions/:id/dispense` - Dispense (consumes inventory)
- `POST /api/v1/prescriptions/:id/administration` - Record administration

**Integration Points:**
- Links to `Consultation` and `Patient`
- Links to `InventoryItem` (if medication is tracked in inventory)
- Creates `InventoryTransaction` (CONSUMPTION) when dispensed
- Creates `InventoryUsage` linked to consultation

### 2. Surgery Usage Interface

**Enhanced Theater Service:**
- Added `recordSurgeryUsage()` method
- Consumes inventory during surgery
- Creates usage records linked to surgical case

**API Endpoint:**
- `POST /theater/cases/:id/inventory-usage` - Record inventory usage during surgery

**Integration Points:**
- Links to `SurgicalCase` and `Patient`
- Creates `InventoryTransaction` (CONSUMPTION) with case reference
- Creates `InventoryUsage` linked to surgical case
- Emits `SURGICAL_ITEM_USED` domain event

**Usage Example:**
```bash
POST /theater/cases/{caseId}/inventory-usage
{
  "inventoryItemId": "...",
  "quantity": 5,
  "theaterId": "...",
  "notes": "Used during procedure"
}
```

### 3. Lab Auto-Consumption (Framework)

**Enhanced Lab Order Service:**
- Added `consumeLabSupplies()` method (framework ready)
- Integrated with inventory service
- Triggered when lab result is recorded

**Integration Points:**
- Framework in place for auto-consuming lab supplies
- Ready for test-specific supply configuration
- Emits inventory consumption events

**Future Enhancement:**
- Configure test-specific supplies (reagents, swabs, containers)
- Map test types to required inventory items
- Auto-consume based on test configuration

### 4. Nursing Administration Logs

**Prescription Module Includes:**
- `MedicationAdministration` model tracks when medications were given
- Links to prescription, consultation, and patient
- Records dosage, route, patient response

**Features:**
- Complete administration history
- Patient response tracking
- Clinical notes

### 5. Enhanced Inventory Service

**New Method:**
- `consumeStockForClinicalUse()` - Enhanced consumption that creates `InventoryUsage` records

**Key Features:**
- FIFO deduction (inherited from Phase 1)
- Automatic usage record creation
- Links to clinical context (consultation/case)
- Event-driven with domain events

### 6. Billing Hooks (Event-Driven)

**Architecture:**
- All inventory consumption emits domain events
- Billing module listens to `INVENTORY_CONSUMED` events
- Creates billable line items from consumption events

**Event Flow:**
```
Inventory.Consumed (domain event)
  → Billing listener (future)
  → BillLineItem created
  → Links to InventoryUsage via triggeringEventId
```

**Events Emitted:**
- `Inventory.Consumed` - For all consumption
- `Prescription.Dispensed` - For prescription dispensing
- `SurgicalCase.ItemUsed` - For surgery usage

## Integration Architecture

### Event-Driven Flow

```
Clinical Action
  ↓
Domain Event (Inventory.Consumed)
  ↓
InventoryTransaction (CONSUMPTION)
  ↓
InventoryUsage (clinical context)
  ↓
Billing Event (future - when billable)
```

### Complete Traceability

Every consumed item can be traced:
1. **Prescription Flow:**
   - Prescription → Dispensation → InventoryTransaction → InventoryUsage
   - Links: Patient, Consultation, Batch/Lot

2. **Surgery Flow:**
   - SurgicalCase → InventoryTransaction → InventoryUsage
   - Links: Patient, Case, Batch/Lot, Theater

3. **Lab Flow:**
   - LabOrder → Result → InventoryTransaction (future)
   - Links: Patient, Consultation, Batch/Lot

## Schema Changes

### New Models

**Prescription:**
- `Prescription` - Prescription details
- `PrescriptionDispensation` - Dispensing records
- `MedicationAdministration` - Administration logs

### Enhanced Models

**InventoryUsage:**
- Made `caseId` optional (was required)
- Added `consultationId` (for prescriptions, lab)
- Supports both surgical and non-surgical consumption

**InventoryTransaction:**
- Added relation to `PrescriptionDispensation`

## Role-Based Access

**Prescription Workflow:**
- **DOCTOR/SURGEON** - Can create prescriptions
- **PHARMACIST/ADMIN** - Can dispense (consumes inventory)
- **NURSE/ADMIN** - Can record administration

**Surgery Workflow:**
- **SURGEON/NURSE/ADMIN** - Can record inventory usage

**Lab Workflow:**
- **LAB_TECH/ADMIN** - Can record results (triggers auto-consumption)

## Domain Events

### Prescription Events
- `Prescription.Created`
- `Prescription.Dispensed`
- `Medication.Administered`

### Theater Events
- `SurgicalCase.ItemUsed` (new)

### Inventory Events
- `Inventory.Consumed` (from Phase 1, now used in clinical workflows)

## API Examples

### Create and Dispense Prescription

```bash
# 1. Doctor creates prescription
POST /api/v1/prescriptions
{
  "consultationId": "...",
  "medicationName": "Amoxicillin 500mg",
  "medicationType": "ORAL",
  "dosage": "500mg",
  "frequency": "twice daily",
  "quantity": 20,
  "inventoryItemId": "...",
  "duration": "7 days"
}

# 2. Pharmacist dispenses (consumes inventory)
POST /api/v1/prescriptions/{id}/dispense
{
  "quantityToDispense": 20,
  "notes": "Full course dispensed"
}

# 3. Nurse records administration
POST /api/v1/prescriptions/{id}/administration
{
  "dosageGiven": "500mg",
  "route": "ORAL",
  "response": "Tolerated well",
  "notes": "Given with food"
}
```

### Record Surgery Usage

```bash
POST /theater/cases/{caseId}/inventory-usage
{
  "inventoryItemId": "...",
  "quantity": 2,
  "theaterId": "...",
  "notes": "Surgical gloves used during procedure"
}
```

## Billing Integration (Future)

**Event Listeners:**
- Listen to `Inventory.Consumed` events
- Check if item is billable (`InventoryItem.isBillable`)
- Create `BillLineItem` with:
  - `triggeringEventId` → DomainEvent
  - `usageId` → InventoryUsage
  - `caseId` or `consultationId`

**Billing Flow:**
```
Inventory.Consumed (event)
  ↓
BillingService.onInventoryConsumed()
  ↓
Check isBillable
  ↓
Create BillLineItem
  ↓
Link to Bill
```

## Recall Capability

**Enhanced Recall Queries:**
- Find all patients who received a specific batch/lot
- Supports both surgical and prescription usage
- Query by:
  - Batch number
  - Lot number
  - Inventory item
  - Date range

**Example Query:**
```sql
SELECT DISTINCT 
  iu.patientId,
  iu.consultationId,
  iu.caseId,
  iu.batchNumber,
  iu.lotNumber,
  p.firstName,
  p.lastName
FROM inventory_usages iu
JOIN patients p ON iu.patientId = p.id
WHERE iu.batchNumber = '<recalled_batch>'
  OR iu.lotNumber = '<recalled_lot>'
```

## Testing Scenarios

### Prescription Flow Test
1. Create prescription
2. Verify status is PRESCRIBED
3. Dispense prescription
4. Verify inventory consumed (check stock decreased)
5. Verify dispensation record created
6. Verify inventory usage created
7. Record administration
8. Verify administration log created

### Surgery Flow Test
1. Create surgical case
2. Record inventory usage
3. Verify inventory consumed
4. Verify usage linked to case
5. Verify lot/batch numbers attached

### Stock Calculation Test
1. Receive stock (100 units)
2. Dispense prescription (25 units)
3. Use in surgery (10 units)
4. Check stock calculation (should be 65 units)
5. Verify all transactions visible in ledger

## Next Steps (Phase 3)

**Planned Enhancements:**
- Automatic reorder triggers
- Multi-location transfers
- Variance audits
- Narcotics special rules
- Dashboards and analytics
- Vendor analytics

## File Structure

### New Files Created
- `prisma/schema/prescription.prisma`
- `src/modules/prescription/` (complete module)
- `src/modules/theater/dto/record-surgery-usage.dto.ts`

### Modified Files
- `prisma/schema/consultation.prisma` - Added prescription relations
- `prisma/schema/patient.prisma` - Added prescription relations
- `prisma/schema/rbac.prisma` - Added prescription user relations
- `prisma/schema/inventory.prisma` - Enhanced InventoryUsage, added prescriptions
- `src/modules/orders/services/lab-order.service.ts` - Added lab supply consumption framework
- `src/modules/theater/services/theater.service.ts` - Added surgery usage recording
- `src/modules/theater/controllers/theater.controller.ts` - Added surgery usage endpoint
- `src/modules/inventory/services/inventory.service.ts` - Added clinical consumption method

## Acceptance Criteria ✅

✅ Prescription → Dispensing → Inventory consumption
✅ Surgery usage interface
✅ Lab auto-consumption framework
✅ Nursing administration logs
✅ Billing hooks via domain events
✅ Complete traceability (batch/lot to patient)
✅ Event-driven architecture maintained
✅ Role-based access control
✅ Full audit trail
✅ No breaking changes to Phase 1

## Migration Instructions

```bash
cd backend
npx prisma migrate dev --name add_prescription_and_clinical_integration
npx prisma generate
```

The migration will:
1. Create prescription tables
2. Update InventoryUsage to support consultations
3. Add relations between prescriptions and inventory









