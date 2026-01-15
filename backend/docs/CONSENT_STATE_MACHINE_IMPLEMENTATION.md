# Consent State Machine Service - Implementation Summary

## Overview

A TypeScript state machine service has been implemented to enforce strict state transition rules and immutability constraints for medical consent documents. This service is critical for legal defensibility in healthcare.

## Implementation Status

✅ **COMPLETE** - Service integrated into ConsentModule and ready for use.

## Files Created

### 1. Exception Classes
**File**: `/backend/src/modules/consent/exceptions/consent-state-machine.exceptions.ts`

Three custom exception classes:
- `ImmutableDocumentError` - For immutable document violations (403 Forbidden)
- `InvalidStateTransitionError` - For invalid state transitions (400 Bad Request)
- `ImmutableSignatureError` - For signature modification attempts (403 Forbidden)

### 2. State Machine Service
**File**: `/backend/src/modules/consent/services/consent-state-machine.service.ts`

Service with validation methods:
- `validateStateTransition()` - Enforces allowed state transitions
- `validateAnnotationOperation()` - Blocks annotation edits after SIGNED
- `validateSignatureOperation()` - Prevents signature modifications
- `validatePDFRegeneration()` - Blocks PDF regeneration after READY_FOR_SIGNATURE
- Helper methods for state checking and metadata

### 3. Documentation
**File**: `/backend/src/modules/consent/services/USAGE_CONSENT_STATE_MACHINE.md`

Comprehensive usage guide with examples and best practices.

## Module Integration

**File**: `/backend/src/modules/consent/consent.module.ts`

The service has been:
- ✅ Imported in the module
- ✅ Added to providers array
- ✅ Added to exports array (available to other modules if needed)

## State Flow

```
DRAFT → READY_FOR_SIGNATURE → PARTIALLY_SIGNED → SIGNED → REVOKED/ARCHIVED
  ↓                              ↓                ↓
ARCHIVED                       ARCHIVED         REVOKED → ARCHIVED
```

## Key Features

### 1. State Transition Validation
- Enforces allowed transitions only
- Throws `InvalidStateTransitionError` for invalid transitions
- Allows same-state transitions (idempotent operations)

### 2. Annotation Operation Validation
- CREATE/UPDATE/DELETE allowed in: DRAFT, READY_FOR_SIGNATURE, PARTIALLY_SIGNED
- All operations blocked in: SIGNED, REVOKED, ARCHIVED
- Additional check for locked documents (lockedAt timestamp)
- Throws `ImmutableDocumentError` for blocked operations

### 3. Signature Operation Validation
- CREATE allowed (subject to state machine rules)
- UPDATE/DELETE never allowed (signatures are immutable)
- Throws `ImmutableSignatureError` for modification attempts

### 4. PDF Regeneration Validation
- Regeneration allowed only in: DRAFT
- Blocked if signatures exist (additional safety check)
- Blocked after leaving DRAFT state
- Throws `ImmutableDocumentError` for blocked operations

## Usage Example

```typescript
import { Injectable } from '@nestjs/common';
import { ConsentStateMachineService, AnnotationOperation } from './services/consent-state-machine.service';
import { ConsentStatus } from '@prisma/client';

@Injectable()
export class PDFConsentService {
  constructor(
    private readonly stateMachine: ConsentStateMachineService,
  ) {}

  async createAnnotation(consentId: string, annotationData: any, userId: string) {
    const consent = await this.repository.findConsentById(consentId);
    
    // Validate annotation operation
    this.stateMachine.validateAnnotationOperation(
      consent.status,
      AnnotationOperation.CREATE,
      consent.id,
      consent.lockedAt,
    );
    
    // Proceed with annotation creation
    return await this.repository.createAnnotation({
      consentId: consent.id,
      ...annotationData,
      createdById: userId,
    });
  }
}
```

## Type Safety

The service uses TypeScript enums for full type safety:
- `ConsentStatus` (from Prisma)
- `AnnotationOperation` (CREATE, UPDATE, DELETE)
- `SignatureOperation` (CREATE, UPDATE, DELETE)

## Legal Compliance

All validation rules are **non-negotiable** for legal defensibility:
- ✅ State transitions are immutable once SIGNED
- ✅ Signatures are immutable once created
- ✅ Annotations are immutable once document is SIGNED
- ✅ PDF regeneration is blocked after leaving DRAFT state

## Next Steps

1. **Integration**: Use the service in existing consent services (PDFConsentService, etc.)
2. **Testing**: Add unit tests for state machine validation logic
3. **Migration**: Update existing code to use state machine service instead of inline validation
4. **Documentation**: Update API documentation to reflect state machine rules

## Files Modified

- `/backend/src/modules/consent/consent.module.ts` - Added ConsentStateMachineService to providers and exports

## Testing Recommendations

1. **Unit Tests**: Test each validation method with valid and invalid inputs
2. **State Transition Tests**: Test all allowed and disallowed transitions
3. **Edge Cases**: Test same-state transitions, terminal states, etc.
4. **Error Handling**: Test exception types and error messages

## References

- **Usage Guide**: `/backend/src/modules/consent/services/USAGE_CONSENT_STATE_MACHINE.md`
- **State Machine Service**: `/backend/src/modules/consent/services/consent-state-machine.service.ts`
- **Exception Classes**: `/backend/src/modules/consent/exceptions/consent-state-machine.exceptions.ts`
- **Architecture Design**: `/client/docs/INTERACTIVE_PDF_CONSENT_ARCHITECTURE.md`








