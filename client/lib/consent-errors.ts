/**
 * Consent Error Mapping
 * Maps backend error codes to user-friendly UI messages
 */

export interface ConsentError {
  code: string;
  message: string;
  details?: any;
}

export function mapConsentError(error: any): ConsentError {
  // Check if error has structured format from backend
  const errorCode = error?.response?.data?.code || error?.code;
  const errorMessage = error?.response?.data?.message || error?.message;
  const errorDetails = error?.response?.data?.details || error?.details;

  // Map error codes to user-friendly messages
  const errorMap: Record<string, string> = {
    CONSENT_SIGNATURE_ORDER_VIOLATION:
      'Patient or Guardian must sign before Doctor. Please wait for patient signature.',
    CONSENT_ALREADY_SIGNED:
      'This consent is already fully signed and locked. No further signatures allowed.',
    CONSENT_REVOKED: 'This consent has been revoked and is no longer valid.',
    CONSENT_ARCHIVED: 'This consent has been archived and is read-only.',
    CONSENT_ACCESS_FORBIDDEN:
      'You do not have permission to access this consent.',
    CONSENT_CANNOT_REVOKE_SURGERY_SCHEDULED:
      'Cannot revoke consent when surgery is already scheduled. Cancel surgery first or create a new consent.',
    CONSENT_CANNOT_ARCHIVE_INVALID_STATE:
      'Only SIGNED or REVOKED consents can be archived.',
    CONSENT_FORBIDDEN_ACTION: errorMessage || 'This action is not allowed.',
    CONSENT_INVALID_STATE: errorMessage || 'Invalid consent state for this operation.',
    CONSENT_INVALID_STATE_FOR_SIGNING:
      'Consent must be READY_FOR_SIGNATURE or PARTIALLY_SIGNED to sign.',
    CONSENT_ALREADY_REVOKED: 'This consent is already revoked.',
    CONSENT_CANNOT_REVOKE_SIGNED:
      'Cannot revoke a signed consent. Create a new version instead.',
    CONSENT_ARCHIVE_FORBIDDEN: 'Only ADMIN can archive consents.',
    CONSENT_ARCHIVE_REASON_REQUIRED: 'Archive reason is required.',
  };

  const message =
    errorCode && errorMap[errorCode]
      ? errorMap[errorCode]
      : errorMessage || 'An error occurred while processing the consent.';

  return {
    code: errorCode || 'UNKNOWN_ERROR',
    message,
    details: errorDetails,
  };
}

export function getConsentActionTooltip(
  action: string,
  consent: any,
  userRole: string
): string | null {
  if (consent.status === 'SIGNED') {
    if (action === 'sign') {
      return 'This consent is already fully signed and locked.';
    }
    if (action === 'revoke') {
      return 'Cannot revoke a signed consent. Create a new version instead.';
    }
  }

  if (consent.status === 'REVOKED') {
    if (action === 'sign') {
      return 'This consent has been revoked and is no longer valid.';
    }
    if (action === 'revoke') {
      return 'This consent is already revoked.';
    }
  }

  if (consent.status === 'ARCHIVED') {
    return 'This consent has been archived and is read-only.';
  }

  if (action === 'sign') {
    const signatures = consent.signatures || [];
    const hasPatient = signatures.some(
      (s: any) => s.signerType === 'PATIENT' || s.signerType === 'GUARDIAN'
    );


    if (userRole === 'DOCTOR' && !hasPatient) {
      return 'Patient or Guardian must sign before Doctor.';
    }
    if (userRole === 'NURSE_WITNESS' && !hasPatient) {
      return 'Patient or Guardian must sign before Witness.';
    }
  }

  if (action === 'revoke') {
    if (userRole !== 'ADMIN' && userRole !== 'DOCTOR') {
      return 'Only ADMIN or DOCTOR can revoke consents.';
    }
    // Check if surgery is scheduled (would need consultation data)
    // For now, backend will handle this
  }

  if (action === 'archive') {
    if (userRole !== 'ADMIN') {
      return 'Only ADMIN can archive consents.';
    }
    if (consent.status !== 'SIGNED' && consent.status !== 'REVOKED') {
      return 'Only SIGNED or REVOKED consents can be archived.';
    }
  }

  return null;
}









