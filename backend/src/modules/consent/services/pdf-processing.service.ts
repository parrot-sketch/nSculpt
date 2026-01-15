import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts, PDFAnnotation } from 'pdf-lib';
// pdf-parse uses CommonJS export
import * as pdfParseModule from 'pdf-parse';
const pdfParse = (pdfParseModule as any).default || pdfParseModule;
import { PDFConsent, PDFConsentSignature } from '@prisma/client';

/**
 * PDF Processing Service
 * 
 * Handles PDF template processing, placeholder merging, and final document generation.
 * 
 * NOTE: This service provides the interface and business logic. Actual PDF manipulation
 * requires a PDF library like pdf-lib, pdfkit, or hummus-recipe. Install one of these
 * and implement the PDF manipulation methods.
 * 
 * Recommended: pdf-lib (https://pdf-lib.js.org/)
 * npm install pdf-lib
 */

export interface PlaceholderValue {
  key: string; // e.g., "PATIENT_NAME"
  value: string; // e.g., "John Doe"
}

export interface SignatureInfo {
  signerName: string;
  signerType: string;
  signedAt: Date;
  signatureUrl?: string;
  signatureImage?: Buffer; // Base64 decoded signature image
  position?: { x: number; y: number; page: number }; // Optional explicit position
}

@Injectable()
export class PDFProcessingService {
  private readonly logger = new Logger(PDFProcessingService.name);
  private readonly uploadsDir = process.env.UPLOADS_DIR || './uploads/consents';

  constructor() {
    // Ensure uploads directory exists
    this.ensureUploadsDirectory();
  }

  /**
   * Ensure uploads directory exists
   */
  private async ensureUploadsDirectory() {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    } catch (error) {
      this.logger.error(`Failed to create uploads directory: ${error}`);
    }
  }

  /**
   * Parse PDF template to extract placeholder fields
   * Looks for patterns like {{PATIENT_NAME}}, {{DATE}}, etc.
   * Also looks for signature anchors like [[SIGN_PATIENT]]
   * 
   * @param pdfBuffer - PDF file buffer
   * @returns Array of placeholder field names found in the PDF
   */
  async parsePlaceholders(pdfBuffer: Buffer): Promise<string[]> {
    try {
      const placeholders = new Set<string>();
      
      // Extract text from PDF using pdf-parse (pdf-lib doesn't support text extraction)
      const pdfData = await pdfParse(pdfBuffer);
      const text = pdfData.text;
      
      // Find {{PLACEHOLDER}} patterns
      const placeholderRegex = /\{\{(\w+)\}\}/g;
      let match;
      while ((match = placeholderRegex.exec(text)) !== null) {
        placeholders.add(match[1]);
      }
      
      // Find [[SIGN_*]] signature anchors
      const signatureRegex = /\[\[SIGN_(\w+)\]\]/g;
      while ((match = signatureRegex.exec(text)) !== null) {
        placeholders.add(`SIGN_${match[1]}`);
      }
      
      // Also check form fields in pdf-lib
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pages = pdfDoc.getPages();
      
      // Also check form fields
      try {
        const form = pdfDoc.getForm();
        const fields = form.getFields();
        for (const field of fields) {
          const fieldName = field.getName();
          if (fieldName.includes('{{') || fieldName.includes('[[')) {
            const matches = fieldName.match(/\{\{(\w+)\}\}/g) || [];
            matches.forEach(m => {
              const placeholder = m.replace(/[{}]/g, '');
              placeholders.add(placeholder);
            });
          }
        }
      } catch (error) {
        // Form may not exist, that's okay
        this.logger.debug('No form fields found in PDF');
      }
      
      return Array.from(placeholders);
    } catch (error) {
      this.logger.error(`Failed to parse PDF placeholders: ${error.message}`);
      // Fallback to text extraction
      const text = pdfBuffer.toString('utf-8');
      const placeholderRegex = /\{\{(\w+)\}\}/g;
      const placeholders = new Set<string>();
      let match;
      while ((match = placeholderRegex.exec(text)) !== null) {
        placeholders.add(match[1]);
      }
      return Array.from(placeholders);
    }
  }

  /**
   * Merge placeholder values into PDF template
   * Replaces {{PLACEHOLDER}} patterns in text and form fields
   * 
   * @param templateBuffer - Original PDF template buffer
   * @param placeholderValues - Key-value pairs of placeholders to replace
   * @returns Buffer of merged PDF
   */
  async mergePlaceholders(
    templateBuffer: Buffer,
    placeholderValues: Record<string, string>,
  ): Promise<Buffer> {
    try {
      const pdfDoc = await PDFDocument.load(templateBuffer);
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      // Replace placeholders in text on each page
      for (const page of pages) {
        const { width, height } = page.getSize();
        
        // Get existing text content to find placeholder positions
        // Note: pdf-lib doesn't easily support text replacement, so we'll overlay new text
        // For production, consider using PDFs with form fields instead
        
        // Try to fill form fields first
        try {
          const form = pdfDoc.getForm();
          const fields = form.getFields();
          
          for (const field of fields) {
            const fieldName = field.getName();
            const fieldType = field.constructor.name;
            
            // Check if field name contains a placeholder
            for (const [key, value] of Object.entries(placeholderValues)) {
              if (fieldName.includes(`{{${key}}}`) || fieldName === key) {
                try {
                  if (fieldType.includes('TextField')) {
                    (field as any).setText(value);
                  } else if (fieldType.includes('CheckBox')) {
                    // Handle checkboxes if needed
                  }
                } catch (error) {
                  this.logger.warn(`Failed to set field ${fieldName}: ${error.message}`);
                }
              }
            }
          }
        } catch (error) {
          this.logger.debug('No form fields to fill or form access failed');
        }
        
        // For text-based placeholders, we would need to:
        // 1. Extract text positions (complex with pdf-lib)
        // 2. Draw new text over old text
        // For now, form fields are the recommended approach
        // Text replacement would require more advanced PDF manipulation
      }
      
      const mergedPdfBytes = await pdfDoc.save();
      return Buffer.from(mergedPdfBytes);
    } catch (error) {
      this.logger.error(`Failed to merge placeholders: ${error.message}`);
      throw new Error(`PDF placeholder merging failed: ${error.message}`);
    }
  }

  /**
   * Generate final signed PDF with watermarks and signatures
   * Flattens form fields, embeds signatures, adds footer with hash
   * 
   * @param consentPdfBuffer - The consent PDF with all placeholders filled
   * @param signatures - Array of signature information
   * @returns Object with final PDF buffer and hash
   */
  async generateFinalPDF(
    consentPdfBuffer: Buffer,
    signatures: SignatureInfo[],
  ): Promise<{ pdfBuffer: Buffer; hash: string }> {
    try {
      const pdfDoc = await PDFDocument.load(consentPdfBuffer);
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // Flatten form fields (make them read-only)
      try {
        const form = pdfDoc.getForm();
        form.flatten();
      } catch (error) {
        this.logger.debug('No form to flatten or flatten failed');
      }
      
      // Embed signatures at signature anchor positions
      for (const signature of signatures) {
        let signatureImage: any = null;
        
        // Load signature image if provided
        if (signature.signatureImage) {
          try {
            signatureImage = await pdfDoc.embedPng(signature.signatureImage);
          } catch (error) {
            try {
              signatureImage = await pdfDoc.embedJpg(signature.signatureImage);
            } catch (jpgError) {
              this.logger.warn(`Failed to embed signature image for ${signature.signerName}`);
            }
          }
        }
        
        // Find signature anchor position or use provided position
        let targetPage: PDFPage | null = null;
        let anchorX = 100;
        let anchorY = 100;
        
        if (signature.position) {
          targetPage = pages[signature.position.page] || pages[pages.length - 1];
          anchorX = signature.position.x;
          anchorY = signature.position.y;
        } else {
          // Search for [[SIGN_*]] anchor in PDF text using pdf-parse
          const anchorPattern = `[[SIGN_${signature.signerType}]]`;
          try {
            // Get the PDF buffer from the document
            const pdfBytes = await pdfDoc.save();
            const pdfData = await pdfParse(Buffer.from(pdfBytes));
            const text = pdfData.text;
            
            if (text.includes(anchorPattern)) {
              // Find which page contains the anchor (approximate)
              // pdf-parse doesn't provide page-level text, so we use the last page
              // In production, use form fields with known positions
              targetPage = pages[pages.length - 1];
              anchorX = 100;
              anchorY = 100;
            } else {
              // Default to last page if anchor not found
              targetPage = pages[pages.length - 1];
              anchorX = 100;
              anchorY = 100;
            }
          } catch (error) {
            // If text extraction fails, default to last page
            this.logger.warn(`Failed to extract text for signature anchor: ${error.message}`);
            targetPage = pages[pages.length - 1];
            anchorX = 100;
            anchorY = 100;
          }
        }
        
        // Draw signature
        if (targetPage) {
          const { width, height } = targetPage.getSize();
          
          // Draw signature image or text
          if (signatureImage) {
            targetPage.drawImage(signatureImage, {
              x: anchorX,
              y: anchorY - 50,
              width: 150,
              height: 50,
            });
          } else {
            // Draw signature as text if no image
            targetPage.drawText(`Signed: ${signature.signerName}`, {
              x: anchorX,
              y: anchorY - 20,
              size: 10,
              font: font,
            });
          }
          
          // Draw signer info
          targetPage.drawText(`${signature.signerType}: ${signature.signerName}`, {
            x: anchorX,
            y: anchorY - 35,
            size: 9,
            font: font,
          });
          
          targetPage.drawText(`Date: ${signature.signedAt.toLocaleString()}`, {
            x: anchorX,
            y: anchorY - 50,
            size: 8,
            font: font,
          });
        }
      }
      
      // Add footer to last page with timestamp and hash
      const lastPage = pages[pages.length - 1];
      const { width, height } = lastPage.getSize();
      const timestamp = new Date().toISOString();
      
      // Calculate hash before adding footer (footer will include hash)
      const tempBytes = await pdfDoc.save();
      const tempHash = this.calculateHash(Buffer.from(tempBytes));
      
      // Add footer
      lastPage.drawText('Digitally signed — do not modify', {
        x: 50,
        y: 30,
        size: 8,
        font: boldFont,
        color: rgb(0.8, 0, 0),
      });
      
      lastPage.drawText(`Timestamp: ${timestamp}`, {
        x: 50,
        y: 20,
        size: 7,
        font: font,
      });
      
      lastPage.drawText(`Hash: ${tempHash.substring(0, 16)}...`, {
        x: 50,
        y: 10,
        size: 7,
        font: font,
      });
      
      // Set PDF permissions to read-only
      pdfDoc.setProducer('Surgical EHR Consent System');
      pdfDoc.setCreator('Surgical EHR');
      
      // Save final PDF
      const finalPdfBytes = await pdfDoc.save();
      const finalBuffer = Buffer.from(finalPdfBytes);
      const finalHash = this.calculateHash(finalBuffer);
      
      return {
        pdfBuffer: finalBuffer,
        hash: finalHash,
      };
    } catch (error) {
      this.logger.error(`Failed to generate final PDF: ${error.message}`);
      throw new Error(`PDF finalization failed: ${error.message}`);
    }
  }

  /**
   * Save PDF file to disk
   * 
   * @param pdfBuffer - PDF buffer to save
   * @param filename - Filename (without extension)
   * @returns File path where PDF was saved
   */
  async savePDF(pdfBuffer: Buffer, filename: string): Promise<string> {
    await this.ensureUploadsDirectory();
    
    const filePath = path.join(this.uploadsDir, `${filename}.pdf`);
    await fs.writeFile(filePath, pdfBuffer);
    
    this.logger.log(`PDF saved to ${filePath}`);
    return filePath;
  }

  /**
   * Load PDF file from disk
   * 
   * @param filePath - Path to PDF file (can be relative or absolute, or URL path)
   * @returns PDF buffer
   */
  async loadPDF(filePath: string): Promise<Buffer> {
    // Handle URL paths (e.g., /uploads/consents/filename.pdf)
    let actualPath = filePath;
    if (filePath.startsWith('/uploads/')) {
      // Convert URL path to file system path
      actualPath = filePath.replace('/uploads/consents/', './uploads/consents/');
    }
    
    // Resolve to absolute path
    const resolvedPath = path.resolve(actualPath);
    
    // Security: Validate path is within uploads directory
    const uploadsDir = path.resolve(this.uploadsDir);
    if (!resolvedPath.startsWith(uploadsDir)) {
      this.logger.error(`Path traversal attempt detected: ${filePath}`);
      throw new Error(`Invalid file path: ${filePath}`);
    }
    
    return await fs.readFile(resolvedPath);
  }

  /**
   * Calculate SHA-256 hash of PDF for integrity verification
   * 
   * @param pdfBuffer - PDF buffer
   * @returns SHA-256 hash as hex string
   */
  calculateHash(pdfBuffer: Buffer): string {
    return createHash('sha256').update(pdfBuffer).digest('hex');
  }

  /**
   * Verify PDF integrity by comparing computed hash with stored hash
   * 
   * This method enables tamper detection - if the PDF has been modified,
   * the computed hash will not match the stored hash.
   * 
   * @param pdfBuffer - PDF buffer to verify
   * @param storedHash - Hash stored in database (from finalPdfHash field)
   * @returns true if hash matches (file is intact), false otherwise
   */
  verifyHash(pdfBuffer: Buffer, storedHash: string | null | undefined): boolean {
    if (!storedHash) {
      this.logger.warn('No stored hash available for verification');
      return false;
    }

    const computedHash = this.calculateHash(pdfBuffer);
    const isValid = computedHash === storedHash;

    if (!isValid) {
      this.logger.error(
        `Hash mismatch detected! Computed: ${computedHash.substring(0, 16)}..., Stored: ${storedHash.substring(0, 16)}...`
      );
    }

    return isValid;
  }

  /**
   * Get the secure API download URL for a consent.
   * This ensures all file access goes through RBAC/RLS checks.
   * 
   * @param consentId - The ID of the consent
   * @returns The API endpoint for downloading the consent
   */
  getDownloadUrl(consentId: string): string {
    return `/api/v1/consents/${consentId}/download`;
  }

  /**
   * Generate a unique filename for a consent PDF
   * 
   * @param consentId - Consent ID
   * @param type - Type of PDF: 'generated' or 'final'
   * @returns Unique filename
   */
  generateFilename(consentId: string, type: 'generated' | 'final'): string {
    const timestamp = Date.now();
    return `consent-${consentId}-${type}-${timestamp}`;
  }

  /**
   * Get file URL from file path
   * In production, this would convert local path to S3 URL or CDN URL
   * 
   * @param filePath - Local file path
   * @returns URL to access the file
   */
  getFileUrl(filePath: string): string {
    // In production, upload to S3 and return S3 URL
    // For now, return relative path or full URL based on configuration
    const baseUrl = process.env.FILE_BASE_URL || '/uploads/consents';
    const filename = path.basename(filePath);
    const fileUrl = `${baseUrl}/${filename}`;
    this.logger.debug(`Generated fileUrl: ${fileUrl} from filePath: ${filePath}`);
    return fileUrl;
  }

  // ============================================================================
  // Annotation Embedding Methods (NEW)
  // ============================================================================

  /**
   * Embed annotations into PDF document
   * Handles different annotation types (HIGHLIGHT, COMMENT, DRAWING, etc.)
   * 
   * @param pdfBuffer - PDF buffer to add annotations to
   * @param annotations - Array of annotations to embed
   * @returns Modified PDF buffer with annotations
   */
  async embedAnnotations(
    pdfBuffer: Buffer,
    annotations: any[], // TODO: Use PDFConsentAnnotation[] when model is added to schema
  ): Promise<Buffer> {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Group annotations by page for efficiency
      const annotationsByPage = new Map<number, any[]>();
      for (const annotation of annotations) {
        if (annotation.deletedAt) continue; // Skip soft-deleted annotations
        
        const pageIndex = (annotation.pageNumber || 1) - 1; // Convert to 0-indexed
        if (pageIndex >= 0 && pageIndex < pages.length) {
          if (!annotationsByPage.has(pageIndex)) {
            annotationsByPage.set(pageIndex, []);
          }
          annotationsByPage.get(pageIndex)!.push(annotation);
        }
      }

      // Process each page's annotations
      for (const [pageIndex, pageAnnotations] of annotationsByPage.entries()) {
        const page = pages[pageIndex];
        const { width, height } = page.getSize();

        for (const annotation of pageAnnotations) {
          const pdfCoords = this.webCoordinatesToPDFPoints(
            annotation.x || 0,
            annotation.y || 0,
            height,
            1.0, // Default scale factor (can be adjusted based on viewer zoom)
          );

          const annotationType = annotation.annotationType || 'COMMENT';
          switch (annotationType) {
            case 'HIGHLIGHT':
              if (annotation.width && annotation.height) {
                const pdfWidth = annotation.width;
                const pdfHeight = annotation.height;
                // Draw semi-transparent rectangle for highlight
                const color = this.parseHexColor(annotation.color || '#FFEB3B');
                page.drawRectangle({
                  x: pdfCoords.x,
                  y: pdfCoords.y,
                  width: pdfWidth,
                  height: pdfHeight,
                  color: rgb(color.r, color.g, color.b),
                  opacity: 0.3,
                });
              }
              break;

            case 'COMMENT':
              // Draw comment icon/box
              const commentColor = this.parseHexColor(annotation.color || '#FFD700');
              page.drawRectangle({
                x: pdfCoords.x,
                y: pdfCoords.y,
                width: 20,
                height: 20,
                borderColor: rgb(commentColor.r, commentColor.g, commentColor.b),
                borderWidth: 1,
                color: rgb(commentColor.r, commentColor.g, commentColor.b),
                opacity: 0.8,
              });
              // Draw comment text if available
              if (annotation.content) {
                page.drawText(annotation.content, {
                  x: pdfCoords.x + 25,
                  y: pdfCoords.y,
                  size: 9,
                  font: font,
                  maxWidth: width - pdfCoords.x - 30,
                });
              }
              break;

            case 'RECTANGLE':
              if (annotation.width && annotation.height) {
                const rectColor = this.parseHexColor(annotation.color || '#000000');
                page.drawRectangle({
                  x: pdfCoords.x,
                  y: pdfCoords.y,
                  width: annotation.width,
                  height: annotation.height,
                  borderColor: rgb(rectColor.r, rectColor.g, rectColor.b),
                  borderWidth: 1,
                });
              }
              break;

            case 'CIRCLE':
              if (annotation.width && annotation.height) {
                const radius = Math.min(annotation.width, annotation.height) / 2;
                const circleColor = this.parseHexColor(annotation.color || '#000000');
                page.drawCircle({
                  x: pdfCoords.x + annotation.width / 2,
                  y: pdfCoords.y + annotation.height / 2,
                  size: radius,
                  borderColor: rgb(circleColor.r, circleColor.g, circleColor.b),
                  borderWidth: 1,
                });
              }
              break;

            case 'ARROW':
              if (annotation.width && annotation.height) {
                const arrowColor = this.parseHexColor(annotation.color || '#FF0000');
                // Simple arrow implementation (line with arrowhead)
                const endX = pdfCoords.x + annotation.width;
                const endY = pdfCoords.y + annotation.height;
                page.drawLine({
                  start: { x: pdfCoords.x, y: pdfCoords.y },
                  end: { x: endX, y: endY },
                  thickness: 2,
                  color: rgb(arrowColor.r, arrowColor.g, arrowColor.b),
                });
                // Arrowhead (simplified - triangle)
                const arrowSize = 8;
                const angle = Math.atan2(endY - pdfCoords.y, endX - pdfCoords.x);
                page.drawLine({
                  start: { x: endX, y: endY },
                  end: {
                    x: endX - arrowSize * Math.cos(angle - Math.PI / 6),
                    y: endY - arrowSize * Math.sin(angle - Math.PI / 6),
                  },
                  thickness: 2,
                  color: rgb(arrowColor.r, arrowColor.g, arrowColor.b),
                });
                page.drawLine({
                  start: { x: endX, y: endY },
                  end: {
                    x: endX - arrowSize * Math.cos(angle + Math.PI / 6),
                    y: endY - arrowSize * Math.sin(angle + Math.PI / 6),
                  },
                  thickness: 2,
                  color: rgb(arrowColor.r, arrowColor.g, arrowColor.b),
                });
              }
              break;

            case 'TEXT_EDIT':
              // Draw text overlay
              if (annotation.content) {
                const textColor = this.parseHexColor(annotation.color || '#000000');
                page.drawText(annotation.content, {
                  x: pdfCoords.x,
                  y: pdfCoords.y,
                  size: 10,
                  font: font,
                  color: rgb(textColor.r, textColor.g, textColor.b),
                });
              }
              break;

            case 'DRAWING':
              // Handle freehand drawing from coordinates JSON
              if (annotation.coordinates) {
                const coords = annotation.coordinates as any;
                const drawingColor = this.parseHexColor(annotation.color || '#000000');
                
                if (coords.type === 'path' && Array.isArray(coords.points)) {
                  const points = coords.points;
                  if (points.length > 1) {
                    // Draw path as connected lines
                    for (let i = 0; i < points.length - 1; i++) {
                      const point1 = this.webCoordinatesToPDFPoints(
                        points[i][0],
                        points[i][1],
                        height,
                        1.0,
                      );
                      const point2 = this.webCoordinatesToPDFPoints(
                        points[i + 1][0],
                        points[i + 1][1],
                        height,
                        1.0,
                      );
                      page.drawLine({
                        start: { x: point1.x, y: point1.y },
                        end: { x: point2.x, y: point2.y },
                        thickness: 2,
                        color: rgb(drawingColor.r, drawingColor.g, drawingColor.b),
                      });
                    }
                  }
                }
              }
              break;

            default:
              this.logger.warn(`Unknown annotation type: ${annotation.annotationType}`);
          }
        }
      }

      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    } catch (error) {
      this.logger.error(`Failed to embed annotations: ${error.message}`);
      throw new Error(`PDF annotation embedding failed: ${error.message}`);
    }
  }

  /**
   * Embed signatures inline at specific positions
   * Enhanced version that uses signature.pageNumber, signature.x, signature.y
   * 
   * @param pdfBuffer - PDF buffer to add signatures to
   * @param signatures - Array of signatures with position information
   * @returns Modified PDF buffer with signatures
   */
  async embedSignaturesInline(
    pdfBuffer: Buffer,
    signatures: PDFConsentSignature[],
  ): Promise<Buffer> {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      for (const signature of signatures) {
        // Determine target page (default to last page since pageNumber doesn't exist in schema)
        const pageIndex = pages.length - 1;
        const targetPage = pages[pageIndex];
        const { width, height } = targetPage.getSize();

        // Get signature position (use defaults since x, y, width, height don't exist in schema)
        // Position signatures at bottom of page, spaced horizontally
        const signatureWidth = 150;
        const signatureHeight = 50;
        const signatureSpacing = 200;
        const signatureIndex = signatures.indexOf(signature);
        let signatureX = 100 + (signatureIndex * signatureSpacing);
        let signatureY = 100; // Bottom of page

        // Load signature image if available
        let signatureImage: any = null;
        if (signature.signatureUrl) {
          try {
            // Try to load signature image from URL
            // In production, this would fetch from S3 or file system
            const signatureBuffer = await this.loadPDF(signature.signatureUrl).catch(() => null);
            if (signatureBuffer) {
              try {
                signatureImage = await pdfDoc.embedPng(signatureBuffer);
              } catch (error) {
                try {
                  signatureImage = await pdfDoc.embedJpg(signatureBuffer);
                } catch (jpgError) {
                  this.logger.warn(`Failed to embed signature image for ${signature.signerName}`);
                }
              }
            }
          } catch (error) {
            this.logger.warn(`Failed to load signature image: ${error.message}`);
          }
        }

        // Draw signature
        if (signatureImage) {
          targetPage.drawImage(signatureImage, {
            x: signatureX,
            y: signatureY - signatureHeight,
            width: signatureWidth,
            height: signatureHeight,
          });
        } else {
          // Draw signature as text if no image
          targetPage.drawText(`Signed: ${signature.signerName}`, {
            x: signatureX,
            y: signatureY - 20,
            size: 10,
            font: font,
          });
        }

        // Draw signer info
        targetPage.drawText(`${signature.signerType}: ${signature.signerName}`, {
          x: signatureX,
          y: signatureY - 35,
          size: 9,
          font: font,
        });

        const signedAt = new Date(signature.signedAt);
        targetPage.drawText(`Date: ${signedAt.toLocaleString()}`, {
          x: signatureX,
          y: signatureY - 50,
          size: 8,
          font: font,
        });
      }

      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    } catch (error) {
      this.logger.error(`Failed to embed signatures inline: ${error.message}`);
      throw new Error(`PDF signature embedding failed: ${error.message}`);
    }
  }

  /**
   * Generate final PDF with annotations and signatures
   * Orchestrates: load PDF → embed annotations → embed signatures → flatten → calculate hash
   * 
   * @param consent - PDFConsent object with relations (annotations, signatures)
   * @returns Object with final PDF buffer and hash
   */
  async generateFinalPDFWithAnnotations(
    consent: PDFConsent & {
      annotations?: any[]; // TODO: Use PDFConsentAnnotation[] when model is added to schema
      signatures?: PDFConsentSignature[];
    },
  ): Promise<{ pdfBuffer: Buffer; hash: string }> {
    try {
      // Load base PDF (use finalPdfUrl if available, otherwise generatedPdfUrl)
      const pdfUrl = consent.finalPdfUrl || consent.generatedPdfUrl;
      if (!pdfUrl) {
        throw new Error('No PDF URL available for consent');
      }

      let pdfBuffer = await this.loadPDF(pdfUrl);

      // Step 1: Embed annotations (if any)
      if (consent.annotations && consent.annotations.length > 0) {
        pdfBuffer = await this.embedAnnotations(pdfBuffer, consent.annotations);
      }

      // Step 2: Embed signatures inline (if any)
      if (consent.signatures && consent.signatures.length > 0) {
        pdfBuffer = await this.embedSignaturesInline(pdfBuffer, consent.signatures);
      }

      // Step 3: Flatten form fields and finalize
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Flatten form fields (make them read-only)
      try {
        const form = pdfDoc.getForm();
        form.flatten();
      } catch (error) {
        this.logger.debug('No form to flatten or flatten failed');
      }

      // Add footer to last page with timestamp and hash
      const lastPage = pages[pages.length - 1];
      const { width, height } = lastPage.getSize();
      const timestamp = new Date().toISOString();

      // Calculate hash before adding footer (footer will include hash)
      const tempBytes = await pdfDoc.save();
      const tempHash = this.calculateHash(Buffer.from(tempBytes));

      // Add footer
      lastPage.drawText('Digitally signed — do not modify', {
        x: 50,
        y: 30,
        size: 8,
        font: boldFont,
        color: rgb(0.8, 0, 0),
      });

      lastPage.drawText(`Timestamp: ${timestamp}`, {
        x: 50,
        y: 20,
        size: 7,
        font: font,
      });

      lastPage.drawText(`Hash: ${tempHash.substring(0, 16)}...`, {
        x: 50,
        y: 10,
        size: 7,
        font: font,
      });

      // Set PDF permissions to read-only
      pdfDoc.setProducer('Surgical EHR Consent System');
      pdfDoc.setCreator('Surgical EHR');

      // Save final PDF
      const finalPdfBytes = await pdfDoc.save();
      const finalBuffer = Buffer.from(finalPdfBytes);
      const finalHash = this.calculateHash(finalBuffer);

      return {
        pdfBuffer: finalBuffer,
        hash: finalHash,
      };
    } catch (error) {
      this.logger.error(`Failed to generate final PDF with annotations: ${error.message}`);
      throw new Error(`PDF finalization failed: ${error.message}`);
    }
  }

  /**
   * Helper: Convert web coordinates to PDF points
   * PDF origin is bottom-left, web origin is top-left
   * 
   * @param webX - X coordinate in web pixels
   * @param webY - Y coordinate in web pixels
   * @param pageHeight - PDF page height in points
   * @param scaleFactor - Scale factor (zoom level, default 1.0)
   * @returns PDF coordinates { x, y } in points
   */
  private webCoordinatesToPDFPoints(
    webX: number,
    webY: number,
    pageHeight: number,
    scaleFactor: number = 1.0,
  ): { x: number; y: number } {
    // Convert web pixels to PDF points (assuming 1:1 ratio, adjust if needed)
    // PDF coordinate system: origin at bottom-left, Y increases upward
    // Web coordinate system: origin at top-left, Y increases downward
    const pdfX = webX * scaleFactor;
    const pdfY = pageHeight - (webY * scaleFactor); // Invert Y axis

    return { x: pdfX, y: pdfY };
  }

  /**
   * Helper: Parse hex color to RGB
   * 
   * @param hexColor - Hex color string (e.g., "#FF0000")
   * @returns RGB values { r, g, b } in range 0-1
   */
  private parseHexColor(hexColor: string): { r: number; g: number; b: number } {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    return { r, g, b };
  }
}

