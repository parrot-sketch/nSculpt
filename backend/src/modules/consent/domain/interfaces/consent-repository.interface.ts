/**
 * Consent Repository Interface
 * 
 * Abstraction for consent data persistence.
 * This allows us to swap implementations (Prisma, TypeORM, etc.) without changing business logic.
 */

import { Consent, ConsentStatus, ConsentSignature, ConsentAnnotation } from '../entities/consent.entity';

export interface IConsentRepository {
  /**
   * Find consent by ID
   */
  findById(id: string): Promise<Consent | null>;

  /**
   * Find consents by patient
   */
  findByPatient(patientId: string, includeArchived?: boolean): Promise<Consent[]>;

  /**
   * Find consents by consultation
   */
  findByConsultation(consultationId: string): Promise<Consent[]>;

  /**
   * Create consent
   */
  create(consent: Omit<Consent, 'id' | 'createdAt' | 'signatures' | 'annotations'>): Promise<Consent>;

  /**
   * Update consent status
   */
  updateStatus(
    id: string,
    status: ConsentStatus,
    options?: {
      generatedPdfUrl?: string;
      finalPdfUrl?: string;
      finalPdfHash?: string;
      sentForSignatureAt?: Date;
      lockedAt?: Date | null;
    },
  ): Promise<Consent>;

  /**
   * Add signature to consent
   */
  addSignature(consentId: string, signature: Omit<ConsentSignature, 'id'>): Promise<ConsentSignature>;

  /**
   * Get signatures for consent
   */
  getSignatures(consentId: string): Promise<ConsentSignature[]>;

  /**
   * Add annotation to consent
   */
  addAnnotation(consentId: string, annotation: Omit<ConsentAnnotation, 'id' | 'createdAt'>): Promise<ConsentAnnotation>;

  /**
   * Update annotation
   */
  updateAnnotation(consentId: string, annotationId: string, updates: Partial<ConsentAnnotation>): Promise<ConsentAnnotation>;

  /**
   * Delete annotation (soft delete)
   */
  deleteAnnotation(consentId: string, annotationId: string): Promise<void>;

  /**
   * Get annotations for consent
   */
  getAnnotations(consentId: string): Promise<ConsentAnnotation[]>;

  /**
   * Archive consent
   */
  archive(id: string, archivedBy: string): Promise<Consent>;
}





