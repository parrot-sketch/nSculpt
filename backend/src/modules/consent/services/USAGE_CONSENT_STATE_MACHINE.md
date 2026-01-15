# Consent State Machine Service - Usage Guide

## Overview

The `ConsentStateMachineService` enforces strict state transition rules and immutability constraints for medical consent documents. This service is critical for legal defensibility in healthcare.

## State Flow

```
DRAFT → READY_FOR_SIGNATURE → PARTIALLY_SIGNED → SIGNED → REVOKED/ARCHIVED
  ↓                              ↓                ↓
ARCHIVED                       ARCHIVED         REVOKED → ARCHIVED
```

## Integration

The service is registered in `ConsentModule` and can be injected into any service within the module.

### Basic Injection

```typescript
import { Injectable } from '@nestjs/common';
import { ConsentStateMachineService } from './consent-state-machine.service';
import { ConsentStatus } from '@prisma/client';
import { AnnotationOperation, SignatureOperation } from './consent-state-machine.service';

@Injectable()
export class PDFConsentService {
  constructor(
    private readonly stateMachine: ConsentStateMachineService,
    // ... other dependencies
  ) {}
}
```

## Usage Examples

### 1. Validate State Transition

**Scenario**: Transitioning consent from DRAFT to READY_FOR_SIGNATURE

```typescript
async sendForSignature(consentId: string, userId: string) {
  const consent = await this.repository.findConsentById(consentId);
  
  // Validate state transition
  this.stateMachine.validateStateTransition(
    consent.status,
    ConsentStatus.READY_FOR_SIGNATURE,
    consent.id,
  );
  
  // Proceed with transition
  await this.repository.updateConsentStatus(
    consent.id,
    ConsentStatus.READY_FOR_SIGNATURE,
    { sentForSignatureAt: new Date() },
  );
}
```

**Error Example**: Attempting invalid transition (DRAFT → SIGNED)

```typescript
// This will throw InvalidStateTransitionError
this.stateMachine.validateStateTransition(
  ConsentStatus.DRAFT,
  ConsentStatus.SIGNED,
  consentId,
);
// Error: "Cannot transition from DRAFT to SIGNED. Allowed transitions from DRAFT: READY_FOR_SIGNATURE, ARCHIVED"
```

### 2. Validate Annotation Operation

**Scenario**: Creating an annotation on a consent document

```typescript
async createAnnotation(
  consentId: string,
  annotationData: CreateAnnotationDto,
  userId: string,
) {
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
```

**Error Example**: Attempting to create annotation on SIGNED document

```typescript
// This will throw ImmutableDocumentError
this.stateMachine.validateAnnotationOperation(
  ConsentStatus.SIGNED,
  AnnotationOperation.CREATE,
  consentId,
  null,
);
// Error: "Cannot create annotations in state SIGNED. Annotation operations allowed only in: DRAFT, READY_FOR_SIGNATURE, PARTIALLY_SIGNED"
```

### 3. Validate Signature Operation

**Scenario**: Adding a signature to a consent document

```typescript
async addSignature(
  consentId: string,
  signatureData: SignPDFConsentDto,
  userId: string,
) {
  const consent = await this.repository.findConsentById(consentId);
  
  // Validate signature operation (only CREATE is allowed)
  this.stateMachine.validateSignatureOperation(
    SignatureOperation.CREATE,
  );
  
  // Additional state validation (done separately)
  this.stateMachine.validateStateTransition(
    consent.status,
    ConsentStatus.PARTIALLY_SIGNED, // or SIGNED
    consent.id,
  );
  
  // Proceed with signature creation
  return await this.repository.createSignature({
    consentId: consent.id,
    ...signatureData,
    signerId: userId,
  });
}
```

**Error Example**: Attempting to update a signature

```typescript
// This will throw ImmutableSignatureError
this.stateMachine.validateSignatureOperation(
  SignatureOperation.UPDATE,
  signatureId,
);
// Error: "Signature operation 'update' is not allowed. Signatures are immutable once created and cannot be modified or deleted."
```

### 4. Validate PDF Regeneration

**Scenario**: Regenerating PDF after placeholder changes

```typescript
async regeneratePDF(consentId: string, userId: string) {
  const consent = await this.repository.findConsentById(consentId);
  const signatures = await this.repository.findSignaturesByConsentId(consentId);
  
  // Validate PDF regeneration
  this.stateMachine.validatePDFRegeneration(
    consent.status,
    consent.id,
    signatures.length > 0,
  );
  
  // Proceed with PDF regeneration
  const newPdfBuffer = await this.pdfProcessing.mergePlaceholders(
    templateBuffer,
    placeholderValues,
  );
  
  const filePath = await this.pdfProcessing.savePDF(newPdfBuffer, filename);
  await this.repository.updateConsent(consent.id, {
    generatedPdfUrl: this.pdfProcessing.getFileUrl(filePath),
  });
}
```

**Error Example**: Attempting to regenerate PDF after READY_FOR_SIGNATURE

```typescript
// This will throw ImmutableDocumentError
this.stateMachine.validatePDFRegeneration(
  ConsentStatus.READY_FOR_SIGNATURE,
  consentId,
  false,
);
// Error: "Cannot regenerate PDF in state READY_FOR_SIGNATURE. PDF regeneration allowed only in DRAFT state."
```

## Helper Methods

### Check State Properties

```typescript
// Check if state is immutable
if (this.stateMachine.isImmutableState(consent.status)) {
  // Document cannot be modified
}

// Check if annotations are allowed
if (this.stateMachine.areAnnotationsAllowed(consent.status)) {
  // Annotations can be created/updated/deleted
}

// Check if PDF regeneration is allowed
if (this.stateMachine.isPDFRegenerationAllowed(consent.status)) {
  // PDF can be regenerated
}
```

### Get Allowed Next States

**Use Case**: UI showing available actions to user

```typescript
const allowedStates = this.stateMachine.getAllowedNextStates(
  consent.status,
);
// Returns: [ConsentStatus.READY_FOR_SIGNATURE, ConsentStatus.ARCHIVED]

// Use in UI to show buttons/actions
if (allowedStates.includes(ConsentStatus.READY_FOR_SIGNATURE)) {
  showButton('Send for Signature');
}
```

### Get State Machine Metadata

**Use Case**: Debugging, logging, or API documentation

```typescript
const metadata = this.stateMachine.getStateMachineMetadata();
console.log(metadata);
// Returns full state machine configuration
```

## Complete Example: Full Service Integration

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConsentStateMachineService, AnnotationOperation, SignatureOperation } from './consent-state-machine.service';
import { ConsentStatus } from '@prisma/client';
import { PDFConsentRepository } from '../repositories/pdf-consent.repository';

@Injectable()
export class PDFConsentService {
  private readonly logger = new Logger(PDFConsentService.name);

  constructor(
    private readonly repository: PDFConsentRepository,
    private readonly stateMachine: ConsentStateMachineService,
  ) {}

  async sendForSignature(consentId: string, userId: string) {
    const consent = await this.repository.findConsentById(consentId);
    
    // Validate state transition
    this.stateMachine.validateStateTransition(
      consent.status,
      ConsentStatus.READY_FOR_SIGNATURE,
      consent.id,
    );
    
    // Update status
    await this.repository.updateConsentStatus(
      consent.id,
      ConsentStatus.READY_FOR_SIGNATURE,
      { sentForSignatureAt: new Date() },
    );
    
    this.logger.log(`Consent ${consentId} sent for signature`);
  }

  async createAnnotation(consentId: string, annotationData: any, userId: string) {
    const consent = await this.repository.findConsentById(consentId);
    
    // Validate annotation operation
    this.stateMachine.validateAnnotationOperation(
      consent.status,
      AnnotationOperation.CREATE,
      consent.id,
      consent.lockedAt,
    );
    
    // Create annotation
    return await this.repository.createAnnotation({
      consentId: consent.id,
      ...annotationData,
      createdById: userId,
    });
  }

  async addSignature(consentId: string, signatureData: any, userId: string) {
    const consent = await this.repository.findConsentById(consentId);
    
    // Validate signature operation
    this.stateMachine.validateSignatureOperation(SignatureOperation.CREATE);
    
    // Determine next state
    const signatures = await this.repository.findSignaturesByConsentId(consentId);
    const nextStatus = this.determineNextStatus(signatures);
    
    // Validate state transition
    this.stateMachine.validateStateTransition(
      consent.status,
      nextStatus,
      consent.id,
    );
    
    // Create signature
    const signature = await this.repository.createSignature({
      consentId: consent.id,
      ...signatureData,
      signerId: userId,
    });
    
    // Update status if fully signed
    if (nextStatus === ConsentStatus.SIGNED) {
      await this.repository.updateConsentStatus(consent.id, nextStatus, {
        lockedAt: new Date(),
      });
    } else {
      await this.repository.updateConsentStatus(consent.id, nextStatus);
    }
    
    return signature;
  }

  async regeneratePDF(consentId: string, userId: string) {
    const consent = await this.repository.findConsentById(consentId);
    const signatures = await this.repository.findSignaturesByConsentId(consentId);
    
    // Validate PDF regeneration
    this.stateMachine.validatePDFRegeneration(
      consent.status,
      consent.id,
      signatures.length > 0,
    );
    
    // Regenerate PDF
    // ... implementation
  }

  private determineNextStatus(signatures: any[]): ConsentStatus {
    // Logic to determine if fully signed
    const hasPatient = signatures.some(s => s.signerType === 'PATIENT');
    const hasDoctor = signatures.some(s => s.signerType === 'DOCTOR');
    
    return hasPatient && hasDoctor
      ? ConsentStatus.SIGNED
      : ConsentStatus.PARTIALLY_SIGNED;
  }
}
```

## Error Handling

All validation methods throw typed exceptions that extend `HttpException`:

- `InvalidStateTransitionError` (400 Bad Request)
- `ImmutableDocumentError` (403 Forbidden)
- `ImmutableSignatureError` (403 Forbidden)

These exceptions include structured error details that can be serialized to JSON for API responses.

```typescript
try {
  this.stateMachine.validateStateTransition(from, to, consentId);
} catch (error) {
  if (error instanceof InvalidStateTransitionError) {
    // Handle invalid transition
    console.error(error.fromStatus, error.toStatus);
  }
  throw error; // Re-throw if not handling
}
```

## Best Practices

1. **Always validate before operations**: Call validation methods before performing state-changing operations
2. **Use helper methods for conditional logic**: Use `isImmutableState()`, `areAnnotationsAllowed()`, etc. for UI logic
3. **Validate in service layer**: Keep validation logic in services, not controllers
4. **Handle errors appropriately**: Catch and handle exceptions based on business logic needs
5. **Log state transitions**: Log state transitions for audit purposes
6. **Don't bypass validation**: Never skip validation methods - they're critical for legal compliance

## Legal Compliance Notes

- All validation rules are **non-negotiable** for legal defensibility
- State transitions are **immutable** once SIGNED
- Signatures are **immutable** once created
- Annotations are **immutable** once document is SIGNED
- PDF regeneration is **blocked** after leaving DRAFT state

These rules ensure the system maintains a legally defensible audit trail for medical consent documents.








