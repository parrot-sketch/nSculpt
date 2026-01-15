# Patient Lifecycle State Machine - Implementation Summary

## Files Created

### Core Implementation
1. **`patient-lifecycle-state.enum.ts`** - Authoritative lifecycle state enum
2. **`exceptions/patient-lifecycle.exceptions.ts`** - Domain-specific exceptions
3. **`services/patient-lifecycle.service.ts`** - Main lifecycle engine (782 lines)
4. **`services/patient-lifecycle.service.example.ts`** - Comprehensive usage examples

### Documentation
5. **`README_PATIENT_LIFECYCLE.md`** - Complete usage guide
6. **`IMPLEMENTATION_SUMMARY.md`** - This file

### Database Migration
7. **`../../../../prisma/migrations/add-patient-lifecycle-state.sql`** - Migration script

## Module Integration

### Updated Files
- **`patient.module.ts`** - Added `PatientLifecycleService` to providers and exports

## Implementation Details

### Lifecycle States (15 states)
```typescript
REGISTERED → VERIFIED → INTAKE_IN_PROGRESS → INTAKE_COMPLETED → 
INTAKE_VERIFIED → CONSULTATION_REQUESTED → CONSULTATION_APPROVED → 
APPOINTMENT_SCHEDULED → CONSULTATION_COMPLETED → PROCEDURE_PLANNED → 
CONSENT_SIGNED → SURGERY_SCHEDULED → SURGERY_COMPLETED → FOLLOW_UP → DISCHARGED
```

### Transition Rules Enforced

| From State | To State | Allowed Roles | Required Data |
|------------|----------|---------------|---------------|
| REGISTERED | VERIFIED | ADMIN | - |
| VERIFIED | INTAKE_IN_PROGRESS | PATIENT | - |
| INTAKE_IN_PROGRESS | INTAKE_COMPLETED | PATIENT | intakeCompleted |
| INTAKE_COMPLETED | INTAKE_VERIFIED | NURSE, ADMIN | intakeCompleted, intakeVerified |
| INTAKE_VERIFIED | CONSULTATION_REQUESTED | PATIENT | intakeVerified |
| CONSULTATION_REQUESTED | CONSULTATION_APPROVED | ADMIN, DOCTOR, SURGEON | consultationRequested |
| CONSULTATION_APPROVED | APPOINTMENT_SCHEDULED | ADMIN, SYSTEM | consultationApproved, appointmentScheduled |
| APPOINTMENT_SCHEDULED | CONSULTATION_COMPLETED | DOCTOR, SURGEON, ADMIN | appointmentScheduled, consultationCompleted |
| CONSULTATION_COMPLETED | PROCEDURE_PLANNED | DOCTOR, SURGEON, ADMIN | consultationCompleted, procedurePlanExists |
| PROCEDURE_PLANNED | CONSENT_SIGNED | PATIENT, ADMIN | procedurePlanExists, consentSigned |
| CONSENT_SIGNED | SURGERY_SCHEDULED | ADMIN, DOCTOR, SURGEON | consentSigned, surgeryScheduled |
| SURGERY_SCHEDULED | SURGERY_COMPLETED | DOCTOR, SURGEON, ADMIN | surgeryScheduled, surgeryCompleted |
| SURGERY_COMPLETED | FOLLOW_UP | SYSTEM | - |
| FOLLOW_UP | DISCHARGED | DOCTOR, SURGEON, ADMIN | followUpNotesExist |

### Data Validation

The service validates required data before allowing transitions:

- **Intake Validation**: Checks for completed and verified intake forms
- **Consultation Validation**: Checks for consultation requests/approvals
- **Appointment Validation**: Verifies confirmed appointments exist
- **Procedure Plan Validation**: Ensures approved procedure plans exist
- **Consent Validation**: Checks both PDF consents and structured consents for SIGNED status
- **Surgery Validation**: Verifies surgical cases exist with correct status
- **Follow-up Validation**: Ensures follow-up notes exist before discharge

### Domain Events Emitted

Every transition emits:
```typescript
{
  eventType: 'PatientLifecycleTransitioned',
  domain: Domain.MEDICAL_RECORDS,
  aggregateId: patientId,
  aggregateType: 'Patient',
  payload: {
    patientId,
    from: PatientLifecycleState,
    to: PatientLifecycleState,
    actorUserId: string,
    actorRole: string,
    timestamp: string,
    context: Record<string, any>,
  },
}
```

### Audit Logging

Every transition is logged:
- **Action**: `PATIENT_LIFECYCLE_TRANSITION`
- **ResourceType**: `Patient`
- **AccessedPHI**: `true`
- **Reason**: Transition description

## Database Schema Requirement

**CRITICAL:** Before using this service, run the migration:

```sql
-- File: prisma/migrations/add-patient-lifecycle-state.sql
ALTER TABLE patients 
ADD COLUMN lifecycle_state VARCHAR(50) DEFAULT 'REGISTERED';

-- ... (see full migration file)
```

Or add to Prisma schema:
```prisma
model Patient {
  // ... existing fields
  lifecycleState String? @db.VarChar(50) @default("REGISTERED")
  // ... rest of model
}
```

## Usage Examples

See `patient-lifecycle.service.example.ts` for comprehensive examples including:
- Patient self-registration
- Admin verification
- Intake completion
- Consultation request/approval
- Appointment scheduling
- Consultation completion
- Procedure planning
- Consent signing
- Surgery scheduling/completion
- Patient discharge
- Error handling patterns

## Next Steps

1. **Run Database Migration**: Add `lifecycleState` field to Patient model
2. **Update Prisma Client**: Run `npx prisma generate`
3. **Integration**: Wire service into existing controllers
4. **Testing**: Add unit and integration tests
5. **Event Handlers**: Create event handlers for automatic transitions (e.g., SURGERY_COMPLETED → FOLLOW_UP)

## Important Notes

- **Single Authority**: Only `PatientLifecycleService` should update lifecycle state
- **Idempotent**: Transitioning to the same state is allowed (no-op)
- **Terminal States**: `DISCHARGED` cannot be transitioned from
- **SYSTEM Role**: Some transitions are SYSTEM-only (handled by event handlers)
- **Context Required**: Some transitions require context (e.g., `consentId`)
- **Defensive Coding**: Handles missing models gracefully (for future schema additions)

## Testing Checklist

- [ ] Unit tests for all transition rules
- [ ] Unit tests for role authorization
- [ ] Unit tests for data validation
- [ ] Integration tests with real database
- [ ] Error handling tests
- [ ] Idempotent operation tests
- [ ] Terminal state tests
- [ ] Domain event emission tests
- [ ] Audit log verification tests
