# Patient Lifecycle State Machine

**Authoritative state machine for patient progression through clinical workflow.**

## Overview

The `PatientLifecycleService` is the **single authority** that governs patient progression through the clinical workflow. Controllers and other services **MUST NOT** update patient lifecycle state directly - they **MUST** call this service to ensure consistency, validation, and auditability.

## Architecture

### Core Components

1. **PatientLifecycleState Enum** - Authoritative lifecycle states
2. **PatientLifecycleService** - State transition engine
3. **Domain Exceptions** - Specific errors for lifecycle violations
4. **Transition Rules** - Role-based authorization and data validation

### State Machine Flow

```
REGISTERED
  ↓ (ADMIN/SYSTEM)
VERIFIED
  ↓ (PATIENT)
INTAKE_IN_PROGRESS
  ↓ (PATIENT)
INTAKE_COMPLETED
  ↓ (NURSE/ADMIN)
INTAKE_VERIFIED
  ↓ (PATIENT)
CONSULTATION_REQUESTED
  ↓ (ADMIN/DOCTOR)
CONSULTATION_APPROVED
  ↓ (SYSTEM/ADMIN)
APPOINTMENT_SCHEDULED
  ↓ (DOCTOR)
CONSULTATION_COMPLETED
  ↓ (DOCTOR)
PROCEDURE_PLANNED
  ↓ (PATIENT)
CONSENT_SIGNED
  ↓ (ADMIN/DOCTOR)
SURGERY_SCHEDULED
  ↓ (DOCTOR)
SURGERY_COMPLETED
  ↓ (SYSTEM - automatic)
FOLLOW_UP
  ↓ (DOCTOR)
DISCHARGED (TERMINAL)
```

## Usage

### Basic Transition

```typescript
import { PatientLifecycleService } from './domain/services/patient-lifecycle.service';
import { PatientLifecycleState } from './domain/patient-lifecycle-state.enum';

// In your service or controller
await this.lifecycleService.transitionPatient(
  patientId,
  PatientLifecycleState.VERIFIED,
  {
    userId: adminUserId,
    role: 'ADMIN',
  },
  {
    reason: 'Admin verified patient identity',
  },
);
```

### With Context

```typescript
// Transitioning to CONSENT_SIGNED requires consentId in context
await this.lifecycleService.transitionPatient(
  patientId,
  PatientLifecycleState.CONSENT_SIGNED,
  {
    userId: patientUserId,
    role: 'PATIENT',
  },
  {
    reason: 'Patient signed consent',
    consentId: 'consent-uuid-here',
  },
);
```

### Check Allowed Transitions

```typescript
// Get current state
const currentState = await this.lifecycleService.getCurrentState(patientId);

// Get allowed next states
const allowedStates = await this.lifecycleService.getAllowedNextStates(patientId);

// Check if specific transition is allowed for actor
const canTransition = await this.lifecycleService.canTransition(
  patientId,
  PatientLifecycleState.CONSENT_SIGNED,
  {
    userId: patientUserId,
    role: 'PATIENT',
  },
);
```

## Transition Rules

### Role Authorization

Each transition requires specific roles:

- **REGISTERED → VERIFIED**: ADMIN or SYSTEM
- **VERIFIED → INTAKE_IN_PROGRESS**: PATIENT
- **INTAKE_COMPLETED → INTAKE_VERIFIED**: NURSE or ADMIN
- **CONSULTATION_REQUESTED → CONSULTATION_APPROVED**: ADMIN, DOCTOR, or SURGEON
- **SYSTEM-only transitions**: Empty `allowedRoles` array (e.g., SURGERY_COMPLETED → FOLLOW_UP)

### Data Validation

Each transition validates required data exists:

- **INTAKE_COMPLETED**: Requires completed intake form
- **CONSENT_SIGNED**: Requires signed consent record
- **SURGERY_SCHEDULED**: Requires surgical case record
- **DISCHARGED**: Requires follow-up notes

## Error Handling

The service throws domain-specific exceptions:

```typescript
try {
  await this.lifecycleService.transitionPatient(...);
} catch (error) {
  if (error instanceof InvalidPatientLifecycleTransitionError) {
    // Invalid transition (e.g., DISCHARGED → VERIFIED)
    console.error('Invalid transition:', error.fromState, '→', error.toState);
  } else if (error instanceof UnauthorizedLifecycleTransitionError) {
    // Actor lacks permission (e.g., PATIENT trying to VERIFY)
    console.error('Unauthorized:', error.actorRole, 'cannot transition');
  } else if (error instanceof MissingRequiredDataError) {
    // Required data doesn't exist (e.g., no consent for CONSENT_SIGNED)
    console.error('Missing data:', error.missingData);
  } else if (error instanceof PatientLifecycleNotFoundError) {
    // Patient doesn't exist
    console.error('Patient not found:', error.patientId);
  }
}
```

## Database Schema Requirement

**CRITICAL:** The Patient model must have a `lifecycleState` field:

```prisma
model Patient {
  // ... existing fields
  lifecycleState String? @db.VarChar(50) @default("REGISTERED")
  // ... rest of model
}
```

**Migration Required:**
```sql
ALTER TABLE patients 
ADD COLUMN lifecycle_state VARCHAR(50) DEFAULT 'REGISTERED';

CREATE INDEX idx_patients_lifecycle_state ON patients(lifecycle_state);
```

## Domain Events

Every transition emits a `PatientLifecycleTransitioned` event:

```typescript
{
  eventType: 'PatientLifecycleTransitioned',
  domain: Domain.MEDICAL_RECORDS,
  aggregateId: patientId,
  aggregateType: 'Patient',
  payload: {
    patientId: string,
    from: PatientLifecycleState,
    to: PatientLifecycleState,
    actorUserId: string,
    actorRole: string,
    timestamp: string,
    context: Record<string, any>,
  },
}
```

## Audit Logging

Every transition is logged to `DataAccessLog`:

- **Action**: `PATIENT_LIFECYCLE_TRANSITION`
- **ResourceType**: `Patient`
- **AccessedPHI**: `true`
- **Reason**: Transition description (e.g., "Patient lifecycle transition: REGISTERED → VERIFIED")

## Integration

### In Controllers

```typescript
@Controller('patients')
export class PatientController {
  constructor(
    private readonly lifecycleService: PatientLifecycleService,
  ) {}

  @Post(':id/verify')
  async verifyPatient(@Param('id') patientId: string, @CurrentUser() user: UserIdentity) {
    await this.lifecycleService.transitionPatient(
      patientId,
      PatientLifecycleState.VERIFIED,
      {
        userId: user.id,
        role: user.roles[0], // Get primary role
      },
    );
    
    return { success: true };
  }
}
```

### In Services

```typescript
@Injectable()
export class ConsultationService {
  constructor(
    private readonly lifecycleService: PatientLifecycleService,
  ) {}

  async completeConsultation(consultationId: string, doctorId: string) {
    // ... complete consultation logic
    
    // Transition patient lifecycle
    const consultation = await this.consultationRepository.findById(consultationId);
    await this.lifecycleService.transitionPatient(
      consultation.patientId,
      PatientLifecycleState.CONSULTATION_COMPLETED,
      {
        userId: doctorId,
        role: 'DOCTOR',
      },
      {
        consultationId,
      },
    );
  }
}
```

## Testing

### Unit Tests

```typescript
describe('PatientLifecycleService', () => {
  it('should allow REGISTERED → VERIFIED transition by ADMIN', async () => {
    await service.transitionPatient(
      patientId,
      PatientLifecycleState.VERIFIED,
      { userId: adminId, role: 'ADMIN' },
    );
    
    const state = await service.getCurrentState(patientId);
    expect(state).toBe(PatientLifecycleState.VERIFIED);
  });

  it('should reject invalid transition', async () => {
    await expect(
      service.transitionPatient(
        patientId,
        PatientLifecycleState.DISCHARGED,
        { userId: adminId, role: 'ADMIN' },
      ),
    ).rejects.toThrow(InvalidPatientLifecycleTransitionError);
  });

  it('should reject unauthorized role', async () => {
    await expect(
      service.transitionPatient(
        patientId,
        PatientLifecycleState.VERIFIED,
        { userId: patientId, role: 'PATIENT' }, // PATIENT cannot verify
      ),
    ).rejects.toThrow(UnauthorizedLifecycleTransitionError);
  });

  it('should reject missing required data', async () => {
    await expect(
      service.transitionPatient(
        patientId,
        PatientLifecycleState.CONSENT_SIGNED,
        { userId: patientId, role: 'PATIENT' },
      ),
    ).rejects.toThrow(MissingRequiredDataError);
  });
});
```

## Important Notes

1. **Single Authority**: Only `PatientLifecycleService` should update lifecycle state. Direct Prisma updates bypass validation.

2. **Idempotent Operations**: Transitioning to the same state is allowed (no-op).

3. **Terminal States**: `DISCHARGED` is terminal - no further transitions allowed.

4. **SYSTEM Role**: Some transitions (e.g., SURGERY_COMPLETED → FOLLOW_UP) are SYSTEM-only and happen automatically via event handlers.

5. **Context Required**: Some transitions require context (e.g., `consentId` for CONSENT_SIGNED). Always provide required context.

6. **Migration Required**: Add `lifecycleState` field to Patient model before using this service in production.

## Future Enhancements

- Event handlers for automatic transitions (e.g., SURGERY_COMPLETED → FOLLOW_UP)
- Workflow orchestration integration
- State machine visualization
- Transition history tracking
- Rollback support (with strict audit trail)
