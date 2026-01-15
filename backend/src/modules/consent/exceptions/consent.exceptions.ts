import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Structured error for consent operations
 * Provides clear error codes and messages for frontend handling
 */
export class ConsentForbiddenActionException extends HttpException {
  constructor(
    message: string,
    public readonly code: string = 'CONSENT_FORBIDDEN_ACTION',
    public readonly details?: any,
  ) {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        code,
        message,
        details,
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class ConsentStateException extends HttpException {
  constructor(
    message: string,
    public readonly code: string = 'CONSENT_INVALID_STATE',
    public readonly currentState?: string,
    public readonly requiredState?: string,
  ) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        code,
        message,
        currentState,
        requiredState,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class ConsentSignatureOrderException extends HttpException {
  constructor(
    message: string,
    public readonly code: string = 'CONSENT_SIGNATURE_ORDER_VIOLATION',
    public readonly requiredSigner?: string,
    public readonly attemptedSigner?: string,
  ) {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        code,
        message,
        requiredSigner,
        attemptedSigner,
      },
      HttpStatus.FORBIDDEN,
    );
  }
}









