/**
 * Consent State Machine Domain Service
 * 
 * Pure domain logic for state transitions.
 * No infrastructure dependencies - fully testable.
 */

import { ConsentStatus } from '../entities/consent.entity';

export class ConsentStateMachine {
  private readonly ALLOWED_TRANSITIONS: Record<ConsentStatus, ConsentStatus[]> = {
    [ConsentStatus.DRAFT]: [ConsentStatus.READY_FOR_SIGNATURE, ConsentStatus.ARCHIVED],
    [ConsentStatus.READY_FOR_SIGNATURE]: [ConsentStatus.PARTIALLY_SIGNED, ConsentStatus.ARCHIVED],
    [ConsentStatus.PARTIALLY_SIGNED]: [ConsentStatus.SIGNED, ConsentStatus.ARCHIVED],
    [ConsentStatus.SIGNED]: [ConsentStatus.REVOKED, ConsentStatus.ARCHIVED],
    [ConsentStatus.REVOKED]: [ConsentStatus.ARCHIVED],
    [ConsentStatus.EXPIRED]: [ConsentStatus.ARCHIVED],
    [ConsentStatus.ARCHIVED]: [], // Terminal state
  };

  private readonly IMMUTABLE_STATES: ConsentStatus[] = [
    ConsentStatus.SIGNED,
    ConsentStatus.REVOKED,
    ConsentStatus.ARCHIVED,
  ];

  private readonly ANNOTATION_ALLOWED_STATES: ConsentStatus[] = [
    ConsentStatus.DRAFT,
    ConsentStatus.READY_FOR_SIGNATURE,
    ConsentStatus.PARTIALLY_SIGNED,
  ];

  private readonly PDF_REGENERATION_ALLOWED_STATES: ConsentStatus[] = [
    ConsentStatus.DRAFT,
  ];

  /**
   * Validate state transition
   */
  validateTransition(from: ConsentStatus, to: ConsentStatus): void {
    // Allow same state (idempotent)
    if (from === to) {
      return;
    }

    const allowedNextStates = this.ALLOWED_TRANSITIONS[from];
    if (!allowedNextStates) {
      throw new Error(`Invalid source state: ${from}`);
    }

    if (!allowedNextStates.includes(to)) {
      const allowedStatesStr = allowedNextStates.join(', ');
      throw new Error(
        `Cannot transition from ${from} to ${to}. Allowed transitions: ${allowedStatesStr}`
      );
    }
  }

  /**
   * Check if state is immutable
   */
  isImmutableState(status: ConsentStatus): boolean {
    return this.IMMUTABLE_STATES.includes(status);
  }

  /**
   * Check if annotations are allowed
   */
  areAnnotationsAllowed(status: ConsentStatus): boolean {
    return this.ANNOTATION_ALLOWED_STATES.includes(status);
  }

  /**
   * Check if PDF regeneration is allowed
   */
  isPDFRegenerationAllowed(status: ConsentStatus): boolean {
    return this.PDF_REGENERATION_ALLOWED_STATES.includes(status);
  }

  /**
   * Get allowed next states
   */
  getAllowedNextStates(from: ConsentStatus): ConsentStatus[] {
    return this.ALLOWED_TRANSITIONS[from] || [];
  }
}





