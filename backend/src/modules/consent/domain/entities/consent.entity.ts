/**
 * Consent Domain Entity
 * 
 * Core domain model representing a consent document.
 * This is a pure domain entity with no infrastructure dependencies.
 */

export enum ConsentStatus {
  DRAFT = 'DRAFT',
  READY_FOR_SIGNATURE = 'READY_FOR_SIGNATURE',
  PARTIALLY_SIGNED = 'PARTIALLY_SIGNED',
  SIGNED = 'SIGNED',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
  ARCHIVED = 'ARCHIVED',
}

export enum SignerType {
  PATIENT = 'PATIENT',
  GUARDIAN = 'GUARDIAN',
  DOCTOR = 'DOCTOR',
  NURSE_WITNESS = 'NURSE_WITNESS',
  ADMIN = 'ADMIN',
}

export interface ConsentSignature {
  id: string;
  consentId: string;
  signerId: string;
  signerName: string;
  signerType: SignerType;
  signatureUrl?: string;
  signedAt: Date;
  ipAddress?: string;
  deviceInfo?: string;
}

export interface ConsentAnnotation {
  id: string;
  consentId: string;
  annotationType: string;
  pageNumber: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  color?: string;
  coordinates?: any;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  deletedAt?: Date;
}

/**
 * Consent Domain Entity
 * 
 * Represents a consent document with all its business rules.
 * This is the core domain model - no infrastructure concerns.
 */
export class Consent {
  constructor(
    public readonly id: string,
    public readonly templateId: string,
    public readonly patientId: string,
    public readonly consultationId: string | null,
    public status: ConsentStatus,
    public readonly createdBy: string,
    public readonly createdAt: Date,
    public generatedPdfUrl?: string,
    public finalPdfUrl?: string,
    public finalPdfHash?: string,
    public sentForSignatureAt?: Date,
    public lockedAt?: Date | null,
    public archivedAt?: Date | null,
    public archivedBy?: string | null,
    public signatures: ConsentSignature[] = [],
    public annotations: ConsentAnnotation[] = [],
  ) {}

  /**
   * Check if consent can be modified
   */
  canBeModified(): boolean {
    return this.status === ConsentStatus.DRAFT ||
           this.status === ConsentStatus.READY_FOR_SIGNATURE ||
           this.status === ConsentStatus.PARTIALLY_SIGNED;
  }

  /**
   * Check if consent is immutable
   */
  isImmutable(): boolean {
    return this.status === ConsentStatus.SIGNED ||
           this.status === ConsentStatus.REVOKED ||
           this.status === ConsentStatus.ARCHIVED;
  }

  /**
   * Check if annotations are allowed
   */
  canAnnotate(): boolean {
    return this.canBeModified() && this.lockedAt === null;
  }

  /**
   * Check if PDF can be regenerated
   */
  canRegeneratePDF(): boolean {
    return this.status === ConsentStatus.DRAFT && this.signatures.length === 0;
  }

  /**
   * Check if consent is fully signed
   */
  isFullySigned(): boolean {
    return this.status === ConsentStatus.SIGNED;
  }

  /**
   * Get signature by signer type
   */
  getSignatureByType(signerType: SignerType): ConsentSignature | undefined {
    return this.signatures.find(sig => sig.signerType === signerType);
  }

  /**
   * Check if signer type has already signed
   */
  hasSigned(signerType: SignerType): boolean {
    return this.getSignatureByType(signerType) !== undefined;
  }

  /**
   * Get active (non-deleted) annotations
   */
  getActiveAnnotations(): ConsentAnnotation[] {
    return this.annotations.filter(ann => ann.deletedAt === null || ann.deletedAt === undefined);
  }
}





