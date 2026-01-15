/**
 * Consent Domain Errors
 * 
 * Structured error types for consent operations.
 * These are domain errors that can be mapped to HTTP responses.
 */

export class ConsentNotFoundError extends Error {
  constructor(public readonly consentId: string) {
    super(`Consent ${consentId} not found`);
    this.name = 'ConsentNotFoundError';
  }
}

export class ConsentImmutableError extends Error {
  constructor(
    public readonly consentId: string,
    public readonly status: string,
    public readonly operation: string,
  ) {
    super(`Cannot ${operation} consent ${consentId} in ${status} state`);
    this.name = 'ConsentImmutableError';
  }
}

export class InvalidStateTransitionError extends Error {
  constructor(
    public readonly from: string,
    public readonly to: string,
    public readonly consentId?: string,
  ) {
    super(`Cannot transition from ${from} to ${to}`);
    this.name = 'InvalidStateTransitionError';
  }
}

export class SignatureOrderViolationError extends Error {
  constructor(
    public readonly requiredSigner: string,
    public readonly attemptedSigner: string,
    public readonly consentId: string,
  ) {
    super(`Cannot sign as ${attemptedSigner}. ${requiredSigner} must sign first.`);
    this.name = 'SignatureOrderViolationError';
  }
}

export class DuplicateSignatureError extends Error {
  constructor(
    public readonly signerType: string,
    public readonly consentId: string,
  ) {
    super(`${signerType} has already signed consent ${consentId}`);
    this.name = 'DuplicateSignatureError';
  }
}

export class PDFProcessingError extends Error {
  constructor(
    public readonly operation: string,
    public readonly originalError?: Error,
  ) {
    super(`PDF processing failed: ${operation}. ${originalError?.message || ''}`);
    this.name = 'PDFProcessingError';
  }
}





