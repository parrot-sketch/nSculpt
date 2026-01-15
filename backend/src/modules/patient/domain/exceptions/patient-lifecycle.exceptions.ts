import { HttpException, HttpStatus } from '@nestjs/common';
import { PatientLifecycleState } from '../patient-lifecycle-state.enum';

/**
 * Invalid State Transition Error
 * 
 * Thrown when attempting an invalid state transition in the patient lifecycle.
 * This is a domain-level error that represents a business rule violation.
 */
export class InvalidPatientLifecycleTransitionError extends HttpException {
  constructor(
    message: string,
    public readonly patientId: string,
    public readonly fromState: PatientLifecycleState,
    public readonly toState: PatientLifecycleState,
    public readonly allowedTransitions?: PatientLifecycleState[],
    public readonly code: string = 'INVALID_PATIENT_LIFECYCLE_TRANSITION',
  ) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        code,
        message,
        patientId,
        fromState,
        toState,
        allowedTransitions,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Unauthorized State Transition Error
 * 
 * Thrown when the actor's role does not have permission to perform the transition.
 */
export class UnauthorizedLifecycleTransitionError extends HttpException {
  constructor(
    message: string,
    public readonly patientId: string,
    public readonly fromState: PatientLifecycleState,
    public readonly toState: PatientLifecycleState,
    public readonly actorRole: string,
    public readonly requiredRoles: string[],
    public readonly code: string = 'UNAUTHORIZED_LIFECYCLE_TRANSITION',
  ) {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        code,
        message,
        patientId,
        fromState,
        toState,
        actorRole,
        requiredRoles,
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

/**
 * Missing Required Data Error
 * 
 * Thrown when attempting a transition that requires specific data that doesn't exist.
 * Example: Cannot transition to CONSENT_SIGNED without a signed consent record.
 */
export class MissingRequiredDataError extends HttpException {
  constructor(
    message: string,
    public readonly patientId: string,
    public readonly targetState: PatientLifecycleState,
    public readonly missingData: string[],
    public readonly code: string = 'MISSING_REQUIRED_DATA',
  ) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        code,
        message,
        patientId,
        targetState,
        missingData,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Patient Not Found Error
 * 
 * Thrown when attempting to transition a patient that doesn't exist.
 */
export class PatientLifecycleNotFoundError extends HttpException {
  constructor(
    message: string,
    public readonly patientId: string,
    public readonly code: string = 'PATIENT_LIFECYCLE_NOT_FOUND',
  ) {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        code,
        message,
        patientId,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}
