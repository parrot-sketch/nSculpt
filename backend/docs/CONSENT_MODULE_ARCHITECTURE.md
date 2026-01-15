# Consent Module Architecture

## Overview

The consent module has been refactored to follow **Domain-Driven Design (DDD)** principles with clear separation of concerns, making it highly **modular, testable, and maintainable**.

## Architecture Layers

### 1. Domain Layer (`domain/`)

**Purpose**: Pure business logic with no infrastructure dependencies.

#### Entities (`domain/entities/`)
- `Consent`: Core domain entity representing a consent document
  - Encapsulates business rules (canBeModified, isImmutable, canAnnotate, etc.)
  - No database or external dependencies
  - Fully testable in isolation

#### Value Objects (`domain/value-objects/`)
- `SignaturePosition`: Immutable value object for signature placement
  - Validates coordinates
  - Converts between web and PDF coordinate systems
  - No side effects

#### Domain Services (`domain/services/`)
- `ConsentStateMachine`: Pure domain logic for state transitions
  - No infrastructure dependencies
  - Fully testable
  - Encapsulates all state transition rules

#### Interfaces (`domain/interfaces/`)
- `PDFProcessor`: Abstraction for PDF operations
- `IConsentRepository`: Abstraction for data persistence

**Benefits**:
- ✅ No infrastructure dependencies
- ✅ Fully testable in isolation
- ✅ Business rules are explicit and centralized
- ✅ Easy to understand and maintain

### 2. Application Layer (`application/`)

**Purpose**: Orchestrates domain logic and coordinates use cases.

#### Use Cases (`application/use-cases/`)
- `GenerateConsentUseCase`: Generates consent from template
- `SignConsentUseCase`: Handles consent signing with business rules

**Characteristics**:
- Single responsibility per use case
- Orchestrates domain services and repositories
- Handles application-level concerns (logging, validation)
- Returns domain entities or DTOs

#### Validators (`application/validators/`)
- `ConsentValidator`: Application-level validation
  - Validates business rules before use case execution
  - Throws domain errors

#### Errors (`application/errors/`)
- Structured error types:
  - `ConsentNotFoundError`
  - `ConsentImmutableError`
  - `InvalidStateTransitionError`
  - `SignatureOrderViolationError`
  - `DuplicateSignatureError`
  - `PDFProcessingError`

**Benefits**:
- ✅ Clear use case boundaries
- ✅ Testable with mocked dependencies
- ✅ Easy to add new use cases
- ✅ Consistent error handling

### 3. Infrastructure Layer (`infrastructure/`)

**Purpose**: Concrete implementations of domain interfaces.

#### PDF Processing (`infrastructure/pdf/`)
- `PDFLibProcessorService`: Concrete implementation using pdf-lib
  - Implements `PDFProcessor` interface
  - Can be swapped with other implementations (pdfkit, etc.)
  - Handles all PDF manipulation

#### Repository (`repositories/`)
- `PDFConsentRepository`: Prisma-based implementation
  - Implements `IConsentRepository` interface
  - Can be swapped with other ORMs
  - Handles data persistence

**Benefits**:
- ✅ Swappable implementations
- ✅ Infrastructure concerns isolated
- ✅ Easy to test with mocks
- ✅ Can change libraries without affecting business logic

## Design Principles

### 1. Dependency Inversion

**High-level modules (domain, application) don't depend on low-level modules (infrastructure).**

- Domain defines interfaces (`PDFProcessor`, `IConsentRepository`)
- Infrastructure implements interfaces
- Application depends on interfaces, not implementations

**Example**:
```typescript
// Domain defines interface
interface PDFProcessor {
  mergePlaceholders(...): Promise<Buffer>;
}

// Infrastructure implements
class PDFLibProcessorService implements PDFProcessor {
  async mergePlaceholders(...) { /* pdf-lib implementation */ }
}

// Application uses interface
class GenerateConsentUseCase {
  constructor(private pdfProcessor: PDFProcessor) {}
}
```

### 2. Single Responsibility

**Each class has one reason to change.**

- `Consent` entity: Business rules only
- `ConsentStateMachine`: State transitions only
- `PDFLibProcessorService`: PDF manipulation only
- `GenerateConsentUseCase`: Consent generation orchestration only

### 3. Open/Closed Principle

**Open for extension, closed for modification.**

- Add new PDF processor: Implement `PDFProcessor` interface
- Add new use case: Create new use case class
- Add new validation: Extend `ConsentValidator`

### 4. Interface Segregation

**Clients shouldn't depend on interfaces they don't use.**

- `PDFProcessor`: Only PDF operations
- `IConsentRepository`: Only data operations
- No fat interfaces

### 5. Testability

**Everything is testable in isolation.**

- Domain: Pure functions, no dependencies
- Application: Mock interfaces
- Infrastructure: Mock external services

## Testing Strategy

### Unit Tests

**Domain Layer**:
```typescript
describe('Consent Entity', () => {
  it('should allow modification in DRAFT state', () => {
    const consent = new Consent(..., ConsentStatus.DRAFT, ...);
    expect(consent.canBeModified()).toBe(true);
  });
});
```

**Application Layer**:
```typescript
describe('SignConsentUseCase', () => {
  it('should enforce signature order', async () => {
    const mockRepo = createMockRepository();
    const useCase = new SignConsentUseCase(mockRepo, ...);
    // Test with mocked dependencies
  });
});
```

### Integration Tests

**Infrastructure Layer**:
```typescript
describe('PDFLibProcessorService', () => {
  it('should merge placeholders correctly', async () => {
    const processor = new PDFLibProcessorService();
    // Test with real PDF files
  });
});
```

## Error Handling

### Domain Errors

Domain errors are thrown from domain/application layers:
- `ConsentNotFoundError`
- `ConsentImmutableError`
- `InvalidStateTransitionError`

### HTTP Mapping

Controllers map domain errors to HTTP responses:
```typescript
try {
  await useCase.execute(request);
} catch (error) {
  if (error instanceof ConsentNotFoundError) {
    throw new NotFoundException(error.message);
  }
  // ...
}
```

## Reliability Features

### 1. State Machine Enforcement

- All state transitions validated
- Immutable states protected
- Business rules enforced

### 2. Signature Order Enforcement

- Patient/Guardian must sign first
- Doctor signs second
- Witness signs last
- Prevents invalid signature sequences

### 3. PDF Integrity

- SHA-256 hash calculation
- Hash verification
- Tamper detection

### 4. Immutability Protection

- Signed consents cannot be modified
- Signatures cannot be deleted
- PDFs cannot be regenerated after signing

## Library Status

### Current Libraries

- ✅ `pdf-lib` (v1.17.1): Active, well-maintained
- ✅ `pdf-parse` (v2.4.5): Active, well-maintained
- ✅ `@prisma/client` (v5.22.0): Active, well-maintained

**No deprecated libraries detected.**

## Migration Path

### Phase 1: Foundation (Current)
- ✅ Domain layer created
- ✅ Application layer created
- ✅ Infrastructure layer refactored
- ✅ Interfaces defined

### Phase 2: Integration
- [ ] Update existing services to use new architecture
- [ ] Migrate controllers to use use cases
- [ ] Add comprehensive error handling

### Phase 3: Testing
- [ ] Unit tests for domain layer
- [ ] Unit tests for application layer
- [ ] Integration tests for infrastructure
- [ ] E2E tests for critical flows

### Phase 4: Enhancement
- [ ] Add observability (logging, metrics, tracing)
- [ ] Add caching layer
- [ ] Add event sourcing (optional)
- [ ] Add CQRS (optional)

## Benefits Summary

1. **Modularity**: Clear separation of concerns
2. **Testability**: Everything testable in isolation
3. **Maintainability**: Easy to understand and modify
4. **Reliability**: Business rules enforced at domain level
5. **Extensibility**: Easy to add new features
6. **Flexibility**: Can swap implementations easily

## Next Steps

1. Complete integration of new architecture
2. Add comprehensive test coverage
3. Add observability and monitoring
4. Document API contracts
5. Performance optimization





