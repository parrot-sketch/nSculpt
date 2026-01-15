// Consent Types
// Based on backend Prisma schema

export type ConsentStatus = 
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'PENDING_SIGNATURES'
  | 'SIGNED'
  | 'REVOKED'
  | 'EXPIRED'
  | 'SUPERSEDED';

export type ConsentTemplateType = 
  | 'GENERAL'
  | 'PROCEDURE_SPECIFIC';

export type ConsentPartyType = 
  | 'PATIENT'
  | 'GUARDIAN'
  | 'SURGEON'
  | 'ANESTHESIOLOGIST'
  | 'WITNESS'
  | 'ADMIN';

export interface ConsentTemplate {
  id: string;
  templateCode: string;
  name: string;
  description?: string;
  templateType: ConsentTemplateType;
  procedureCode?: string;
  applicableCPTCodes: string[];
  version: string;
  versionNumber: number;
  isActive: boolean;
  effectiveFrom: string;
  effectiveUntil?: string;
  
  // Relations (optional, loaded on demand)
  sections?: ConsentSection[];
  requiredParties?: ConsentTemplateRequiredParty[];
}

export interface ConsentSection {
  id: string;
  templateId: string;
  sectionCode: string;
  title: string;
  description?: string;
  content?: string;
  plainLanguageContent?: string;
  order: number;
  required: boolean;
  requiresAcknowledgment: boolean;
  requiresUnderstandingCheck: boolean;
  understandingCheckPrompt?: string;
  isExpandable: boolean;
  showTooltip: boolean;
  
  // Relations (optional)
  clauses?: ConsentClause[];
}

export interface ConsentClause {
  id: string;
  sectionId: string;
  clauseCode: string;
  content: string;
  order: number;
  required: boolean;
  requiresAcknowledgment: boolean;
}

export interface ConsentTemplateRequiredParty {
  id: string;
  templateId: string;
  partyType: ConsentPartyType;
  required: boolean;
  order: number;
  notes?: string;
}

export interface PatientConsentInstance {
  id: string;
  instanceNumber: string;
  templateId: string;
  templateVersion: string;
  patientId: string;
  
  // Status
  status: ConsentStatus;
  signedAt?: string;
  revokedAt?: string;
  expiresAt?: string;
  validUntil?: string;
  
  // Relationships
  relatedCaseId?: string;
  relatedRecordId?: string;
  consultationId?: string;
  procedurePlanId?: string;
  
  // Context
  presentedBy: string;
  revokedBy?: string;
  
  // Understanding tracking
  understandingChecksPassed: boolean;
  questionsRaised: boolean;
  allSectionsAcknowledged: boolean;
  
  // Language
  language: string;
  translated: boolean;
  
  // Re-consent tracking
  supersededBy?: string;
  supersedesId?: string;
  
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
  
  // Relations (optional, loaded on demand)
  template?: ConsentTemplate;
  acknowledgments?: PatientConsentAcknowledgement[];
  signatures?: ConsentSignature[];
  documentSnapshot?: ConsentDocumentSnapshot;
}

export interface PatientConsentAcknowledgement {
  id: string;
  instanceId: string;
  sectionId?: string;
  clauseId?: string;
  acknowledgedBy: string;
  acknowledgedAt: string;
  sectionCode?: string;
  clauseCode?: string;
  clauseContent?: string;
  acknowledged: boolean;
  declinedReason?: string;
  
  // Understanding check
  understandingCheckPassed: boolean;
  understandingResponse?: string;
  discussionRequired: boolean;
  discussionCompleted: boolean;
  discussedWith?: string;
  
  // Engagement tracking
  timeSpentSeconds?: number;
  scrollDepth?: number;
  
  // Digital signature evidence
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  signatureHash?: string;
}

export interface ConsentSignature {
  id: string;
  instanceId: string;
  partyType: ConsentPartyType;
  signedBy: string;
  signedAt: string;
  signatureMethod: string;
  signatureData?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  signatureHash?: string;
}

export interface ConsentDocumentSnapshot {
  id: string;
  instanceId: string;
  fullDocumentText: string;
  sectionSnapshots: any; // JSON object
  snapshottedAt: string;
}

export interface CreateConsentInstanceDto {
  templateId: string;
  patientId: string;
  consultationId?: string;
  procedurePlanId?: string;
  language?: string;
  notes?: string;
}

export interface AcknowledgeConsentSectionDto {
  instanceId: string;
  sectionId?: string;
  clauseId?: string;
  acknowledged: boolean;
  understandingCheckPassed?: boolean;
  understandingResponse?: string;
  discussionRequired?: boolean;
  declinedReason?: string;
}

export interface SignConsentDto {
  instanceId: string;
  partyType: ConsentPartyType;
  signatureMethod: string;
  signatureData?: string;
  deviceType?: string;
}

// ============================================================================
// PDF Consent Types (for PDF-based consent workflow)
// ============================================================================

export type PDFConsentStatus = 
  | 'DRAFT'
  | 'READY_FOR_SIGNATURE'
  | 'PARTIALLY_SIGNED'
  | 'SIGNED'
  | 'REVOKED'
  | 'EXPIRED'
  | 'ARCHIVED';

export type PDFSignerType = 
  | 'PATIENT'
  | 'GUARDIAN'
  | 'DOCTOR'
  | 'NURSE_WITNESS'
  | 'ADMIN';

export interface PDFConsentTemplate {
  id: string;
  name: string;
  description?: string;
  fileUrl: string;
  templateCode?: string; // Template code (e.g., "GENERAL_CONSENT_V1")
  placeholders?: string[]; // Array of placeholder strings (e.g., ["PATIENT_NAME", "DATE"])
  isActive: boolean;
  templateType?: 'GENERAL' | 'PROCEDURE_SPECIFIC';
  procedureCode?: string;
  version: string;
  versionNumber: number;
  createdAt: string;
  updatedAt: string;
}

export interface PDFConsent {
  id: string;
  consentNumber: string;
  templateId: string;
  patientId: string;
  consultationId?: string;
  
  // Status
  status: PDFConsentStatus;
  
  // PDF URLs
  generatedPdfUrl?: string;
  finalPdfUrl?: string;
  finalPdfHash?: string;
  
  // Locking
  lockedAt?: string;
  
  // Revocation
  revokedAt?: string;
  revokedBy?: string;
  revokedReason?: string;
  
  // Archive
  archivedAt?: string;
  archivedBy?: string;
  archivedReason?: string;
  archived: boolean;
  
  // Versioning
  version: number;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  
  // Relations (optional, loaded on demand)
  template?: PDFConsentTemplate;
  signatures?: PDFConsentSignature[];
  patient?: any;
  consultation?: any;
}

export interface PDFConsentSignature {
  id: string;
  consentId: string;
  signerId: string;
  signerName: string;
  signerType: PDFSignerType;
  signatureUrl?: string;
  signedAt: string;
  ipAddress?: string;
  deviceInfo?: string;
  signatureHash?: string;
  
  // PDF Position (for inline signature placement)
  pageNumber?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  
  // Relations
  signer?: any;
}

// PDF Annotation Types
export type AnnotationType =
  | 'HIGHLIGHT'
  | 'COMMENT'
  | 'TEXT_EDIT'
  | 'DRAWING'
  | 'ARROW'
  | 'RECTANGLE'
  | 'CIRCLE';

export interface PDFConsentAnnotation {
  id: string;
  consentId: string;
  annotationType: AnnotationType;
  pageNumber: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  coordinates?: Record<string, any>; // JSONB for complex shapes
  content?: string;
  color?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  isImmutable: boolean;
}

export interface CreateAnnotationDto {
  annotationType: AnnotationType;
  pageNumber: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  coordinates?: Record<string, any>;
  content?: string;
  color?: string;
}

export interface UpdateAnnotationDto {
  annotationType?: AnnotationType;
  pageNumber?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  coordinates?: Record<string, any>;
  content?: string;
  color?: string;
}

export interface GeneratePDFConsentDto {
  templateId: string;
  patientId: string;
  consultationId?: string;
  placeholderValues?: Record<string, string>;
}

export interface SignPDFConsentDto {
  consentId: string;
  signerType: PDFSignerType;
  signerName: string;
  signatureUrl?: string;
  ipAddress?: string;
  deviceInfo?: string;
  overrideFlag?: boolean;
  overrideReason?: string;
  version?: number;
}

export interface SendForSignatureDto {
  consentId: string;
  notes?: string;
  version: number;
}

export interface RevokePDFConsentDto {
  consentId: string;
  reason: string;
  version: number;
}

export interface ArchivePDFConsentDto {
  consentId: string;
  reason: string;
  version: number;
}

export interface PatientConsentsResponse {
  structuredConsents: PatientConsentInstance[];
  pdfConsents: PDFConsent[];
}

