/**
 * Consent Validator
 * 
 * Application layer validation for consent operations.
 * Validates business rules before executing use cases.
 */

import { Injectable } from '@nestjs/common';
import { Consent } from '../../domain/entities/consent.entity';
import { SignerType } from '../../domain/entities/consent.entity';
import {
  ConsentNotFoundError,
  ConsentImmutableError,
  InvalidStateTransitionError,
  SignatureOrderViolationError,
  DuplicateSignatureError,
} from '../errors/consent-errors';

@Injectable()
export class ConsentValidator {
  /**
   * Validate consent exists
   */
  validateConsentExists(consent: Consent | null, consentId: string): asserts consent is Consent {
    if (!consent) {
      throw new ConsentNotFoundError(consentId);
    }
  }

  /**
   * Validate consent can be modified
   */
  validateConsentCanBeModified(consent: Consent, operation: string): void {
    if (consent.isImmutable()) {
      throw new ConsentImmutableError(consent.id, consent.status, operation);
    }
  }

  /**
   * Validate consent can be annotated
   */
  validateConsentCanBeAnnotated(consent: Consent, operation: string): void {
    if (!consent.canAnnotate()) {
      throw new ConsentImmutableError(consent.id, consent.status, operation);
    }
  }

  /**
   * Validate consent can regenerate PDF
   */
  validateConsentCanRegeneratePDF(consent: Consent): void {
    if (!consent.canRegeneratePDF()) {
      throw new ConsentImmutableError(consent.id, consent.status, 'regenerate_pdf');
    }
  }

  /**
   * Validate state transition
   */
  validateStateTransition(
    from: string,
    to: string,
    consentId?: string,
  ): void {
    // This would use the state machine
    // For now, basic validation
    if (from === to) {
      return; // Idempotent
    }
    // More validation would be done by state machine
  }

  /**
   * Validate signature order
   */
  validateSignatureOrder(
    consent: Consent,
    signerType: SignerType,
    signatureOrder: Record<SignerType, number>,
  ): void {
    const requiredOrder = signatureOrder[signerType];
    const existingSignatures = consent.signatures;

    // Check if any required prior signer hasn't signed
    for (const [type, order] of Object.entries(signatureOrder)) {
      if (order < requiredOrder) {
        const priorSignerType = type as SignerType;
        if (!consent.hasSigned(priorSignerType)) {
          throw new SignatureOrderViolationError(
            priorSignerType,
            signerType,
            consent.id,
          );
        }
      }
    }
  }

  /**
   * Validate signer hasn't already signed
   */
  validateSignerHasNotSigned(consent: Consent, signerType: SignerType): void {
    if (consent.hasSigned(signerType)) {
      throw new DuplicateSignatureError(signerType, consent.id);
    }
  }
}





