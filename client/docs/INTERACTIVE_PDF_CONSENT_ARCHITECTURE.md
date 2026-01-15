# Interactive PDF Consent Module Architecture

## Executive Summary

This document defines the architecture for upgrading the existing JWT-based, multi-signer consent workflow from an iframe PDF viewer to a fully interactive, inline PDF editing and signature platform. The system must maintain legal defensibility for medical/surgical consent documents, ensuring immutability once signed, complete audit trails, and full compliance with medical record keeping requirements.

**Key Principles:**
- **Legal Defensibility**: Every annotation and signature is timestamped, attributed, and auditable
- **Immutability**: Once SIGNED, no modifications are permitted
- **Multi-Signer Support**: Patient, surgeon, witness signatures with distinct workflows
- **Complete Audit Trail**: Full event sourcing with DomainEvent integration
- **Separation of Concerns**: Annotations, signatures, and form data are distinct data types

---

## 1. High-Level Architecture

### 1.1 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Interactive PDF Viewer (react-pdf-viewer/core)          │  │
│  │  - Annotation Toolbar                                    │  │
│  │  - Signature Placement Interface                         │  │
│  │  - Real-time Sync (WebSocket/SSE)                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Consent State Management (React Context/Redux)          │  │
│  │  - Document State                                         │  │
│  │  - Annotation Queue                                       │  │
│  │  - Signature Queue                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↕ HTTPS/WSS
┌─────────────────────────────────────────────────────────────────┐
│                        API GATEWAY LAYER                         │
│  - JWT Authentication                                           │
│  - RBAC Authorization                                           │
│  - RLS (Row-Level Security) Enforcement                         │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND LAYER                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Consent Service                                         │  │
│  │  - State Transition Validation                           │  │
│  │  - Multi-Signer Workflow Management                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  PDF Processing Service                                   │  │
│  │  - Annotation Embedding (pdf-lib)                        │  │
│  │  - Signature Embedding                                   │  │
│  │  - Final PDF Generation & Locking                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Annotation Service                                       │  │
│  │  - Annotation CRUD (with state checks)                   │  │
│  │  - Annotation Validation                                 │  │
│  │  - Batch Annotation Processing                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Domain Event Service                                     │  │
│  │  - Event Publishing                                       │  │
│  │  - Audit Trail Generation                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  PostgreSQL  │  │  File Storage │  │  Redis Cache │          │
│  │  - Consents  │  │  - PDFs       │  │  - Sessions  │          │
│  │  - Annotations│  │  - Signatures│  │  - Locks     │          │
│  │  - Signatures│  │               │  │              │          │
│  │  - Events    │  │               │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Component Responsibilities

#### Frontend Components

1. **Interactive PDF Viewer**
   - Renders PDF using `@react-pdf-viewer/core`
   - Handles zoom, pan, page navigation
   - Displays annotations and signature fields
   - Manages user interaction (click, drag, draw)

2. **Annotation Toolbar**
   - Highlight tool
   - Comment/note tool
   - Text editing tool (for placeholder values only)
   - Color coding by user role

3. **Signature Placement Interface**
   - Click-to-place signature mode
   - Drag-and-drop positioning
   - Multi-signature field support
   - Signature preview overlay

4. **State Synchronization**
   - Real-time annotation updates (WebSocket/SSE)
   - Optimistic UI updates with conflict resolution
   - Queue management for offline resilience

#### Backend Services

1. **Consent Service**
   - State machine enforcement (DRAFT → READY_FOR_SIGNATURE → PARTIALLY_SIGNED → SIGNED)
   - Multi-signer workflow coordination
   - Document locking/unlocking logic

2. **PDF Processing Service**
   - PDF generation from templates
   - Annotation embedding (PDF comments/annotations)
   - Signature embedding (visual + digital signature)
   - Final PDF flattening and locking
   - Hash calculation and verification

3. **Annotation Service**
   - Annotation CRUD operations
   - State-based validation (no edits after SIGNED)
   - Batch processing for performance
   - Annotation-to-PDF coordinate mapping

4. **Domain Event Service**
   - Event publishing for all state changes
   - Audit trail generation
   - Event correlation and causation tracking

---

## 2. Data Model Design

### 2.1 Core Data Separation

**Three Distinct Data Types:**

1. **Form Data** (Template Placeholders)
   - Stored in `PDFConsent` model (existing)
   - Merged into PDF during generation
   - Not editable after PDF generation

2. **Annotations** (User-Added Comments/Highlights)
   - Stored in `PDFConsentAnnotation` model (NEW)
   - Separate from signatures
   - Can be added/removed before SIGNED state
   - Persisted to PDF as comments/annotations

3. **Signatures** (Legal Sign-Offs)
   - Stored in `PDFConsentSignature` model (existing)
   - Immutable once created
   - Embedded into final PDF
   - Cannot be removed or modified

### 2.2 Recommended Data Models

#### PDFConsentAnnotation (NEW)

```prisma
model PDFConsentAnnotation {
  id          String   @id @default(uuid()) @db.Uuid
  consentId   String   @db.Uuid
  
  // Annotation Type
  annotationType AnnotationType // HIGHLIGHT, COMMENT, TEXT_EDIT, DRAWING
  
  // PDF Position
  pageNumber  Int      @db.Integer // 1-indexed page number
  x           Float    @db.DoublePrecision // X coordinate (PDF points)
  y           Float    @db.DoublePrecision // Y coordinate (PDF points)
  width       Float?   @db.DoublePrecision // Width (for rectangles, highlights)
  height      Float?   @db.DoublePrecision // Height (for rectangles, highlights)
  coordinates Json?    @db.JsonB // Complex shapes (polygons, freehand)
  
  // Content
  content     String?  @db.Text // Text content (for comments, text edits)
  color       String   @db.VarChar(7) // Hex color (#RRGGBB)
  
  // Metadata
  createdById String   @db.Uuid
  createdAt   DateTime @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime @updatedAt @db.Timestamptz(6)
  deletedAt   DateTime? @db.Timestamptz(6) // Soft delete (before SIGNED)
  
  // State Protection
  isImmutable Boolean  @default(false) // Set to true when consent is SIGNED
  
  // Relations
  consent     PDFConsent @relation(fields: [consentId], references: [id], onDelete: Cascade)
  createdBy   User       @relation("PDFConsentAnnotationCreator", fields: [createdById], references: [id])
  
  // Event Linking
  createdEventId String?  @db.Uuid // DomainEvent for creation
  deletedEventId String?  @db.Uuid // DomainEvent for deletion (if applicable)
  
  @@index([consentId])
  @@index([createdById])
  @@index([pageNumber])
  @@index([annotationType])
  @@index([deletedAt])
  @@index([isImmutable])
  @@map("pdf_consent_annotations")
}

enum AnnotationType {
  HIGHLIGHT      // Text highlighting
  COMMENT        // Sticky note/comment
  TEXT_EDIT      // Text editing (placeholder values only)
  DRAWING        // Freehand drawing
  ARROW          // Arrow annotation
  RECTANGLE      // Rectangle annotation
  CIRCLE         // Circle annotation
}
```

#### Enhanced PDFConsentSignature (EXISTING - Enhancements)

```prisma
model PDFConsentSignature {
  id          String     @id @default(uuid()) @db.Uuid
  consentId   String     @db.Uuid
  signerId    String?    @db.Uuid
  signerName  String     @db.VarChar(200)
  signerType  SignerType
  
  // Signature Image/Data
  signatureUrl String    @db.VarChar(1000) // URL to signature image/data
  
  // PDF Position (NEW - for inline placement)
  pageNumber  Int?       @db.Integer // Page where signature is placed
  x           Float?     @db.DoublePrecision // X coordinate
  y           Float?     @db.DoublePrecision // Y coordinate
  width       Float?     @db.DoublePrecision // Signature width
  height      Float?     @db.DoublePrecision // Signature height
  
  // Signature Metadata
  signedAt    DateTime   @default(now()) @db.Timestamptz(6)
  ipAddress  String?    @db.VarChar(45)
  deviceInfo String?    @db.VarChar(500)
  userAgent  String?    @db.VarChar(500) // NEW
  
  // Cryptographic Integrity (NEW)
  signatureHash String?  @db.VarChar(64) // SHA-256 hash of signature data
  
  // Event Linking
  signatureEventId String? @db.Uuid // DomainEvent for signature creation
  
  // Relations
  consent     PDFConsent @relation(fields: [consentId], references: [id], onDelete: Cascade)
  signer      User?      @relation("PDFConsentSigner", fields: [signerId], references: [id])
  
  @@index([consentId])
  @@index([signerId])
  @@index([signerType])
  @@index([signedAt])
  @@index([pageNumber])
  @@map("pdf_consent_signatures")
}
```

#### Enhanced PDFConsent (EXISTING - Enhancements)

```prisma
model PDFConsent {
  id               String         @id @default(uuid()) @db.Uuid
  patientId        String         @db.Uuid
  consultationId   String?        @db.Uuid
  templateId       String         @db.Uuid
  status           ConsentStatus  @default(DRAFT)
  
  // PDF Documents
  generatedPdfUrl  String?        @db.VarChar(1000) // Working document (editable)
  finalPdfUrl      String?        @db.VarChar(1000) // Immutable signed version
  finalPdfHash     String?        @db.VarChar(64)   // SHA-256 hash
  
  // Annotation State (NEW)
  annotationVersion Int           @default(1) @db.Integer // Increments on annotation changes
  lastAnnotationAt  DateTime?     @db.Timestamptz(6) // Last annotation timestamp
  
  // Workflow tracking
  sentForSignatureAt DateTime?     @db.Timestamptz(6)
  lockedAt         DateTime?       @db.Timestamptz(6) // When SIGNED
  
  // Audit
  createdById      String         @db.Uuid
  createdBy        User           @relation("PDFConsentCreator", fields: [createdById], references: [id])
  archivedAt       DateTime?      @db.Timestamptz(6)
  archivedById     String?        @db.Uuid
  archivedBy       User?          @relation("PDFConsentArchivedBy", fields: [archivedById], references: [id])
  version          Int            @default(1)
  createdAt        DateTime       @default(now()) @db.Timestamptz(6)
  updatedAt        DateTime       @updatedAt @db.Timestamptz(6)
  
  // Relations
  template         ConsentTemplate @relation(fields: [templateId], references: [id])
  patient          Patient         @relation("PDFConsentPatient", fields: [patientId], references: [id], onDelete: Restrict)
  consultation     Consultation?   @relation("PDFConsentConsultation", fields: [consultationId], references: [id])
  signatures       PDFConsentSignature[]
  annotations      PDFConsentAnnotation[] // NEW
  
  @@index([patientId])
  @@index([consultationId])
  @@index([templateId])
  @@index([status])
  @@index([createdById])
  @@index([archivedAt])
  @@index([lockedAt])
  @@map("pdf_consents")
}
```

#### DomainEvent Integration

All state changes must generate DomainEvent records:

```typescript
// Event Types for PDF Consent
enum PDFConsentEventType {
  "PDFConsent.Created"
  "PDFConsent.StatusChanged"
  "PDFConsent.AnnotationAdded"
  "PDFConsent.AnnotationUpdated"
  "PDFConsent.AnnotationDeleted"
  "PDFConsent.SignatureAdded"
  "PDFConsent.Locked"
  "PDFConsent.Archived"
  "PDFConsent.Revoked"
}
```

---

## 3. State Transition Rules

### 3.1 Consent Status State Machine

```
DRAFT
  ↓ (markReadyForSignature)
READY_FOR_SIGNATURE
  ↓ (firstSignatureAdded)
PARTIALLY_SIGNED
  ↓ (allRequiredSignaturesAdded)
SIGNED
  ↓ (optional: revoke)
REVOKED
  ↓ (optional: archive)
ARCHIVED
```

### 3.2 State-Based Permission Matrix

| State | Annotations | Signatures | Form Data | PDF Generation |
|-------|-------------|------------|-----------|----------------|
| **DRAFT** | ✅ Create/Update/Delete | ❌ Not allowed | ✅ Editable | ✅ Generate/Regenerate |
| **READY_FOR_SIGNATURE** | ✅ Create/Update/Delete | ✅ Add signatures | ❌ Read-only | ❌ No regeneration |
| **PARTIALLY_SIGNED** | ✅ Create/Update/Delete | ✅ Add remaining signatures | ❌ Read-only | ❌ No regeneration |
| **SIGNED** | ❌ **IMMUTABLE** | ❌ **IMMUTABLE** | ❌ Read-only | ❌ Final PDF only |
| **REVOKED** | ❌ Read-only | ❌ Read-only | ❌ Read-only | ❌ Read-only |
| **ARCHIVED** | ❌ Read-only | ❌ Read-only | ❌ Read-only | ❌ Read-only |

### 3.3 Enforcement Rules

#### Rule 1: No Annotation Edits After SIGNED
```typescript
// Pseudocode
function validateAnnotationOperation(consent: PDFConsent, operation: 'create' | 'update' | 'delete') {
  if (consent.status === ConsentStatus.SIGNED || 
      consent.status === ConsentStatus.REVOKED || 
      consent.status === ConsentStatus.ARCHIVED) {
    throw new ImmutableDocumentError('Cannot modify annotations on signed document');
  }
  if (consent.lockedAt !== null) {
    throw new ImmutableDocumentError('Document is locked and cannot be modified');
  }
}
```

#### Rule 2: No Signature Edits After Creation
```typescript
// Signatures are immutable once created
function validateSignatureOperation(signature: PDFConsentSignature, operation: 'create' | 'update' | 'delete') {
  if (operation !== 'create' && signature.id) {
    throw new ImmutableSignatureError('Signatures cannot be modified or deleted');
  }
}
```

#### Rule 3: No PDF Regeneration After READY_FOR_SIGNATURE
```typescript
function validatePDFRegeneration(consent: PDFConsent) {
  if (consent.status !== ConsentStatus.DRAFT) {
    throw new InvalidStateTransitionError('Cannot regenerate PDF after READY_FOR_SIGNATURE');
  }
  if (consent.signatures.length > 0) {
    throw new InvalidStateTransitionError('Cannot regenerate PDF with existing signatures');
  }
}
```

#### Rule 4: State Transition Validation
```typescript
// Allowed transitions
const ALLOWED_TRANSITIONS: Record<ConsentStatus, ConsentStatus[]> = {
  DRAFT: [ConsentStatus.READY_FOR_SIGNATURE, ConsentStatus.ARCHIVED],
  READY_FOR_SIGNATURE: [ConsentStatus.PARTIALLY_SIGNED, ConsentStatus.ARCHIVED],
  PARTIALLY_SIGNED: [ConsentStatus.SIGNED, ConsentStatus.ARCHIVED],
  SIGNED: [ConsentStatus.REVOKED, ConsentStatus.ARCHIVED],
  REVOKED: [ConsentStatus.ARCHIVED],
  EXPIRED: [ConsentStatus.ARCHIVED],
  ARCHIVED: [] // Terminal state
};

function validateStateTransition(from: ConsentStatus, to: ConsentStatus) {
  if (!ALLOWED_TRANSITIONS[from]?.includes(to)) {
    throw new InvalidStateTransitionError(`Cannot transition from ${from} to ${to}`);
  }
}
```

---

## 4. Audit Log Architecture

### 4.1 Event Sourcing Pattern

Every state change generates a DomainEvent with complete context:

```typescript
interface PDFConsentAnnotationAddedEvent {
  eventType: "PDFConsent.AnnotationAdded";
  domain: Domain.CONSENT;
  aggregateId: string; // PDFConsent.id
  aggregateType: "PDFConsent";
  payload: {
    annotationId: string;
    annotationType: AnnotationType;
    pageNumber: number;
    coordinates: { x: number; y: number; width?: number; height?: number };
    content?: string;
    color: string;
  };
  metadata: {
    consentId: string;
    consentStatus: ConsentStatus;
    createdById: string;
    ipAddress?: string;
    userAgent?: string;
  };
  createdBy: string;
  correlationId?: string; // Links related events
  causationId?: string; // Event that triggered this
  occurredAt: Date;
  contentHash: string; // SHA-256 hash of event content
}
```

### 4.2 Audit Trail Requirements

#### For Annotations:
- ✅ Who created/modified/deleted (user ID, name, role)
- ✅ When (timestamp with timezone)
- ✅ What (annotation type, content, coordinates)
- ✅ Where (page number, coordinates)
- ✅ Why (optional: reason/correlation ID)
- ✅ Context (IP address, device info, user agent)

#### For Signatures:
- ✅ Who signed (user ID, name, signer type)
- ✅ When (timestamp with timezone)
- ✅ Where (page number, coordinates)
- ✅ Legal metadata (IP address, device info, user agent)
- ✅ Cryptographic hash (signature data hash)

#### For State Transitions:
- ✅ Previous state
- ✅ New state
- ✅ Triggering event (signature added, all signatures complete, etc.)
- ✅ Actor (user who triggered transition)
- ✅ Timestamp

### 4.3 Immutable Audit Log Storage

All DomainEvent records are:
- **Immutable**: Never updated or deleted
- **Hashed**: Content hash stored for tamper detection
- **Correlated**: Linked via correlationId for workflow tracking
- **Causation-linked**: Linked via causationId for event chains
- **Indexed**: For efficient querying (by aggregateId, eventType, occurredAt)

---

## 5. Security Considerations

### 5.1 Medical Consent-Specific Security Requirements

#### HIPAA Compliance
- ✅ **Access Control**: RBAC + RLS enforced at API level
- ✅ **Audit Logging**: All PHI access logged via DataAccessLog
- ✅ **Encryption in Transit**: HTTPS/WSS for all communications
- ✅ **Encryption at Rest**: Database encryption, file storage encryption
- ✅ **Minimum Necessary**: Users only see consents they have permission to access

#### Legal Defensibility Requirements
- ✅ **Non-Repudiation**: Signatures cannot be denied (cryptographic proof)
- ✅ **Integrity**: PDF hash stored and verified on access
- ✅ **Authenticity**: All actions attributed to authenticated users
- ✅ **Tamper Detection**: Content hashes detect unauthorized modifications
- ✅ **Timestamp Authority**: All timestamps use server time (not client)

### 5.2 Access Control Layers

#### Layer 1: Authentication (JWT)
- JWT token required for all API requests
- Token expiration and refresh handling
- Session management

#### Layer 2: Authorization (RBAC)
- Role-based permissions (PATIENT, DOCTOR, NURSE_WITNESS, ADMIN)
- Permission checks: `consent:read`, `consent:annotate`, `consent:sign`, `consent:manage`
- Role hierarchy enforcement

#### Layer 3: Row-Level Security (RLS)
- Patients can only see their own consents
- Doctors can see consents for their patients
- Admins can see all consents (with audit logging)
- Enforcement at database level (PostgreSQL RLS policies)

#### Layer 4: State-Based Restrictions
- Even with permission, operations blocked if state doesn't allow
- Example: DOCTOR cannot annotate SIGNED document

### 5.3 Signature Security

#### Cryptographic Requirements
- **Signature Hash**: SHA-256 hash of signature image/data stored
- **PDF Hash**: SHA-256 hash of final PDF stored
- **Digital Signature** (Future Enhancement): PKI-based digital signature embedding
- **Timestamp Authority**: Server-generated timestamps (not client)

#### Signature Validation
- Verify signature hash matches stored value
- Verify PDF hash matches stored value on every access
- Verify signature coordinates haven't been tampered with

### 5.4 File Storage Security

#### Current State (Local Filesystem)
- ⚠️ **Risk**: Files stored on local filesystem, no access control
- ✅ **Recommendation**: Implement signed URL proxy endpoint

#### Recommended Production Setup
- **Object Storage**: S3/MinIO with versioning enabled
- **Signed URLs**: Temporary, time-limited access URLs
- **Access Logging**: All file access logged via DataAccessLog
- **Encryption**: Server-side encryption (SSE) enabled
- **Backup**: Regular backups with integrity verification

### 5.5 Network Security

- ✅ **HTTPS Only**: All API endpoints use TLS 1.3
- ✅ **WSS Only**: WebSocket connections use secure WebSocket
- ✅ **CORS**: Restricted to known origins
- ✅ **Rate Limiting**: Prevent abuse (especially for file downloads)
- ✅ **IP Whitelisting** (Optional): For administrative endpoints

---

## 6. Failure and Rollback Strategies

### 6.1 Failure Scenarios

#### Scenario 1: Annotation Creation Failure
**Situation**: User creates annotation, but backend save fails

**Strategy**:
1. **Frontend**: Queue annotation in local storage
2. **Frontend**: Show optimistic UI update (annotation appears)
3. **Backend**: Retry on reconnect
4. **Frontend**: Show error notification if retry fails
5. **Frontend**: Allow user to retry manually or discard

**Rollback**: Remove optimistic annotation from UI

#### Scenario 2: Signature Placement Failure
**Situation**: User places signature, but backend save fails

**Strategy**:
1. **Frontend**: DO NOT show optimistic signature (signatures are legally binding)
2. **Frontend**: Show error immediately
3. **Backend**: Do not create signature record
4. **Frontend**: Allow user to retry signature placement

**Rollback**: No rollback needed (signature never created)

#### Scenario 3: State Transition Failure
**Situation**: Attempting to transition to SIGNED, but PDF generation fails

**Strategy**:
1. **Backend**: Keep consent in PARTIALLY_SIGNED state
2. **Backend**: Log error event (DomainEvent)
3. **Backend**: Notify administrators
4. **Frontend**: Show error to user
5. **Backend**: Allow retry (idempotent operation)

**Rollback**: No state change occurred (still PARTIALLY_SIGNED)

#### Scenario 4: Concurrent Annotation Edits
**Situation**: Two users edit annotations simultaneously

**Strategy**:
1. **Backend**: Use optimistic locking (version field)
2. **Backend**: Last-write-wins with conflict detection
3. **Frontend**: Show conflict notification
4. **Frontend**: Refresh document state
5. **Frontend**: Allow user to reapply changes

**Rollback**: Revert to last known good state

#### Scenario 5: PDF Generation Failure
**Situation**: Final PDF generation fails during signing

**Strategy**:
1. **Backend**: Keep consent in PARTIALLY_SIGNED state
2. **Backend**: Do not update finalPdfUrl
3. **Backend**: Log error event
4. **Backend**: Queue retry job (with exponential backoff)
5. **Backend**: Notify administrators if retry fails

**Rollback**: No state change, signatures remain in database

### 6.2 Transaction Management

#### Database Transactions
- **Annotation Operations**: Single transaction (annotation + DomainEvent)
- **Signature Operations**: Single transaction (signature + DomainEvent + state transition)
- **State Transitions**: Single transaction (status update + DomainEvent + locking)
- **Final PDF Generation**: Two-phase commit (PDF save + database update)

#### Compensation Patterns

**Pattern 1: Saga for Multi-Step Operations**
```
1. Create signature record
2. Check if all signatures complete
3. If yes: Generate final PDF
4. If PDF generation fails: Keep signature, log error, allow retry
```

**Pattern 2: Event Sourcing for Rollback**
- All state changes via events
- Rollback = Apply compensating events
- Example: Delete annotation = Create AnnotationDeleted event

### 6.3 Data Consistency Guarantees

#### Consistency Levels
- **Strong Consistency**: Signatures, state transitions (ACID transactions)
- **Eventual Consistency**: Annotation sync (optimistic updates with conflict resolution)
- **Read Consistency**: Always read latest state (no stale data)

#### Conflict Resolution
- **Annotations**: Last-write-wins (with version field)
- **Signatures**: Cannot conflict (immutable after creation)
- **State Transitions**: First-write-wins (optimistic locking)

### 6.4 Recovery Procedures

#### Recovery from Partial Failure
1. **Detect Failure**: Monitor DomainEvent stream for failures
2. **Identify Impact**: Query consent state vs. expected state
3. **Repair State**: Apply compensating actions
4. **Notify Users**: Send notification about state correction
5. **Log Recovery**: Create DomainEvent for recovery action

#### Recovery from Data Corruption
1. **Detect Corruption**: Hash verification on file access
2. **Isolate Affected Document**: Mark as CORRUPTED status (new status)
3. **Restore from Backup**: Restore PDF from backup
4. **Verify Integrity**: Recalculate and verify hash
5. **Notify Administrators**: Alert for investigation

---

## 7. Integration Points

### 7.1 Existing System Integration

#### PDF Processing Service Integration
- **Input**: Annotations (JSON) + Signatures (images) + Template PDF
- **Output**: Final PDF with embedded annotations and signatures
- **Process**: pdf-lib library for PDF manipulation
- **Enhancement**: Add annotation embedding (PDF comments/annotations)

#### Domain Event Service Integration
- **Event Publishing**: All state changes publish DomainEvent
- **Event Types**: Use existing DomainEvent model
- **Correlation**: Link related events via correlationId
- **Causation**: Track event chains via causationId

#### Authentication/Authorization Integration
- **JWT Authentication**: Existing JWT token validation
- **RBAC**: Existing role-based access control
- **RLS**: Existing row-level security policies
- **Permission Checks**: Existing permission guard system

### 7.2 Frontend-Backend Communication

#### REST API Endpoints
```
GET    /api/v1/pdf-consents/:id                    # Get consent metadata
GET    /api/v1/pdf-consents/:id/pdf                # Get PDF file (signed URL)
GET    /api/v1/pdf-consents/:id/annotations        # Get annotations
POST   /api/v1/pdf-consents/:id/annotations        # Create annotation
PUT    /api/v1/pdf-consents/:id/annotations/:annId # Update annotation
DELETE /api/v1/pdf-consents/:id/annotations/:annId # Delete annotation
POST   /api/v1/pdf-consents/:id/signatures         # Add signature
POST   /api/v1/pdf-consents/:id/ready-for-signature # Transition to READY_FOR_SIGNATURE
GET    /api/v1/pdf-consents/:id/audit-trail        # Get audit trail
```

#### WebSocket/SSE for Real-Time Updates
```
WS /api/v1/pdf-consents/:id/stream
  - Annotation added/updated/deleted events
  - Signature added events
  - State transition events
  - Conflict notifications
```

---

## 8. Performance Considerations

### 8.1 Frontend Performance

- **Lazy Loading**: Load PDF pages on demand
- **Virtual Scrolling**: Render only visible pages
- **Debouncing**: Debounce annotation updates (batch API calls)
- **Caching**: Cache PDF pages in memory/browser cache
- **Web Workers**: Use Web Workers for PDF rendering (pdf.js worker)

### 8.2 Backend Performance

- **Batch Operations**: Batch annotation updates (reduce DB round-trips)
- **Async Processing**: Async PDF generation (queue-based)
- **Caching**: Cache consent metadata (Redis)
- **Indexing**: Proper database indexes (consentId, status, createdAt)
- **Pagination**: Paginate annotations (if many annotations per document)

### 8.3 Database Optimization

- **Indexes**: 
  - `PDFConsentAnnotation`: consentId, pageNumber, deletedAt, isImmutable
  - `PDFConsentSignature`: consentId, signerType, signedAt
  - `PDFConsent`: status, lockedAt, patientId
- **Partitioning** (Future): Partition annotations by consentId or date
- **Archiving**: Archive old annotations to cold storage (if needed)

---

## 9. Migration Strategy

### 9.1 Backward Compatibility

- ✅ **Existing Consents**: Continue using iframe viewer (fallback)
- ✅ **Feature Flag**: Enable interactive viewer per consent or user
- ✅ **Data Migration**: No data migration needed (annotations are new feature)
- ✅ **API Versioning**: Version API endpoints (v1 = existing, v2 = enhanced)

### 9.2 Gradual Rollout

1. **Phase 1**: Deploy backend (new endpoints, existing endpoints unchanged)
2. **Phase 2**: Deploy frontend with feature flag (disabled by default)
3. **Phase 3**: Enable for admin users (testing)
4. **Phase 4**: Enable for internal users (doctors, nurses)
5. **Phase 5**: Enable for all users (including patients)

### 9.3 Rollback Plan

- **Frontend Rollback**: Disable feature flag, revert to iframe viewer
- **Backend Rollback**: Old endpoints remain functional (no breaking changes)
- **Data Rollback**: Annotations stored separately (can be ignored if needed)

---

## 10. Future Enhancements

### 10.1 Advanced Features

- **Digital Signatures**: PKI-based digital signatures (not just visual)
- **Timestamp Authority**: External timestamp authority integration
- **Multi-Language Support**: Annotation translations
- **Voice Annotations**: Audio comment annotations
- **Collaborative Editing**: Real-time collaborative annotation editing

### 10.2 Compliance Enhancements

- **HIPAA Audit Reports**: Automated audit report generation
- **Consent Analytics**: Analytics dashboard for consent completion rates
- **Automated Compliance Checks**: Automated validation of consent requirements
- **Retention Policies**: Automated archival based on retention policies

---

## Conclusion

This architecture provides a robust, legally defensible, and scalable foundation for the Interactive PDF Consent Module. The clear separation of annotations, signatures, and form data, combined with strict state transition rules and comprehensive audit logging, ensures compliance with medical record keeping requirements while providing an enhanced user experience.

**Key Strengths:**
- ✅ Legal defensibility through immutable audit trails
- ✅ Clear data model separation (annotations vs. signatures vs. form data)
- ✅ Strict state machine preventing post-signature edits
- ✅ Comprehensive security (RBAC, RLS, encryption, integrity checks)
- ✅ Robust failure handling and rollback strategies
- ✅ Backward compatibility and gradual migration path

**Next Steps:**
1. Review and approve architecture
2. Implement data model changes (Prisma schema updates)
3. Implement backend services (Annotation Service, enhanced PDF Processing)
4. Implement frontend components (Interactive PDF Viewer)
5. Testing (unit tests, integration tests, legal compliance validation)
6. Gradual rollout with feature flags









