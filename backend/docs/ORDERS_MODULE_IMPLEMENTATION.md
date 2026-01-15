# Lab Orders Module Implementation

## Overview

The Lab Orders module has been successfully implemented as a workflow-based order management system. It connects Consultation → Orders → Results → EMR → Billing (event-driven) with role-based access control and automatic EMR integration.

## What Was Implemented

### 1. Prisma Schema (`prisma/schema/orders.prisma`)

- **OrderType Enum**: LAB (extensible for future order types)
- **OrderStatus Enum**: 5 states (CREATED, APPROVED, IN_PROGRESS, COMPLETED, CANCELLED)
- **ResultStatus Enum**: 3 states (PENDING, AVAILABLE, AMENDED)
- **LabOrder Model**: Complete with:
  - Relations to Patient, Consultation, and User (orderedBy, approvedBy)
  - Workflow state management
  - Priority field (ROUTINE | URGENT)
  - Soft delete (archive) support
  - Optimistic locking via version field
- **LabResult Model**: Append-only results with:
  - Relation to LabOrder
  - Text and file URL support (PDF/image reports)
  - Result status tracking
  - RecordedBy user tracking
- **Relations**: Added to Patient, Consultation, and User models
- **Domain**: Added ORDERS to Domain enum in foundation.prisma

### 2. Module Structure

```
backend/src/modules/orders/
├── controllers/
│   └── lab-order.controller.ts
├── services/
│   └── lab-order.service.ts
├── repositories/
│   └── lab-order.repository.ts
├── dto/
│   ├── create-lab-order.dto.ts
│   ├── approve-lab-order.dto.ts
│   ├── record-result.dto.ts
│   ├── cancel-lab-order.dto.ts
│   └── list-orders.dto.ts
├── events/
│   └── orders.events.ts
└── orders.module.ts
```

### 3. Business Rules Implementation

**Doctor/Surgeon:**
- ✅ Can create orders
- ✅ Can approve orders
- ✅ Can view results
- ✅ Can cancel orders

**Nurse:**
- ✅ Can view assigned orders
- ❌ Cannot approve orders
- ❌ Cannot create orders

**Lab Tech (LAB_TECH role):**
- ✅ Can record results
- ✅ Can upload PDF results
- ✅ Can amend results
- ❌ Cannot approve or create orders

**Front Desk:**
- ❌ Cannot access orders (403 Forbidden)

**Admin:**
- ✅ Full access including override
- ✅ Can archive orders
- ✅ Can audit all operations

### 4. Workflow State Machine

**Order Lifecycle:**
1. **CREATED** - Doctor creates order
2. **APPROVED** - Doctor/Admin approves order
3. **IN_PROGRESS** - Lab processes sample
4. **COMPLETED** - Result recorded (automatic when result is created)
5. **CANCELLED** - Order cancelled (terminal state)

**Valid State Transitions:**
- CREATED → APPROVED | CANCELLED
- APPROVED → IN_PROGRESS | CANCELLED
- IN_PROGRESS → COMPLETED | CANCELLED
- COMPLETED → (terminal)
- CANCELLED → (terminal)

**Invalid transitions are blocked** unless ADMIN explicitly overrides.

### 5. API Endpoints (`/api/v1/orders/labs`)

- `POST /` - Create lab order
- `GET /:id` - Get single order by ID
- `GET /by-consultation/:consultationId` - List orders for consultation
- `POST /:id/approve` - Approve order
- `POST /:id/result` - Record lab result (auto-creates EMR addendum)
- `POST /:id/cancel` - Cancel order
- `POST /:id/archive` - Archive order (ADMIN only)

### 6. Features Implemented

✅ **Workflow State Machine**: Validated state transitions
✅ **Role-Based Access Control**: Integrated with existing RBAC system
✅ **Consultation Integration**: Orders tied to consultations (required)
✅ **Patient RLS**: Uses existing patient row-level security validation
✅ **Audit Trail**: All operations emit domain events
✅ **Optimistic Locking**: Version field prevents concurrent modification conflicts
✅ **Soft Deletes**: Archive instead of hard delete
✅ **Append-Only Results**: Results cannot be deleted, only amended
✅ **EMR Integration**: Auto-creates addendum when result is recorded
✅ **Event-Driven**: Domain events for all state changes

### 7. EMR Auto-Integration

When a lab result is recorded:
1. Order status automatically changes to COMPLETED
2. Domain event `RESULT_RECORDED` is emitted
3. System automatically creates EMR addendum with result summary:
   - Test name and priority
   - Result status
   - Result text (if provided)
   - File URL (if PDF/image attached)
   - Timestamp

The addendum is attached to the most recent SOAP note for the consultation, ensuring results are immediately visible in the clinical record.

### 8. Domain Events

All order operations emit domain events:
- `LabOrder.Created` - When order is created
- `LabOrder.Approved` - When order is approved
- `LabOrder.Cancelled` - When order is cancelled
- `LabOrder.StatusChanged` - When order status changes
- `LabResult.Recorded` - When result is recorded
- `LabResult.Amended` - When result is amended (future)
- `LabOrder.Archived` - When order is archived

Each event includes:
- orderId/resultId
- patientId
- consultationId
- status/resultStatus
- actor (orderedById, approvedById, recordedById, etc.)
- timestamp

### 9. Integration Points

The Orders module integrates with:
- **Consultation Module**: Orders require valid consultation
- **Patient Module**: Uses patient RLS validation
- **EMR Module**: Auto-creates addendums on result recording
- **RBAC System**: Role-based permissions
- **Audit System**: Domain events and access logging
- **Auth System**: User identity and session tracking
- **Billing Module**: Ready for future billing integration via domain events

## Next Steps: Database Migration

Run the Prisma migration to create the database tables:

```bash
cd backend
npx prisma migrate dev --name add_lab_orders
npx prisma generate
```

This will:
1. Create the `OrderType`, `OrderStatus`, and `ResultStatus` enums
2. Create the `lab_orders` table
3. Create the `lab_results` table
4. Add foreign key constraints to Patient, Consultation, and User
5. Create indexes for performance

## Testing Scenarios

### Manual Validation Steps

1. **Doctor Creates Order**
   ```bash
   POST /api/v1/orders/labs
   Authorization: Bearer <doctor_token>
   Body: {
     consultationId: "...",
     testName: "Complete Blood Count",
     priority: "ROUTINE"
   }
   ```
   Expected: ✅ Order created with CREATED status

2. **Doctor Approves Order**
   ```bash
   POST /api/v1/orders/labs/:id/approve
   Authorization: Bearer <doctor_token>
   ```
   Expected: ✅ Status → APPROVED

3. **Lab Tech Records Result**
   ```bash
   POST /api/v1/orders/labs/:id/result
   Authorization: Bearer <lab_tech_token>
   Body: {
     resultText: "WBC: 7.2, RBC: 4.5, Hgb: 14.2",
     resultStatus: "AVAILABLE"
   }
   ```
   Expected: ✅ Result recorded, order status → COMPLETED, EMR addendum created

4. **Front Desk Attempts Access - SHOULD FAIL**
   ```bash
   GET /api/v1/orders/labs/by-consultation/:consultationId
   Authorization: Bearer <front_desk_token>
   ```
   Expected: ❌ 403 Forbidden - FRONT_DESK role cannot access orders

5. **Nurse Attempts to Approve - SHOULD FAIL**
   ```bash
   POST /api/v1/orders/labs/:id/approve
   Authorization: Bearer <nurse_token>
   ```
   Expected: ❌ 403 Forbidden - Only DOCTOR/SURGEON/ADMIN can approve

6. **Invalid State Transition - SHOULD FAIL**
   ```bash
   # Try to cancel a COMPLETED order
   POST /api/v1/orders/labs/:id/cancel
   # When order is already COMPLETED
   ```
   Expected: ❌ 400 Bad Request - Invalid state transition

7. **List Orders by Consultation**
   ```bash
   GET /api/v1/orders/labs/by-consultation/:consultationId
   Authorization: Bearer <doctor_token>
   ```
   Expected: ✅ Returns all orders with results

8. **Admin Archives Order**
   ```bash
   POST /api/v1/orders/labs/:id/archive
   Authorization: Bearer <admin_token>
   ```
   Expected: ✅ Order archived (soft delete)

9. **Result with PDF Attachment**
   ```bash
   POST /api/v1/orders/labs/:id/result
   Authorization: Bearer <lab_tech_token>
   Body: {
     resultText: "See attached report",
     fileUrl: "https://storage.example.com/reports/report-123.pdf",
     resultStatus: "AVAILABLE"
   }
   ```
   Expected: ✅ Result with file URL, EMR addendum includes file link

10. **Version Conflict - SHOULD FAIL**
    ```bash
    # Two concurrent approval requests with same version
    ```
    Expected: ❌ 409 Conflict - Version mismatch

## Design Decisions

### Why Workflow State Machine?

Orders represent a clinical process with strict sequencing requirements. A state machine:
- Enforces clinical workflow integrity
- Prevents invalid operations (e.g., recording result before approval)
- Makes workflow explicit and auditable
- Supports role-based restrictions per state

### Why Auto-Create EMR Addendum?

When lab results are available, they must be immediately visible in the clinical record. Auto-creating addendums:
- Ensures results are never missed
- Maintains chronological record
- Links results to consultation context
- Supports billing integration (results trigger charges)

### Why Append-Only Results?

Lab results must maintain an immutable audit trail. Append-only design ensures:
- Complete history of all results
- Legal defensibility in court
- HIPAA compliance for clinical documentation
- Amendment tracking (future: RESULT_AMENDED events)

### Why Soft Delete Only?

Clinical data must never be permanently deleted. Archiving:
- Preserves data for legal discovery
- Maintains audit trail integrity
- Complies with medical record retention requirements
- Allows recovery if needed

### Why Consultation Requirement?

Orders must be tied to a clinical encounter (consultation) to:
- Provide clinical context
- Link to billing and EMR
- Enable workflow tracking
- Support care continuity

## Compliance & Security

✅ **Workflow Integrity**: State machine enforces valid transitions
✅ **Audit Trail**: All operations emit domain events
✅ **Access Control**: Row-level security via patient RLS
✅ **Immutability**: Results are append-only
✅ **Authorization**: Role-based permissions enforced
✅ **Soft Deletes**: No hard deletes (archive only)
✅ **Version Control**: Optimistic locking prevents conflicts

## Integration Constraints Followed

✅ **No embedded results in consultations**: Results stored separately
✅ **No mutation of existing results**: Append-only architecture
✅ **Reused existing RLS checks**: Uses `canAccessPatient()`
✅ **Reused domain events**: Integrated with DomainEventService
✅ **Reused audit utils**: DataAccessLogInterceptor applied
✅ **Reused soft delete patterns**: Archive with archivedAt/archivedBy
✅ **No breaking changes**: Consultation and EMR modules unchanged

## File Structure

### Created Files
- `prisma/schema/orders.prisma` - Database schema
- `src/modules/orders/` - Complete module structure
- `backend/docs/ORDERS_MODULE_IMPLEMENTATION.md` - This documentation

### Modified Files
- `prisma/schema/foundation.prisma` - Added ORDERS domain
- `prisma/schema/patient.prisma` - Added labOrders relation
- `prisma/schema/consultation.prisma` - Added labOrders relation
- `prisma/schema/rbac.prisma` - Added order/user relations
- `prisma/scripts/merge-schema.js` - Added orders.prisma to merge order
- `src/app.module.ts` - Added OrdersModule

## Future Enhancements

### Ready for Integration
- **Billing**: Domain events can trigger billing charges when results are recorded
- **Imaging Orders**: OrderType enum extensible for future order types
- **Result Amendments**: ResultStatus.AMENDED ready for amendment workflow
- **Notification System**: Domain events can trigger notifications to ordering physician

### Potential Additions
- Order templates (common lab panels)
- Sample collection tracking
- Result interpretation/clinical significance
- Integration with external lab systems (HL7, FHIR)
- Batch result upload

## Acceptance Criteria ✅

✅ Orders link to patients + consultations
✅ Results append-only (no deletion)
✅ EMR updates automatically (addendum created)
✅ Billing hooks ready (domain events emitted)
✅ No data deletion (archive only)
✅ Full audit trail (domain events)
✅ Role restricted (enforced)
✅ Safe + incremental (no breaking changes)
✅ Workflow state machine (validated transitions)
✅ Optimistic locking (version conflicts handled)









