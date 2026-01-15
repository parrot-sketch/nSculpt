/**
 * PDF Processor Interface
 * 
 * Abstraction for PDF processing operations.
 * This allows us to swap implementations (pdf-lib, pdfkit, etc.) without changing business logic.
 */

import { SignaturePosition } from '../value-objects/signature-position.vo';
import { ConsentAnnotation } from '../entities/consent.entity';

export interface PDFProcessor {
  /**
   * Parse placeholders from PDF template
   */
  parsePlaceholders(pdfBuffer: Buffer): Promise<string[]>;

  /**
   * Merge placeholder values into PDF
   */
  mergePlaceholders(
    templateBuffer: Buffer,
    placeholderValues: Record<string, string>,
  ): Promise<Buffer>;

  /**
   * Embed signature into PDF at specified position
   */
  embedSignature(
    pdfBuffer: Buffer,
    signatureImage: Buffer,
    position: SignaturePosition,
    signerName: string,
    signerType: string,
    signedAt: Date,
  ): Promise<Buffer>;

  /**
   * Embed multiple signatures into PDF
   */
  embedSignatures(
    pdfBuffer: Buffer,
    signatures: Array<{
      image: Buffer;
      position: SignaturePosition;
      signerName: string;
      signerType: string;
      signedAt: Date;
    }>,
  ): Promise<Buffer>;

  /**
   * Embed annotations into PDF
   */
  embedAnnotations(
    pdfBuffer: Buffer,
    annotations: ConsentAnnotation[],
  ): Promise<Buffer>;

  /**
   * Flatten PDF form fields (make read-only)
   */
  flattenFormFields(pdfBuffer: Buffer): Promise<Buffer>;

  /**
   * Add footer with timestamp and hash
   */
  addFooter(
    pdfBuffer: Buffer,
    timestamp: string,
    hash: string,
  ): Promise<Buffer>;

  /**
   * Calculate SHA-256 hash of PDF
   */
  calculateHash(pdfBuffer: Buffer): string;

  /**
   * Verify PDF integrity
   */
  verifyHash(pdfBuffer: Buffer, storedHash: string): boolean;
}





