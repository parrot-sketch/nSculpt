/**
 * Consent Domain Events
 */

export enum ConsentEventType {
  CONSENT_CREATED = 'PatientConsentInstance.Created',
  CONSENT_SIGNED = 'PatientConsentInstance.Signed',
  CONSENT_REVOKED = 'PatientConsentInstance.Revoked',
  ACKNOWLEDGMENT_RECORDED = 'PatientConsentAcknowledgement.Recorded',
  
  // PDF Workflow Events
  PDF_CONSENT_CREATED = 'PDFConsent.Created',
  PDF_CONSENT_READY_FOR_SIGNATURE = 'PDFConsent.ReadyForSignature',
  PDF_CONSENT_SIGNED = 'PDFConsent.Signed',
  PDF_CONSENT_REVOKED = 'PDFConsent.Revoked',
  PDF_CONSENT_ARCHIVED = 'PDFConsent.Archived',
  
  // PDF Annotation Events
  PDF_CONSENT_ANNOTATION_ADDED = 'PDFConsent.AnnotationAdded',
  PDF_CONSENT_ANNOTATION_UPDATED = 'PDFConsent.AnnotationUpdated',
  PDF_CONSENT_ANNOTATION_DELETED = 'PDFConsent.AnnotationDeleted',
  PDF_CONSENT_LOCKED = 'PDFConsent.Locked',
}

export interface ConsentCreatedPayload {
  instanceId: string;
  instanceNumber: string;
  templateId: string;
  patientId: string;
}

export interface ConsentSignedPayload {
  instanceId: string;
  signedAt: string;
  signedBy: string;
}

export interface ConsentRevokedPayload {
  instanceId: string;
  revokedAt: string;
  revokedBy: string;
  reason?: string;
}

// PDF Workflow Event Payloads
export interface PDFConsentCreatedPayload {
  consentId: string;
  templateId: string;
  patientId: string;
  consultationId?: string;
  generatedPdfUrl?: string;
}

export interface PDFConsentReadyForSignaturePayload {
  consentId: string;
  sentAt: string;
  sentBy: string;
}

export interface PDFConsentSignedPayload {
  consentId: string;
  signedAt: string;
  signerType: string;
  signerName: string;
  finalPdfUrl: string;
}

export interface PDFConsentRevokedPayload {
  consentId: string;
  revokedAt: string;
  revokedBy: string;
  reason?: string;
}

export interface PDFConsentArchivedPayload {
  consentId: string;
  archivedAt: string;
  archivedBy: string;
  reason?: string;
}

// PDF Annotation Event Payloads
export interface PDFConsentAnnotationAddedPayload {
  annotationId: string;
  consentId: string;
  annotationType: string; // HIGHLIGHT, COMMENT, TEXT_EDIT, DRAWING, ARROW, RECTANGLE, CIRCLE
  pageNumber: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  color?: string;
  createdBy: string;
  createdAt: string;
}

export interface PDFConsentAnnotationUpdatedPayload {
  annotationId: string;
  consentId: string;
  annotationType: string;
  pageNumber: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  color?: string;
  updatedBy: string;
  updatedAt: string;
}

export interface PDFConsentAnnotationDeletedPayload {
  annotationId: string;
  consentId: string;
  annotationType: string;
  deletedBy: string;
  deletedAt: string;
}

export interface PDFConsentLockedPayload {
  consentId: string;
  lockedAt: string;
  finalPdfUrl: string;
  finalPdfHash?: string;
}




