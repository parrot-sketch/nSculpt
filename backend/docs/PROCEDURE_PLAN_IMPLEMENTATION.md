# Procedure Plan Model Implementation

## Overview

The `ProcedurePlan` model is the central planning entity that connects consultations, procedures, consents, inventory, and billing in the aesthetic surgery workflow.

---

## Model Design

### ProcedurePlan

**Purpose:** Structured procedure planning that links consultation → plan → consent → surgery → billing.

**Key Features:**
- Procedure details (name, type, CPT codes, diagnosis codes)
- Pricing estimates (insurance vs. patient portion for hybrid procedures)
- Inventory requirements (what items needed for procedure)
- Status tracking (DRAFT → QUOTED → APPROVED → SCHEDULED → COMPLETED)
- Links to Consultation, Patient, Consent, and SurgicalCase

**Fields Explained:**

```prisma
procedureType ProcedureType // COSMETIC, RECONSTRUCTIVE, HYBRID
```
**Why:** Determines billing workflow:
- COSMETIC = Cash-pay, no insurance
- RECONSTRUCTIVE = Insurance-covered, requires prior auth
- HYBRID = Split billing (insurance + patient)

```prisma
cptCodes String[] // Array of CPT codes
diagnosisCodes String[] // ICD-10 codes
```
**Why:** 
- Multiple CPT codes possible (primary + modifiers)
- ICD-10 codes required for insurance claims

```prisma
insurancePortion Decimal?
patientPortion Decimal?
```
**Why:** For hybrid procedures:
- Insurance covers reconstructive portion
- Patient pays cosmetic upgrade
- System tracks both separately

```prisma
status ProcedurePlanStatus
```
**Why:** Workflow states:
- DRAFT = Being created
- QUOTED = Quote sent to patient
- APPROVED = Patient approved plan
- SCHEDULED = Surgical case created
- COMPLETED = Procedure done

### ProcedureInventoryRequirement

**Purpose:** Defines which inventory items are needed for this procedure.

**Key Features:**
- Links procedure plan to inventory items
- Quantity requirements
- Implant-specific: size, shape, serial number tracking
- Pre-allocation support

**Fields Explained:**

```prisma
requiresSerialNumber Boolean // For implants (FDA tracking)
sizeRequirement String? // "300cc", "Large"
shapeRequirement String? // "Round", "Teardrop"
```
**Why:** Aesthetic surgery uses many implants:
- Breast implants: size (cc) + shape (round/teardrop)
- Facial implants: size + shape
- All require serial number tracking for FDA compliance

```prisma
isPreAllocated Boolean
preAllocatedBatchId String?
```
**Why:** Before surgery, can pre-allocate specific implants:
- Reserve specific batch/lot
- Ensure availability
- Track which batch will be used

---

## Integration Points

### 1. Consultation → Procedure Plan

**Workflow:**
```
Consultation
  ↓
Doctor creates Procedure Plan
  ↓
Plan links to Consultation (consultationId)
```

**Why:** Trace back to the consultation where plan was discussed.

### 2. Procedure Plan → Consent

**Workflow:**
```
Procedure Plan Created
  ↓
System finds Consent Template by CPT code
  ↓
Creates PatientConsentInstance
  ↓
Links to ProcedurePlan (procedurePlanId)
```

**Why:** Consent must match the procedure being consented to.

### 3. Procedure Plan → Inventory

**Workflow:**
```
Procedure Plan Created
  ↓
System creates ProcedureInventoryRequirement records
  ↓
Pre-allocate inventory if needed
  ↓
During surgery: Consume from requirements
```

**Why:** Plan ahead what inventory will be needed, ensure availability.

### 4. Procedure Plan → Surgical Case

**Workflow:**
```
Procedure Plan Approved
  ↓
Create SurgicalCase
  ↓
Link to ProcedurePlan
  ↓
Copy procedure details to case
```

**Why:** Case inherits procedure details from plan, maintains link for traceability.

### 5. Procedure Plan → Billing

**Workflow:**
```
Surgery Completed
  ↓
BillLineItem created
  ↓
Links to ProcedurePlan via caseId → procedurePlanId
  ↓
Uses CPT codes from plan
```

**Why:** Billing uses procedure codes from plan, maintains complete traceability.

---

## Example: Breast Augmentation Workflow

### Step 1: Consultation
```
Consultation created
Patient: "I want breast augmentation"
Doctor: Creates Procedure Plan
```

### Step 2: Procedure Plan Created
```json
{
  "planNumber": "PLAN-2024-001",
  "patientId": "...",
  "consultationId": "...",
  "procedureName": "Breast Augmentation",
  "procedureType": "COSMETIC",
  "primaryCPTCode": "19325",
  "cptCodes": ["19325"],
  "diagnosisCodes": [],
  "estimatedCost": 8000.00,
  "insuranceCoverage": false,
  "status": "DRAFT"
}
```

### Step 3: Add Inventory Requirements
```json
{
  "inventoryRequirements": [
    {
      "inventoryItemId": "breast-implant-300cc-round",
      "quantity": 2,
      "requiresSerialNumber": true,
      "sizeRequirement": "300cc",
      "shapeRequirement": "Round",
      "isRequired": true
    },
    {
      "inventoryItemId": "surgical-sutures",
      "quantity": 1,
      "isRequired": true
    }
  ]
}
```

### Step 4: Generate Quote
```
System calculates total:
  - Procedure: $7,000
  - Implants: $800
  - Facility fee: $200
  Total: $8,000
```

### Step 5: Create Consent
```
System finds template: "BREAST_AUG_CONSENT_V2"
Creates PatientConsentInstance
  - procedurePlanId: "PLAN-2024-001"
  - Links to plan
```

### Step 6: Patient Approves
```
Plan status: QUOTED → APPROVED
approvedAt: 2024-01-20
```

### Step 7: Schedule Surgery
```
Create SurgicalCase
  - procedurePlanId: "PLAN-2024-001"
  - Copies procedureName, procedureCode from plan
```

### Step 8: Pre-Allocate Inventory
```
Reserve implants:
  - Batch: BATCH-2024-001
  - Serial numbers: SN12345, SN12346
  - isPreAllocated: true
```

### Step 9: Surgery
```
Consume inventory:
  - Implants used (serial numbers attached)
  - Sutures consumed
  - InventoryUsage linked to case
```

### Step 10: Billing
```
BillLineItem created:
  - procedureCode: "19325" (from plan)
  - Links to case
  - Links to plan via case
```

---

## Relations Summary

### ProcedurePlan Relations

**Incoming (Other models link TO ProcedurePlan):**
- `Patient.procedurePlans[]`
- `Consultation.procedurePlans[]`
- `User.procedurePlansCreated[]` (created by)
- `User.procedurePlansApproved[]` (approved by)
- `PatientConsentInstance.procedurePlan` (consent)
- `SurgicalCase.procedurePlan` (case)
- `ProcedureInventoryRequirement.plan` (inventory needs)

**Outgoing (ProcedurePlan links TO other models):**
- `patient` → Patient
- `consultation` → Consultation
- `createdByUser` → User
- `approvedByUser` → User
- `inventoryRequirements[]` → ProcedureInventoryRequirement
- `consentInstance` → PatientConsentInstance
- `surgicalCase` → SurgicalCase

### ProcedureInventoryRequirement Relations

**Outgoing:**
- `plan` → ProcedurePlan
- `inventoryItem` → InventoryItem

---

## Future Enhancements (Not Yet Implemented)

The following models are referenced but will be added in future phases:

1. **PriorAuthorization** - Insurance authorization tracking
   - Will link to ProcedurePlan
   - Required for reconstructive procedures

2. **Quote** - Patient quotes/estimates
   - Will link to ProcedurePlan
   - Generated from plan + fee schedules

3. **PaymentPlan** - Installment payment plans
   - Will link to Quote
   - For cosmetic procedures

---

## API Structure (Proposed)

### Controllers

```
src/modules/procedure-plan/
├── controllers/
│   └── procedure-plan.controller.ts
```

### Services

```
src/modules/procedure-plan/
├── services/
│   ├── procedure-plan.service.ts
│   └── procedure-plan-workflow.service.ts
```

### Repositories

```
src/modules/procedure-plan/
├── repositories/
│   └── procedure-plan.repository.ts
```

### DTOs

```
src/modules/procedure-plan/
├── dto/
│   ├── create-procedure-plan.dto.ts
│   ├── update-procedure-plan.dto.ts
│   ├── add-inventory-requirement.dto.ts
│   ├── approve-procedure-plan.dto.ts
│   └── list-procedure-plans.dto.ts
```

---

## API Endpoints (Proposed)

```
POST   /api/v1/procedure-plans                    # Create plan
GET    /api/v1/procedure-plans/:id                # Get plan
GET    /api/v1/procedure-plans?patientId=...      # List by patient
GET    /api/v1/procedure-plans?consultationId=... # List by consultation
PATCH  /api/v1/procedure-plans/:id                # Update plan
POST   /api/v1/procedure-plans/:id/inventory      # Add inventory requirement
POST   /api/v1/procedure-plans/:id/approve        # Patient approves
POST   /api/v1/procedure-plans/:id/quote          # Generate quote (future)
```

---

## Validation Rules

### Before Plan Can Be Approved
- ✅ All required fields filled
- ✅ CPT codes valid
- ✅ Inventory requirements defined (if needed)
- ✅ Estimated cost calculated

### Before Surgery Can Be Scheduled
- ✅ Plan status = APPROVED
- ✅ Consent signed (if procedure-specific)
- ✅ Prior authorization approved (if reconstructive)
- ✅ Inventory available (if pre-allocation required)

---

## Next Steps

1. ✅ Schema created
2. ⏭️ Run migration: `npx prisma migrate dev --name add_procedure_plan`
3. ⏭️ Create module structure (repository, service, controller)
4. ⏭️ Implement workflow methods
5. ⏭️ Integration with Consent module
6. ⏭️ Integration with Inventory module
7. ⏭️ Integration with Theater module

---

## Design Decisions Explained

### Why Separate ProcedurePlan from SurgicalCase?

**ProcedurePlan:**
- Created during consultation
- Planning phase (what will be done)
- Can be modified before approval
- Links to consent, quote, prior auth

**SurgicalCase:**
- Created when scheduling surgery
- Execution phase (what is being done)
- Immutable after creation
- Links to actual surgery event

**Benefit:** Clear separation of planning vs. execution, supports re-planning without affecting scheduled cases.

### Why Inventory Requirements in Plan?

**Benefit:**
- Plan ahead what's needed
- Check availability before scheduling
- Pre-allocate specific batches (for implants)
- Automatic consumption during surgery
- Billable items tracked

### Why Link to Consultation?

**Benefit:**
- Trace back to consultation where plan was discussed
- Historical record of discussion
- Link to EMR notes from consultation

---

## Summary

The ProcedurePlan model:
- ✅ Connects Consultation → Plan → Consent → Surgery → Billing
- ✅ Supports cosmetic, reconstructive, and hybrid procedures
- ✅ Tracks inventory requirements
- ✅ Maintains complete traceability
- ✅ Integrates with existing modules
- ✅ Ready for future enhancements (PriorAuth, Quote)









