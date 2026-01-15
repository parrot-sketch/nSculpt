import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Custom exception for immutable document violations
 * Thrown when attempting to modify a document that is in an immutable state (SIGNED, REVOKED, ARCHIVED)
 */
export class ImmutableDocumentError extends HttpException {
  constructor(
    message: string,
    public readonly consentId?: string,
    public readonly currentStatus?: string,
    public readonly operation?: string,
    public readonly code: string = 'IMMUTABLE_DOCUMENT_ERROR',
  ) {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        code,
        message,
        consentId,
        currentStatus,
        operation,
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

/**
 * Custom exception for invalid state transitions
 * Thrown when attempting an invalid state transition (e.g., DRAFT → SIGNED)
 */
export class InvalidStateTransitionError extends HttpException {
  constructor(
    message: string,
    public readonly fromStatus: string,
    public readonly toStatus: string,
    public readonly consentId?: string,
    public readonly code: string = 'INVALID_STATE_TRANSITION_ERROR',
  ) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        code,
        message,
        fromStatus,
        toStatus,
        consentId,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Custom exception for immutable signature violations
 * Thrown when attempting to modify or delete a signature after creation
 */
export class ImmutableSignatureError extends HttpException {
  constructor(
    message: string,
    public readonly signatureId?: string,
    public readonly operation?: string,
    public readonly code: string = 'IMMUTABLE_SIGNATURE_ERROR',
  ) {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        code,
        message,
        signatureId,
        operation,
      },
      HttpStatus.FORBIDDEN,
    );
  }
}









