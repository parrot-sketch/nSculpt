import { Injectable, BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Consent Template Upload Service
 * Handles PDF upload, storage, and text extraction for template creation
 */
@Injectable()
export class ConsentTemplateUploadService {
  private readonly uploadDir: string;

  constructor() {
    // Use environment variable or default to ./uploads/consent-templates
    this.uploadDir = process.env.CONSENT_TEMPLATE_UPLOAD_DIR || './uploads/consent-templates';
    this.ensureUploadDirectory();
  }

  /**
   * Ensure upload directory exists
   */
  private async ensureUploadDirectory() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create upload directory:', error);
    }
  }

  /**
   * Upload and process PDF file
   */
  async uploadPDF(file: any): Promise<{
    filePath: string;
    fileHash: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    pageCount?: number;
    extractedText?: string;
  }> {
    // Validate file type
    if (!file.mimetype.includes('pdf')) {
      throw new BadRequestException('Only PDF files are allowed');
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    // Calculate SHA-256 hash
    const fileHash = createHash('sha256').update(file.buffer).digest('hex');

    // Generate unique filename
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}_${randomSuffix}_${originalName}`;
    const filePath = path.join(this.uploadDir, fileName);

    // Save file
    await fs.writeFile(filePath, file.buffer);

    // Extract text (optional - for reference only)
    let extractedText: string | undefined;
    let pageCount: number | undefined;

    try {
      // TODO: Add pdf-parse library for text extraction
      // For now, return basic info
      // extractedText = await this.extractTextFromPDF(file.buffer);
      // pageCount = await this.getPageCount(file.buffer);
    } catch (error) {
      console.warn('Text extraction failed (optional):', error);
      // Text extraction is optional, continue without it
    }

    return {
      filePath,
      fileHash,
      fileName,
      fileSize: file.size,
      mimeType: file.mimetype,
      pageCount,
      extractedText,
    };
  }

  /**
   * Get file info without uploading
   */
  async getFileInfo(filePath: string): Promise<{
    exists: boolean;
    fileHash?: string;
    fileSize?: number;
  }> {
    try {
      const stats = await fs.stat(filePath);
      const buffer = await fs.readFile(filePath);
      const fileHash = createHash('sha256').update(buffer).digest('hex');

      return {
        exists: true,
        fileHash,
        fileSize: stats.size,
      };
    } catch (error) {
      return {
        exists: false,
      };
    }
  }

  /**
   * Delete uploaded file
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Failed to delete file:', error);
      // Don't throw - file deletion is not critical
    }
  }

  /**
   * Extract text from PDF (optional - requires pdf-parse library)
   * TODO: Install pdf-parse: npm install pdf-parse
   */
  private async extractTextFromPDF(buffer: Buffer): Promise<string> {
    // Uncomment when pdf-parse is installed:
    // const pdfParse = require('pdf-parse');
    // const data = await pdfParse(buffer);
    // return data.text;

    throw new Error('PDF text extraction not implemented. Install pdf-parse library.');
  }

  /**
   * Get page count from PDF (optional - requires pdf-parse library)
   * TODO: Install pdf-parse: npm install pdf-parse
   */
  private async getPageCount(buffer: Buffer): Promise<number> {
    // Uncomment when pdf-parse is installed:
    // const pdfParse = require('pdf-parse');
    // const data = await pdfParse(buffer);
    // return data.numpages;

    throw new Error('PDF page count not implemented. Install pdf-parse library.');
  }

  /**
   * Get relative path from absolute path
   */
  getRelativePath(absolutePath: string): string {
    // If path is already relative, return as-is
    if (!path.isAbsolute(absolutePath)) {
      return absolutePath;
    }

    // Return relative to upload directory
    return path.relative(this.uploadDir, absolutePath);
  }

  /**
   * Get absolute path from relative path
   */
  getAbsolutePath(relativePath: string): string {
    if (path.isAbsolute(relativePath)) {
      return relativePath;
    }

    return path.join(this.uploadDir, relativePath);
  }
}

