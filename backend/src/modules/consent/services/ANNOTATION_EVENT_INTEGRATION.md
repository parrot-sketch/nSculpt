# Annotation Event Integration Guide

## Overview

This guide shows how to publish annotation events using the existing `DomainEventService` (the event publisher) following the established patterns.

## Event Types Added

The following event types have been added to `ConsentEventType` enum:

```typescript
PDF_CONSENT_ANNOTATION_ADDED = 'PDFConsent.AnnotationAdded'
PDF_CONSENT_ANNOTATION_UPDATED = 'PDFConsent.AnnotationUpdated'
PDF_CONSENT_ANNOTATION_DELETED = 'PDFConsent.AnnotationDeleted'
PDF_CONSENT_LOCKED = 'PDFConsent.Locked'
```

## Event Payloads

All payload interfaces follow the existing pattern:

- `PDFConsentAnnotationAddedPayload`
- `PDFConsentAnnotationUpdatedPayload`
- `PDFConsentAnnotationDeletedPayload`
- `PDFConsentLockedPayload`

## Usage Examples

### 1. Publishing Annotation Added Event

```typescript
import { Injectable } from '@nestjs/common';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { ConsentEventType, PDFConsentAnnotationAddedPayload } from '../events/consent.events';
import { Domain } from '@prisma/client';

@Injectable()
export class PDFAnnotationService {
  constructor(
    private readonly domainEventService: DomainEventService,
    private readonly correlationService: CorrelationService,
  ) {}

  async createAnnotation(
    consentId: string,
    annotationData: CreateAnnotationDto,
    userId: string,
  ) {
    // ... create annotation logic ...
    
    const annotation = await this.repository.createAnnotation({
      consentId,
      ...annotationData,
      createdById: userId,
    });

    // Publish annotation added event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: ConsentEventType.PDF_CONSENT_ANNOTATION_ADDED,
      domain: Domain.CONSENT,
      aggregateId: consentId, // The consent ID (aggregate root)
      aggregateType: 'PDFConsent',
      payload: {
        annotationId: annotation.id,
        consentId: consent.id,
        annotationType: annotation.annotationType,
        pageNumber: annotation.pageNumber,
        x: annotation.x,
        y: annotation.y,
        width: annotation.width || undefined,
        height: annotation.height || undefined,
        content: annotation.content || undefined,
        color: annotation.color,
        createdBy: userId,
        createdAt: annotation.createdAt.toISOString(),
      } as PDFConsentAnnotationAddedPayload,
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return annotation;
  }
}
```

### 2. Publishing Annotation Updated Event

```typescript
async updateAnnotation(
  annotationId: string,
  updateData: UpdateAnnotationDto,
  userId: string,
) {
  // ... validate and update annotation logic ...
  
  const annotation = await this.repository.findAnnotationById(annotationId);
  const updatedAnnotation = await this.repository.updateAnnotation(
    annotationId,
    updateData,
  );

  // Publish annotation updated event
  const context = this.correlationService.getContext();
  await this.domainEventService.createEvent({
    eventType: ConsentEventType.PDF_CONSENT_ANNOTATION_UPDATED,
    domain: Domain.CONSENT,
    aggregateId: annotation.consentId, // The consent ID (aggregate root)
    aggregateType: 'PDFConsent',
    payload: {
      annotationId: updatedAnnotation.id,
      consentId: updatedAnnotation.consentId,
      annotationType: updatedAnnotation.annotationType,
      pageNumber: updatedAnnotation.pageNumber,
      x: updatedAnnotation.x,
      y: updatedAnnotation.y,
      width: updatedAnnotation.width || undefined,
      height: updatedAnnotation.height || undefined,
      content: updatedAnnotation.content || undefined,
      color: updatedAnnotation.color,
      updatedBy: userId,
      updatedAt: updatedAnnotation.updatedAt.toISOString(),
    } as PDFConsentAnnotationUpdatedPayload,
    correlationId: context.correlationId || undefined,
    causationId: context.causationId || undefined,
    createdBy: userId,
    sessionId: context.sessionId || undefined,
    requestId: context.requestId || undefined,
  });

  return updatedAnnotation;
}
```

### 3. Publishing Annotation Deleted Event

```typescript
async deleteAnnotation(
  annotationId: string,
  userId: string,
) {
  // ... validate and delete annotation logic ...
  
  const annotation = await this.repository.findAnnotationById(annotationId);
  await this.repository.deleteAnnotation(annotationId);

  // Publish annotation deleted event (BEFORE soft delete)
  const context = this.correlationService.getContext();
  await this.domainEventService.createEvent({
    eventType: ConsentEventType.PDF_CONSENT_ANNOTATION_DELETED,
    domain: Domain.CONSENT,
    aggregateId: annotation.consentId, // The consent ID (aggregate root)
    aggregateType: 'PDFConsent',
    payload: {
      annotationId: annotation.id,
      consentId: annotation.consentId,
      annotationType: annotation.annotationType,
      deletedBy: userId,
      deletedAt: new Date().toISOString(),
    } as PDFConsentAnnotationDeletedPayload,
    correlationId: context.correlationId || undefined,
    causationId: context.causationId || undefined,
    createdBy: userId,
    sessionId: context.sessionId || undefined,
    requestId: context.requestId || undefined,
  });

  return { success: true };
}
```

### 4. Publishing Document Locked Event

```typescript
async lockConsent(
  consentId: string,
  finalPdfUrl: string,
  finalPdfHash: string,
  userId: string,
) {
  // ... lock consent logic ...
  
  await this.repository.updateConsentStatus(consentId, ConsentStatus.SIGNED, {
    lockedAt: new Date(),
    finalPdfUrl,
    finalPdfHash,
  });

  // Publish document locked event
  const context = this.correlationService.getContext();
  await this.domainEventService.createEvent({
    eventType: ConsentEventType.PDF_CONSENT_LOCKED,
    domain: Domain.CONSENT,
    aggregateId: consentId,
    aggregateType: 'PDFConsent',
    payload: {
      consentId,
      lockedAt: new Date().toISOString(),
      finalPdfUrl,
      finalPdfHash,
    } as PDFConsentLockedPayload,
    correlationId: context.correlationId || undefined,
    causationId: context.causationId || undefined,
    createdBy: userId,
    sessionId: context.sessionId || undefined,
    requestId: context.requestId || undefined,
  });

  return await this.repository.findConsentById(consentId);
}
```

## Complete Service Example

Here's a complete example of an annotation service using the event publisher:

```typescript
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { ConsentStateMachineService, AnnotationOperation } from './consent-state-machine.service';
import {
  ConsentEventType,
  PDFConsentAnnotationAddedPayload,
  PDFConsentAnnotationUpdatedPayload,
  PDFConsentAnnotationDeletedPayload,
} from '../events/consent.events';
import { Domain, ConsentStatus } from '@prisma/client';
import { PDFConsentRepository } from '../repositories/pdf-consent.repository';
import { PDFAnnotationRepository } from '../repositories/pdf-annotation.repository';

@Injectable()
export class PDFAnnotationService {
  private readonly logger = new Logger(PDFAnnotationService.name);

  constructor(
    private readonly annotationRepository: PDFAnnotationRepository,
    private readonly consentRepository: PDFConsentRepository,
    private readonly stateMachine: ConsentStateMachineService,
    private readonly domainEventService: DomainEventService,
    private readonly correlationService: CorrelationService,
  ) {}

  async createAnnotation(
    consentId: string,
    annotationData: CreateAnnotationDto,
    userId: string,
  ) {
    // 1. Validate consent exists
    const consent = await this.consentRepository.findConsentById(consentId);
    if (!consent) {
      throw new NotFoundException(`Consent ${consentId} not found`);
    }

    // 2. Validate state allows annotations
    this.stateMachine.validateAnnotationOperation(
      consent.status,
      AnnotationOperation.CREATE,
      consent.id,
      consent.lockedAt,
    );

    // 3. Create annotation
    const annotation = await this.annotationRepository.create({
      consentId,
      ...annotationData,
      createdById: userId,
    });

    // 4. Publish event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: ConsentEventType.PDF_CONSENT_ANNOTATION_ADDED,
      domain: Domain.CONSENT,
      aggregateId: consentId,
      aggregateType: 'PDFConsent',
      payload: {
        annotationId: annotation.id,
        consentId: annotation.consentId,
        annotationType: annotation.annotationType,
        pageNumber: annotation.pageNumber,
        x: annotation.x,
        y: annotation.y,
        width: annotation.width || undefined,
        height: annotation.height || undefined,
        content: annotation.content || undefined,
        color: annotation.color,
        createdBy: userId,
        createdAt: annotation.createdAt.toISOString(),
      } as PDFConsentAnnotationAddedPayload,
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    this.logger.log(`Annotation ${annotation.id} created on consent ${consentId}`);
    return annotation;
  }

  async updateAnnotation(
    annotationId: string,
    updateData: UpdateAnnotationDto,
    userId: string,
  ) {
    // 1. Get annotation with consent
    const annotation = await this.annotationRepository.findByIdWithConsent(annotationId);
    if (!annotation) {
      throw new NotFoundException(`Annotation ${annotationId} not found`);
    }

    // 2. Validate state allows updates
    this.stateMachine.validateAnnotationOperation(
      annotation.consent.status,
      AnnotationOperation.UPDATE,
      annotation.consentId,
      annotation.consent.lockedAt,
    );

    // 3. Update annotation
    const updatedAnnotation = await this.annotationRepository.update(
      annotationId,
      updateData,
    );

    // 4. Publish event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: ConsentEventType.PDF_CONSENT_ANNOTATION_UPDATED,
      domain: Domain.CONSENT,
      aggregateId: annotation.consentId,
      aggregateType: 'PDFConsent',
      payload: {
        annotationId: updatedAnnotation.id,
        consentId: updatedAnnotation.consentId,
        annotationType: updatedAnnotation.annotationType,
        pageNumber: updatedAnnotation.pageNumber,
        x: updatedAnnotation.x,
        y: updatedAnnotation.y,
        width: updatedAnnotation.width || undefined,
        height: updatedAnnotation.height || undefined,
        content: updatedAnnotation.content || undefined,
        color: updatedAnnotation.color,
        updatedBy: userId,
        updatedAt: updatedAnnotation.updatedAt.toISOString(),
      } as PDFConsentAnnotationUpdatedPayload,
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    this.logger.log(`Annotation ${annotationId} updated`);
    return updatedAnnotation;
  }

  async deleteAnnotation(
    annotationId: string,
    userId: string,
  ) {
    // 1. Get annotation with consent
    const annotation = await this.annotationRepository.findByIdWithConsent(annotationId);
    if (!annotation) {
      throw new NotFoundException(`Annotation ${annotationId} not found`);
    }

    // 2. Validate state allows deletion
    this.stateMachine.validateAnnotationOperation(
      annotation.consent.status,
      AnnotationOperation.DELETE,
      annotation.consentId,
      annotation.consent.lockedAt,
    );

    // 3. Publish event BEFORE deletion (capture annotation data)
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: ConsentEventType.PDF_CONSENT_ANNOTATION_DELETED,
      domain: Domain.CONSENT,
      aggregateId: annotation.consentId,
      aggregateType: 'PDFConsent',
      payload: {
        annotationId: annotation.id,
        consentId: annotation.consentId,
        annotationType: annotation.annotationType,
        deletedBy: userId,
        deletedAt: new Date().toISOString(),
      } as PDFConsentAnnotationDeletedPayload,
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    // 4. Soft delete annotation
    await this.annotationRepository.delete(annotationId);

    this.logger.log(`Annotation ${annotationId} deleted`);
    return { success: true };
  }
}
```

## Key Patterns

### 1. Event Structure

All events follow this structure:

```typescript
await this.domainEventService.createEvent({
  eventType: ConsentEventType.PDF_CONSENT_ANNOTATION_ADDED, // Event type enum
  domain: Domain.CONSENT, // Domain enum
  aggregateId: consentId, // Aggregate root ID (consent ID, not annotation ID)
  aggregateType: 'PDFConsent', // Aggregate type string
  payload: { /* payload interface */ } as PDFConsentAnnotationAddedPayload,
  correlationId: context.correlationId || undefined,
  causationId: context.causationId || undefined,
  createdBy: userId,
  sessionId: context.sessionId || undefined,
  requestId: context.requestId || undefined,
});
```

### 2. Aggregate Root

- **aggregateId**: Always use the `consentId` (not the annotation ID)
- **aggregateType**: Always `'PDFConsent'`
- This groups all annotation events under the consent aggregate

### 3. Correlation Context

Always get correlation context before publishing:

```typescript
const context = this.correlationService.getContext();
```

This provides correlationId, causationId, sessionId, and requestId for event linking.

### 4. Event Timing

- **CREATE/UPDATE**: Publish event AFTER successful database operation
- **DELETE**: Publish event BEFORE deletion (to capture annotation data in payload)

### 5. Payload Structure

Payloads should include:
- Entity IDs (annotationId, consentId)
- Entity data (type, position, content)
- Metadata (userId, timestamp)
- Follow existing payload patterns (see PDFConsentSignedPayload, etc.)

## Integration Checklist

- [x] Event types added to `ConsentEventType` enum
- [x] Payload interfaces created following existing patterns
- [x] Events use existing `DomainEventService.createEvent()`
- [x] Events use `consentId` as aggregateId
- [x] Events include correlation context
- [x] Events follow existing event structure pattern

## Notes

- The `DomainEventService` is the existing event publisher (not a separate publisher class)
- All events use the same structure and metadata pattern
- AnnotationType is currently a string in payloads (will be enum once Prisma schema is applied)
- Events are published synchronously as part of the transaction
- Events are immutable once created (enforced by DomainEventService)








