# Consultation Module Implementation

## Overview

The Consultation module has been successfully implemented as a state machine-based clinical encounter management system. It acts as the central anchor for clinical encounters and integrates with downstream workflows including EMR notes, orders, pharmacy, surgical requests, consents, billing, and scheduling.

## What Was Implemented

### 1. Prisma Schema (`prisma/schema/consultation.prisma`)

- **ConsultationStatus Enum**: 9 states (SCHEDULED, CHECKED_IN, IN_TRIAGE, IN_CONSULTATION, PLAN_CREATED, CLOSED, FOLLOW_UP, REFERRED, SURGERY_SCHEDULED)
- **Consultation Model**: Complete with patient/doctor relations, clinical fields, audit fields, and version control
- **Relations**: Added to Patient and User (doctor) models
- **Domain**: Added CONSULTATION to Domain enum in foundation.prisma

### 2. Module Structure

```
backend/src/modules/consultation/
├── controllers/
│   └── consultation.controller.ts
├── services/
│   └── consultation.service.ts
├── repositories/
│   └── consultation.repository.ts
├── dto/
│   ├── create-consultation.dto.ts
│   ├── update-consultation.dto.ts
│   ├── finalize-plan.dto.ts
│   ├── schedule-follow-up.dto.ts
│   ├── refer-consultation.dto.ts
│   └── override-state.dto.ts
├── events/
│   └── consultation.events.ts
└── consultation.module.ts
```

### 3. State Machine Implementation

**Valid State Transitions:**
- SCHEDULED → CHECKED_IN
- CHECKED_IN → IN_TRIAGE
- IN_TRIAGE → IN_CONSULTATION
- IN_CONSULTATION → PLAN_CREATED
- PLAN_CREATED → CLOSED | FOLLOW_UP | REFERRED | SURGERY_SCHEDULED

**Illegal transitions are blocked** unless ADMIN explicitly overrides (all overrides are audited).

### 4. Role-Based Permissions

**FRONT_DESK:**
- ✅ Create consultation (SCHEDULED)
- ✅ Check-in patient
- ❌ Cannot edit clinical information
- ❌ Cannot close consultation

**NURSE:**
- ✅ Move to IN_TRIAGE
- ✅ Capture vitals + triage notes (via EMR module)
- ❌ Cannot diagnose
- ❌ Cannot prescribe
- ❌ Cannot close visit

**DOCTOR / SURGEON:**
- ✅ Start consultation (IN_CONSULTATION)
- ✅ Create plan (PLAN_CREATED)
- ✅ Create orders (via Orders module)
- ✅ Request surgery
- ✅ Close consultation
- ✅ Request follow-up
- ✅ Refer patient

**ADMIN:**
- ✅ All actions
- ✅ May override state transitions (MUST be audited)

### 5. API Endpoints (`/api/v1/consultations`)

- `POST /` - Create consultation
- `GET /` - List consultations (paginated)
- `GET /:id` - Get consultation by ID
- `PATCH /:id` - Update consultation
- `POST /:id/check-in` - Check in patient
- `POST /:id/triage` - Start triage
- `POST /:id/start` - Start consultation
- `POST /:id/plan` - Finalize plan
- `POST /:id/close` - Close consultation
- `POST /:id/follow-up` - Schedule follow-up
- `POST /:id/refer` - Refer patient
- `POST /:id/schedule-surgery` - Schedule surgery request
- `POST /:id/override-state` - Override state (ADMIN only)
- `POST /:id/archive` - Archive consultation

### 6. Features Implemented

✅ **State Machine Validation**: All transitions validated against allowed states
✅ **Role-Based Access Control**: Integrated with existing RBAC system
✅ **Audit Trail**: All state changes emit domain events
✅ **Optimistic Locking**: Version field prevents concurrent modification conflicts
✅ **Soft Deletes**: Archive instead of hard delete
✅ **Billing Integration**: Check-in automatically creates consultation fee billing entry
✅ **Domain Events**: Complete event emission for all state transitions
✅ **RLS Integration**: Uses existing patient RLS validation

## Next Steps: Database Migration

Run the Prisma migration to create the database tables:

```bash
cd backend
npx prisma migrate dev --name add_consultation_module
```

This will:
1. Create the `ConsultationStatus` enum
2. Create the `consultations` table
3. Add foreign key constraints
4. Create indexes

## Testing Scenarios

### Manual Validation Steps

1. **Front Desk Schedules Consultation**
   ```bash
   POST /api/v1/consultations
   Authorization: Bearer <front_desk_token>
   Body: { patientId: "...", visitType: "INITIAL", reasonForVisit: "..." }
   ```
   Expected: Consultation created with SCHEDULED status

2. **Front Desk Checks In Patient**
   ```bash
   POST /api/v1/consultations/:id/check-in
   Authorization: Bearer <front_desk_token>
   ```
   Expected: Status → CHECKED_IN, billing entry created

3. **Nurse Triage (with permission)**
   ```bash
   POST /api/v1/consultations/:id/triage
   Authorization: Bearer <nurse_token>
   ```
   Expected: Status → IN_TRIAGE

4. **Nurse Triage (without permission) - SHOULD FAIL**
   ```bash
   POST /api/v1/consultations/:id/triage
   Authorization: Bearer <front_desk_token>
   ```
   Expected: 403 Forbidden

5. **Doctor Completes Consultation**
   ```bash
   POST /api/v1/consultations/:id/start
   Authorization: Bearer <doctor_token>
   
   POST /api/v1/consultations/:id/plan
   Authorization: Bearer <doctor_token>
   Body: { clinicalSummary: "...", diagnoses: {...} }
   
   POST /api/v1/consultations/:id/close
   Authorization: Bearer <doctor_token>
   ```
   Expected: Successful state transitions

6. **Illegal State Transition - SHOULD FAIL**
   ```bash
   POST /api/v1/consultations/:id/close
   # When consultation is in SCHEDULED status
   ```
   Expected: 400 Bad Request - Invalid state transition

7. **Admin Override State**
   ```bash
   POST /api/v1/consultations/:id/override-state
   Authorization: Bearer <admin_token>
   Body: { newStatus: "CLOSED", reason: "Emergency closure" }
   ```
   Expected: Status changed, override event emitted

8. **Version Conflict - SHOULD FAIL**
   ```bash
   # Two concurrent update requests with same version
   ```
   Expected: 409 Conflict - Version mismatch

9. **Archive Consultation**
   ```bash
   POST /api/v1/consultations/:id/archive
   Authorization: Bearer <admin_token>
   ```
   Expected: Consultation archived (soft delete), data preserved

## Design Decisions

### Why State Machine Instead of Simple CRUD?

Consultations represent clinical workflows with strict ordering and validation requirements. A state machine:
- Enforces clinical workflow integrity
- Prevents invalid operations (e.g., closing before triage)
- Makes workflow explicit and auditable
- Supports role-based restrictions per state

### Why Separate Billing Integration?

Check-in automatically creates a billing entry for the consultation fee, following the event-driven architecture pattern. This ensures:
- Billing is never forgotten
- Complete traceability via domain events
- Separation of concerns (billing logic in billing module)

### Why Optimistic Locking?

Prevents race conditions when multiple users modify the same consultation simultaneously. Version conflicts return 409 Conflict, forcing users to refresh and retry.

### Why Archive Instead of Delete?

Compliance requirement: clinical data must never be deleted. Archiving preserves data for legal and audit purposes while removing it from active workflows.

## Integration Points

The Consultation module is designed to integrate with:

- **EMR Module**: Notes reference consultationId
- **Orders Module**: Orders link to consultationId
- **Pharmacy Module**: Prescriptions linked to consultationId
- **Theater Module**: Surgical requests from SURGERY_SCHEDULED status
- **Consent Module**: Consents tied to consultationId
- **Billing Module**: Check-in creates billing entry
- **Scheduling Module**: Follow-ups create appointment records

## Compliance & Security

✅ **Audit Trail**: All state changes emit domain events
✅ **Access Control**: Row-level security via patient RLS
✅ **Immutability**: Clinical data changes are versioned
✅ **Authorization**: Role-based permissions enforced
✅ **Soft Deletes**: No hard deletes (archive only)
✅ **Override Auditing**: Admin overrides are explicitly logged









