import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  Req,
  Res,
  Logger,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { PDFConsentService } from '../services/pdf-consent.service';
import { GeneratePDFConsentDto } from '../dto/generate-pdf-consent.dto';
import { SignPDFConsentDto } from '../dto/sign-pdf-consent.dto';
import { SendForSignatureDto } from '../dto/send-for-signature.dto';
import { RevokePDFConsentDto } from '../dto/revoke-pdf-consent.dto';
import { ArchivePDFConsentDto } from '../dto/archive-pdf-consent.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RlsGuard } from '../../../common/guards/rls.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../auth/services/identityContext.service';

@Controller('consents')
@UseGuards(RolesGuard, RlsGuard, PermissionsGuard)
@UseInterceptors(DataAccessLogInterceptor)
export class PDFConsentController {
  private readonly logger = new Logger(PDFConsentController.name);

  constructor(private readonly consentService: PDFConsentService) {}

  /**
   * POST /api/v1/consents/generate
   * Generate a patient-specific consent from template
   * Triggered from Consultation page
   */
  @Post('generate')
  @Roles('ADMIN', 'DOCTOR', 'NURSE')
  @Permissions('consent:*:write')
  async generate(
    @Body() generateDto: GeneratePDFConsentDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return await this.consentService.generateConsent(generateDto, user.id);
  }

  /**
   * GET /api/v1/consents/patient/:patientId
   * Get all consents for a patient
   * Must come before :id route to avoid route conflicts
   */
  @Get('patient/:patientId')
  @Roles('ADMIN', 'DOCTOR', 'NURSE')
  @Permissions('consent:*:read')
  async findByPatient(
    @Param('patientId') patientId: string,
    @Query('includeArchived') includeArchived?: string,
    @CurrentUser() user?: UserIdentity,
  ) {
    return await this.consentService.findByPatient(
      patientId,
      user?.id || '',
      includeArchived === 'true',
    );
  }

  /**
   * GET /api/v1/consents/consultation/:consultationId
   * Get all consents for a consultation
   * Must come before :id route to avoid route conflicts
   */
  @Get('consultation/:consultationId')
  @Roles('ADMIN', 'DOCTOR', 'NURSE')
  @Permissions('consent:*:read')
  async findByConsultation(
    @Param('consultationId') consultationId: string,
    @CurrentUser() user?: UserIdentity,
  ) {
    return await this.consentService.findByConsultation(consultationId, user?.id || '');
  }

  /**
   * GET /api/v1/consents/:id/annotations
   * Get all annotations for a PDF consent
   * Must come before :id route to avoid route conflicts
   * Patients can view annotations on their own consents
   */
  @Get(':id/annotations')
  @Roles('ADMIN', 'DOCTOR', 'NURSE', 'FRONT_DESK', 'PATIENT')
  @Permissions('consent:*:read')
  async getAnnotations(@Param('id') id: string, @CurrentUser() user: UserIdentity) {
    // Verify consent access
    await this.consentService.findOne(id, user.id);
    return await this.consentService.getAnnotations(id);
  }

  /**
   * GET /api/v1/consents/:id/annotations/:annotationId
   * Get a specific annotation by ID
   * Must come before :id route to avoid route conflicts
   * Patients can view annotations on their own consents
   */
  @Get(':id/annotations/:annotationId')
  @Roles('ADMIN', 'DOCTOR', 'NURSE', 'FRONT_DESK', 'PATIENT')
  @Permissions('consent:*:read')
  async getAnnotationById(
    @Param('id') id: string,
    @Param('annotationId') annotationId: string,
    @CurrentUser() user: UserIdentity,
  ) {
    // Verify consent access
    await this.consentService.findOne(id, user.id);
    return await this.consentService.getAnnotationById(id, annotationId);
  }

  /**
   * GET /api/v1/consents/:id/download
   * Download PDF consent document securely
   * Must come before :id route to avoid route conflicts
   */
  @Get(':id/download')
  @Roles('ADMIN', 'DOCTOR', 'NURSE', 'PATIENT')
  @Permissions('consent:*:read')
  async download(
    @Param('id') id: string,
    @CurrentUser() user: UserIdentity,
    @Res() res: Response,
    @Req() request: any,
  ) {
    // Find consent and verify access (RLS is enforced by RlsGuard)
    const consent = await this.consentService.findOne(id, user.id);

    if (!consent) {
      throw new NotFoundException(`Consent with ID ${id} not found`);
    }

    // Determine which PDF to serve (prefer final, fallback to generated)
    const pdfUrl = consent.finalPdfUrl || consent.generatedPdfUrl;

    if (!pdfUrl) {
      throw new NotFoundException(`PDF document not available for consent ${id}`);
    }

    // Extract file path from URL
    // URL format: /uploads/consents/filename.pdf
    // In production with S3, this would be an S3 URL and we'd stream from S3
    const filePath = pdfUrl.startsWith('/uploads/')
      ? pdfUrl.replace('/uploads/consents/', './uploads/consents/')
      : pdfUrl;

    // Stream file securely
    // Note: In production, this would use S3/MinIO streaming adapter
    try {
      // Security: Validate path to prevent directory traversal
      const resolvedPath = path.resolve(filePath);
      const uploadsDir = path.resolve(process.env.UPLOADS_DIR || './uploads/consents');
      
      if (!resolvedPath.startsWith(uploadsDir)) {
        this.logger.error(`Path traversal attempt detected: ${filePath}`);
        throw new ForbiddenException('Invalid file path');
      }

      // Check if file exists
      if (!fs.existsSync(resolvedPath)) {
        throw new NotFoundException(`PDF file not found for consent ${id}`);
      }

      // Set headers for PDF download
      const filename = `consent-${consent.id}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      
      // Optional: Add hash for client-side verification
      if (consent.finalPdfHash) {
        res.setHeader('X-PDF-Hash', consent.finalPdfHash);
      }

      // Stream file
      const fileStream = fs.createReadStream(resolvedPath);
      
      // Handle stream errors
      fileStream.on('error', (error) => {
        this.logger.error(`File stream error for consent ${id}: ${error.message}`);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Failed to stream PDF file' });
        }
      });

      // Pipe to response
      fileStream.pipe(res);

      // Log download access
      this.logger.log(
        `Consent ${id} PDF downloaded by user ${user.id} from IP ${request.ip || 'unknown'}`
      );

      // Note: Response is handled by streaming, no return needed
      // NestJS will handle the response when stream completes
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Failed to download consent PDF: ${error.message}`, error.stack);
      throw new NotFoundException(`Failed to download PDF for consent ${id}`);
    }
  }

  /**
   * GET /api/v1/consents/:id
   * Get consent by ID
   * Logs every view for audit compliance
   * Must come after all specific routes to avoid route conflicts
   */
  @Get(':id')
  @Roles('ADMIN', 'DOCTOR', 'NURSE', 'FRONT_DESK')
  @Permissions('consent:*:read')
  async findOne(@Param('id') id: string, @CurrentUser() user: UserIdentity, @Req() request: any) {
    this.logger.log(`Consent ${id} viewed by user ${user.id} from IP ${request.ip}`);
    return await this.consentService.findOne(id, user.id);
  }

  /**
   * POST /api/v1/consents/:id/send-for-signature
   * Move consent to signing stage
   * When admin/doctor confirms, status changes to READY_FOR_SIGNATURE
   */
  @Post(':id/send-for-signature')
  @Roles('ADMIN', 'DOCTOR')
  @Permissions('consent:*:write')
  async sendForSignature(
    @Param('id') id: string,
    @Body() sendDto: SendForSignatureDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return await this.consentService.sendForSignature({ ...sendDto, consentId: id }, user.id);
  }

  /**
   * POST /api/v1/consents/:id/sign
   * Sign consent
   * Supports multiple signers (patient, witness, doctor, etc.)
   */
  @Post(':id/sign')
  @Roles('ADMIN', 'DOCTOR', 'NURSE', 'PATIENT')
  @Permissions('consent:*:write')
  async sign(
    @Param('id') id: string,
    @Body() signDto: SignPDFConsentDto,
    @CurrentUser() user: UserIdentity,
    @Req() request: any,
  ) {
    return await this.consentService.signConsent(
      { ...signDto, consentId: id },
      user.id,
      {
        ip: request.ip || request.connection?.remoteAddress,
        headers: request.headers,
      },
      signDto.overrideFlag,
      signDto.overrideReason,
    );
  }

  /**
   * POST /api/v1/consents/:id/revoke
   * Revoke consent
   */
  @Post(':id/revoke')
  @Roles('ADMIN', 'DOCTOR')
  @Permissions('consent:*:write')
  async revoke(
    @Param('id') id: string,
    @Body() revokeDto: RevokePDFConsentDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return await this.consentService.revokeConsent({ ...revokeDto, consentId: id }, user.id);
  }

  /**
   * POST /api/v1/consents/:id/archive
   * Archive consent (soft delete)
   */
  @Post(':id/archive')
  @Roles('ADMIN')
  @Permissions('consent:*:write')
  async archive(
    @Param('id') id: string,
    @Body() archiveDto: ArchivePDFConsentDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return await this.consentService.archiveConsent({ ...archiveDto, consentId: id }, user.id);
  }



  /**
   * POST /api/v1/consents/:id/annotations
   * Create a new annotation
   * Patients can create signature annotations on their own consents
   */
  @Post(':id/annotations')
  @Roles('ADMIN', 'DOCTOR', 'NURSE', 'FRONT_DESK', 'PATIENT')
  @Permissions('consent:*:write')
  async createAnnotation(
    @Param('id') id: string,
    @Body() createDto: any, // TODO: Create CreateAnnotationDto
    @CurrentUser() user: UserIdentity,
  ) {
    // Verify consent access
    await this.consentService.findOne(id, user.id);
    return await this.consentService.createAnnotation(id, createDto, user.id);
  }

  /**
   * PUT /api/v1/consents/:id/annotations/:annotationId
   * Update an annotation
   * Patients can update their own signature annotations
   */
  @Put(':id/annotations/:annotationId')
  @Roles('ADMIN', 'DOCTOR', 'NURSE', 'FRONT_DESK', 'PATIENT')
  @Permissions('consent:*:write')
  async updateAnnotation(
    @Param('id') id: string,
    @Param('annotationId') annotationId: string,
    @Body() updateDto: any, // TODO: Create UpdateAnnotationDto
    @CurrentUser() user: UserIdentity,
  ) {
    // Verify consent access
    await this.consentService.findOne(id, user.id);
    return await this.consentService.updateAnnotation(id, annotationId, updateDto, user.id);
  }

  /**
   * DELETE /api/v1/consents/:id/annotations/:annotationId
   * Delete an annotation (soft delete)
   * Patients can delete their own signature annotations
   */
  @Delete(':id/annotations/:annotationId')
  @Roles('ADMIN', 'DOCTOR', 'NURSE', 'FRONT_DESK', 'PATIENT')
  @Permissions('consent:*:write')
  async deleteAnnotation(
    @Param('id') id: string,
    @Param('annotationId') annotationId: string,
    @CurrentUser() user: UserIdentity,
  ) {
    // Verify consent access
    await this.consentService.findOne(id, user.id);
    await this.consentService.deleteAnnotation(id, annotationId, user.id);
    return { success: true };
  }
}

