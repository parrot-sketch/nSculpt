import { Injectable, Logger } from '@nestjs/common';
import { ConsentStatus } from '@prisma/client';
import {
  ImmutableDocumentError,
  InvalidStateTransitionError,
  ImmutableSignatureError,
} from '../exceptions/consent-state-machine.exceptions';

/**
 * Annotation operation types
 */
export enum AnnotationOperation {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

/**
 * Signature operation types
 */
export enum SignatureOperation {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

/**
 * Consent State Machine Service
 * 
 * Enforces strict state transition rules and immutability constraints for medical consent documents.
 * Designed for legal defensibility in healthcare - all rules are non-negotiable.
 * 
 * State Flow: DRAFT → READY_FOR_SIGNATURE → PARTIALLY_SIGNED → SIGNED → REVOKED/ARCHIVED
 * 
 * Key Rules:
 * - Annotations: Create/Update/Delete allowed only in DRAFT, READY_FOR_SIGNATURE, PARTIALLY_SIGNED
 * - Signatures: Immutable once created, cannot be deleted or modified
 * - PDF: Cannot regenerate after leaving DRAFT state
 * - State Transitions: Strictly enforced state machine
 */
@Injectable()
export class ConsentStateMachineService {
  private readonly logger = new Logger(ConsentStateMachineService.name);

  /**
   * Allowed state transitions
   * Maps each state to an array of valid next states
   */
  private readonly ALLOWED_TRANSITIONS: Record<ConsentStatus, ConsentStatus[]> = {
    [ConsentStatus.DRAFT]: [ConsentStatus.READY_FOR_SIGNATURE, ConsentStatus.ARCHIVED],
    [ConsentStatus.READY_FOR_SIGNATURE]: [ConsentStatus.PARTIALLY_SIGNED, ConsentStatus.ARCHIVED],
    [ConsentStatus.PARTIALLY_SIGNED]: [ConsentStatus.SIGNED, ConsentStatus.ARCHIVED],
    [ConsentStatus.SIGNED]: [ConsentStatus.REVOKED, ConsentStatus.ARCHIVED],
    [ConsentStatus.REVOKED]: [ConsentStatus.ARCHIVED],
    [ConsentStatus.EXPIRED]: [ConsentStatus.ARCHIVED],
    [ConsentStatus.ARCHIVED]: [], // Terminal state - no transitions allowed
  };

  /**
   * Immutable states - documents in these states cannot be modified
   */
  private readonly IMMUTABLE_STATES: ConsentStatus[] = [
    ConsentStatus.SIGNED,
    ConsentStatus.REVOKED,
    ConsentStatus.ARCHIVED,
  ];

  /**
   * States that allow annotation operations
   */
  private readonly ANNOTATION_ALLOWED_STATES: ConsentStatus[] = [
    ConsentStatus.DRAFT,
    ConsentStatus.READY_FOR_SIGNATURE,
    ConsentStatus.PARTIALLY_SIGNED,
  ];

  /**
   * States that allow PDF regeneration
   */
  private readonly PDF_REGENERATION_ALLOWED_STATES: ConsentStatus[] = [
    ConsentStatus.DRAFT,
  ];

  /**
   * Validate state transition
   * 
   * Ensures the transition from 'from' to 'to' is allowed according to the state machine.
   * Throws InvalidStateTransitionError if transition is not allowed.
   * 
   * @param from - Current state
   * @param to - Target state
   * @param consentId - Optional consent ID for error context
   * @throws InvalidStateTransitionError if transition is invalid
   */
  validateStateTransition(
    from: ConsentStatus,
    to: ConsentStatus,
    consentId?: string,
  ): void {
    // Allow same state (idempotent operations)
    if (from === to) {
      this.logger.debug(`State transition validation passed: ${from} → ${to} (same state)`);
      return;
    }

    const allowedNextStates = this.ALLOWED_TRANSITIONS[from];

    if (!allowedNextStates) {
      throw new InvalidStateTransitionError(
        `Invalid source state: ${from}`,
        from,
        to,
        consentId,
      );
    }

    if (!allowedNextStates.includes(to)) {
      const allowedStatesStr = allowedNextStates.join(', ');
      throw new InvalidStateTransitionError(
        `Cannot transition from ${from} to ${to}. Allowed transitions from ${from}: ${allowedStatesStr}`,
        from,
        to,
        consentId,
      );
    }

    this.logger.debug(`State transition validation passed: ${from} → ${to}`);
  }

  /**
   * Validate annotation operation
   * 
   * Ensures annotations can only be created/updated/deleted in states that allow modifications.
   * Blocks all annotation operations once the document is SIGNED, REVOKED, or ARCHIVED.
   * 
   * Rules:
   * - CREATE/UPDATE/DELETE allowed in: DRAFT, READY_FOR_SIGNATURE, PARTIALLY_SIGNED
   * - All operations blocked in: SIGNED, REVOKED, ARCHIVED
   * 
   * @param status - Current consent status
   * @param operation - Annotation operation type
   * @param consentId - Optional consent ID for error context
   * @param lockedAt - Optional timestamp when document was locked (additional check)
   * @throws ImmutableDocumentError if operation is not allowed
   */
  validateAnnotationOperation(
    status: ConsentStatus,
    operation: AnnotationOperation,
    consentId?: string,
    lockedAt?: Date | null,
  ): void {
    // Check if document is locked (additional safety check)
    if (lockedAt !== null && lockedAt !== undefined) {
      throw new ImmutableDocumentError(
        'Cannot modify annotations on locked document',
        consentId,
        status,
        operation,
        'DOCUMENT_LOCKED',
      );
    }

    // Check if state allows annotations
    if (!this.ANNOTATION_ALLOWED_STATES.includes(status)) {
      const allowedStatesStr = this.ANNOTATION_ALLOWED_STATES.join(', ');
      throw new ImmutableDocumentError(
        `Cannot ${operation} annotations in state ${status}. Annotation operations allowed only in: ${allowedStatesStr}`,
        consentId,
        status,
        operation,
      );
    }

    this.logger.debug(`Annotation operation validation passed: ${operation} in state ${status}`);
  }

  /**
   * Validate signature operation
   * 
   * Ensures signatures are immutable once created. Signatures cannot be updated or deleted,
   * only created. This is critical for legal defensibility.
   * 
   * Rules:
   * - CREATE: Allowed (subject to state machine rules in calling service)
   * - UPDATE: Never allowed (signatures are immutable)
   * - DELETE: Never allowed (signatures are immutable)
   * 
   * @param operation - Signature operation type
   * @param signatureId - Optional signature ID for error context
   * @throws ImmutableSignatureError if operation is not CREATE
   */
  validateSignatureOperation(
    operation: SignatureOperation,
    signatureId?: string,
  ): void {
    // Only CREATE is allowed - UPDATE and DELETE are never permitted
    if (operation !== SignatureOperation.CREATE) {
      throw new ImmutableSignatureError(
        `Signature operation '${operation}' is not allowed. Signatures are immutable once created and cannot be modified or deleted.`,
        signatureId,
        operation,
      );
    }

    this.logger.debug(`Signature operation validation passed: ${operation}`);
  }

  /**
   * Validate PDF regeneration
   * 
   * Ensures PDF can only be regenerated in DRAFT state. Once the consent moves to
   * READY_FOR_SIGNATURE or beyond, the PDF cannot be regenerated to preserve integrity.
   * 
   * Rules:
   * - Regeneration allowed in: DRAFT only
   * - Regeneration blocked in: READY_FOR_SIGNATURE, PARTIALLY_SIGNED, SIGNED, REVOKED, ARCHIVED
   * 
   * @param status - Current consent status
   * @param consentId - Optional consent ID for error context
   * @param hasSignatures - Whether the consent has existing signatures
   * @throws ImmutableDocumentError if regeneration is not allowed
   */
  validatePDFRegeneration(
    status: ConsentStatus,
    consentId?: string,
    hasSignatures: boolean = false,
  ): void {
    // Block regeneration if signatures exist (additional safety check)
    if (hasSignatures) {
      throw new ImmutableDocumentError(
        'Cannot regenerate PDF with existing signatures',
        consentId,
        status,
        'regenerate_pdf',
        'HAS_EXISTING_SIGNATURES',
      );
    }

    // Check if state allows regeneration
    if (!this.PDF_REGENERATION_ALLOWED_STATES.includes(status)) {
      throw new ImmutableDocumentError(
        `Cannot regenerate PDF in state ${status}. PDF regeneration allowed only in DRAFT state.`,
        consentId,
        status,
        'regenerate_pdf',
      );
    }

    this.logger.debug(`PDF regeneration validation passed in state ${status}`);
  }

  /**
   * Check if state is immutable
   * 
   * Helper method to check if a document in the given state is immutable.
   * 
   * @param status - Consent status to check
   * @returns true if state is immutable, false otherwise
   */
  isImmutableState(status: ConsentStatus): boolean {
    return this.IMMUTABLE_STATES.includes(status);
  }

  /**
   * Check if annotations are allowed in state
   * 
   * Helper method to check if annotation operations are allowed in the given state.
   * 
   * @param status - Consent status to check
   * @returns true if annotations are allowed, false otherwise
   */
  areAnnotationsAllowed(status: ConsentStatus): boolean {
    return this.ANNOTATION_ALLOWED_STATES.includes(status);
  }

  /**
   * Check if PDF regeneration is allowed in state
   * 
   * Helper method to check if PDF regeneration is allowed in the given state.
   * 
   * @param status - Consent status to check
   * @returns true if regeneration is allowed, false otherwise
   */
  isPDFRegenerationAllowed(status: ConsentStatus): boolean {
    return this.PDF_REGENERATION_ALLOWED_STATES.includes(status);
  }

  /**
   * Get allowed next states
   * 
   * Returns an array of valid next states from the current state.
   * Useful for UI/UX to show available actions.
   * 
   * @param from - Current state
   * @returns Array of allowed next states
   */
  getAllowedNextStates(from: ConsentStatus): ConsentStatus[] {
    return this.ALLOWED_TRANSITIONS[from] || [];
  }

  /**
   * Get state machine metadata
   * 
   * Returns metadata about the state machine for debugging/logging.
   * 
   * @returns State machine metadata
   */
  getStateMachineMetadata(): {
    allowedTransitions: Record<ConsentStatus, ConsentStatus[]>;
    immutableStates: ConsentStatus[];
    annotationAllowedStates: ConsentStatus[];
    pdfRegenerationAllowedStates: ConsentStatus[];
  } {
    return {
      allowedTransitions: this.ALLOWED_TRANSITIONS,
      immutableStates: this.IMMUTABLE_STATES,
      annotationAllowedStates: this.ANNOTATION_ALLOWED_STATES,
      pdfRegenerationAllowedStates: this.PDF_REGENERATION_ALLOWED_STATES,
    };
  }
}









