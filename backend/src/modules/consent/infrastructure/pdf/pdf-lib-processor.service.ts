/**
 * PDF-Lib Implementation of PDF Processor
 * 
 * Concrete implementation using pdf-lib library.
 * This is the infrastructure layer - can be swapped with other implementations.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import * as pdfParseModule from 'pdf-parse';
import { createHash } from 'crypto';
import { PDFProcessor } from '../../domain/interfaces/pdf-processor.interface';
import { SignaturePosition } from '../../domain/value-objects/signature-position.vo';
import { ConsentAnnotation } from '../../domain/entities/consent.entity';

const pdfParse = (pdfParseModule as any).default || pdfParseModule;

@Injectable()
export class PDFLibProcessorService implements PDFProcessor {
  private readonly logger = new Logger(PDFLibProcessorService.name);

  async parsePlaceholders(pdfBuffer: Buffer): Promise<string[]> {
    try {
      const placeholders = new Set<string>();
      
      // Extract text from PDF
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
      
      // Check form fields
      try {
        const pdfDoc = await PDFDocument.load(pdfBuffer);
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
        this.logger.debug('No form fields found in PDF');
      }
      
      return Array.from(placeholders);
    } catch (error) {
      this.logger.error(`Failed to parse PDF placeholders: ${error.message}`);
      throw new Error(`PDF placeholder parsing failed: ${error.message}`);
    }
  }

  async mergePlaceholders(
    templateBuffer: Buffer,
    placeholderValues: Record<string, string>,
  ): Promise<Buffer> {
    try {
      const pdfDoc = await PDFDocument.load(templateBuffer);
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      // Fill form fields
      try {
        const form = pdfDoc.getForm();
        const fields = form.getFields();
        
        for (const field of fields) {
          const fieldName = field.getName();
          const fieldType = field.constructor.name;
          
          for (const [key, value] of Object.entries(placeholderValues)) {
            if (fieldName.includes(`{{${key}}}`) || fieldName === key) {
              try {
                if (fieldType.includes('TextField')) {
                  (field as any).setText(value);
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
      
      const mergedPdfBytes = await pdfDoc.save();
      return Buffer.from(mergedPdfBytes);
    } catch (error) {
      this.logger.error(`Failed to merge placeholders: ${error.message}`);
      throw new Error(`PDF placeholder merging failed: ${error.message}`);
    }
  }

  async embedSignature(
    pdfBuffer: Buffer,
    signatureImage: Buffer,
    position: SignaturePosition,
    signerName: string,
    signerType: string,
    signedAt: Date,
  ): Promise<Buffer> {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      const pageIndex = position.pageNumber - 1;
      if (pageIndex < 0 || pageIndex >= pages.length) {
        throw new Error(`Invalid page number: ${position.pageNumber}`);
      }
      
      const targetPage = pages[pageIndex];
      
      // Embed signature image
      let signatureImageObj: any = null;
      try {
        signatureImageObj = await pdfDoc.embedPng(signatureImage);
      } catch (error) {
        try {
          signatureImageObj = await pdfDoc.embedJpg(signatureImage);
        } catch (jpgError) {
          this.logger.warn(`Failed to embed signature image for ${signerName}`);
        }
      }
      
      // Draw signature
      if (signatureImageObj) {
        targetPage.drawImage(signatureImageObj, {
          x: position.x,
          y: position.y - (position.height || 50),
          width: position.width || 150,
          height: position.height || 50,
        });
      } else {
        // Fallback to text
        targetPage.drawText(`Signed: ${signerName}`, {
          x: position.x,
          y: position.y - 20,
          size: 10,
          font: font,
        });
      }
      
      // Draw signer info
      targetPage.drawText(`${signerType}: ${signerName}`, {
        x: position.x,
        y: position.y - 35,
        size: 9,
        font: font,
      });
      
      targetPage.drawText(`Date: ${signedAt.toLocaleString()}`, {
        x: position.x,
        y: position.y - 50,
        size: 8,
        font: font,
      });
      
      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    } catch (error) {
      this.logger.error(`Failed to embed signature: ${error.message}`);
      throw new Error(`PDF signature embedding failed: ${error.message}`);
    }
  }

  async embedSignatures(
    pdfBuffer: Buffer,
    signatures: Array<{
      image: Buffer;
      position: SignaturePosition;
      signerName: string;
      signerType: string;
      signedAt: Date;
    }>,
  ): Promise<Buffer> {
    let currentBuffer = pdfBuffer;
    for (const sig of signatures) {
      currentBuffer = await this.embedSignature(
        currentBuffer,
        sig.image,
        sig.position,
        sig.signerName,
        sig.signerType,
        sig.signedAt,
      );
    }
    return currentBuffer;
  }

  async embedAnnotations(
    pdfBuffer: Buffer,
    annotations: ConsentAnnotation[],
  ): Promise<Buffer> {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      // Group annotations by page
      const annotationsByPage = new Map<number, ConsentAnnotation[]>();
      for (const annotation of annotations) {
        if (annotation.deletedAt) continue;
        
        const pageIndex = annotation.pageNumber - 1;
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
            1.0,
          );
          
          const annotationType = annotation.annotationType || 'COMMENT';
          const color = this.parseHexColor(annotation.color || '#000000');
          
          switch (annotationType) {
            case 'HIGHLIGHT':
              if (annotation.width && annotation.height) {
                page.drawRectangle({
                  x: pdfCoords.x,
                  y: pdfCoords.y,
                  width: annotation.width,
                  height: annotation.height,
                  color: rgb(color.r, color.g, color.b),
                  opacity: 0.3,
                });
              }
              break;
              
            case 'COMMENT':
              page.drawRectangle({
                x: pdfCoords.x,
                y: pdfCoords.y,
                width: 20,
                height: 20,
                borderColor: rgb(color.r, color.g, color.b),
                borderWidth: 1,
                color: rgb(color.r, color.g, color.b),
                opacity: 0.8,
              });
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
              
            // Add more annotation types as needed
            default:
              this.logger.warn(`Unknown annotation type: ${annotationType}`);
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

  async flattenFormFields(pdfBuffer: Buffer): Promise<Buffer> {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      try {
        const form = pdfDoc.getForm();
        form.flatten();
      } catch (error) {
        this.logger.debug('No form to flatten or flatten failed');
      }
      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    } catch (error) {
      this.logger.error(`Failed to flatten form fields: ${error.message}`);
      throw new Error(`PDF form flattening failed: ${error.message}`);
    }
  }

  async addFooter(
    pdfBuffer: Buffer,
    timestamp: string,
    hash: string,
  ): Promise<Buffer> {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const lastPage = pages[pages.length - 1];
      const { width, height } = lastPage.getSize();
      
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
      
      lastPage.drawText(`Hash: ${hash.substring(0, 16)}...`, {
        x: 50,
        y: 10,
        size: 7,
        font: font,
      });
      
      pdfDoc.setProducer('Surgical EHR Consent System');
      pdfDoc.setCreator('Surgical EHR');
      
      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    } catch (error) {
      this.logger.error(`Failed to add footer: ${error.message}`);
      throw new Error(`PDF footer addition failed: ${error.message}`);
    }
  }

  calculateHash(pdfBuffer: Buffer): string {
    return createHash('sha256').update(pdfBuffer).digest('hex');
  }

  verifyHash(pdfBuffer: Buffer, storedHash: string): boolean {
    const computedHash = this.calculateHash(pdfBuffer);
    const isValid = computedHash === storedHash;
    
    if (!isValid) {
      this.logger.error(
        `Hash mismatch detected! Computed: ${computedHash.substring(0, 16)}..., Stored: ${storedHash.substring(0, 16)}...`
      );
    }
    
    return isValid;
  }

  private webCoordinatesToPDFPoints(
    webX: number,
    webY: number,
    pageHeight: number,
    scaleFactor: number = 1.0,
  ): { x: number; y: number } {
    const pdfX = webX * scaleFactor;
    const pdfY = pageHeight - (webY * scaleFactor);
    return { x: pdfX, y: pdfY };
  }

  private parseHexColor(hexColor: string): { r: number; g: number; b: number } {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    return { r, g, b };
  }
}





