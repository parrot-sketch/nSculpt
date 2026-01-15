import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PDFConsentRepository } from '../repositories/pdf-consent.repository';
import { PDFProcessingService, SignatureInfo } from './pdf-processing.service';
import { GeneratePDFConsentDto } from '../dto/generate-pdf-consent.dto';
import { SignPDFConsentDto } from '../dto/sign-pdf-consent.dto';
import { SendForSignatureDto } from '../dto/send-for-signature.dto';
import { RevokePDFConsentDto } from '../dto/revoke-pdf-consent.dto';
import { ArchivePDFConsentDto } from '../dto/archive-pdf-consent.dto';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { ConsentEventType, PDFConsentCreatedPayload, PDFConsentReadyForSignaturePayload, PDFConsentSignedPayload, PDFConsentRevokedPayload, PDFConsentArchivedPayload } from '../events/consent.events';
import { Domain, ConsentStatus } from '@prisma/client';
import { RlsValidationService } from '../../audit/services/rlsValidation.service';

@Injectable()
export class PDFConsentService {
  constructor(
    private readonly repository: PDFConsentRepository,
    private readonly pdfProcessing: PDFProcessingService,
    private readonly domainEventService: DomainEventService,
    private readonly correlationService: CorrelationService,
    private readonly rlsValidation: RlsValidationService,
  ) {}

  /**
   * Generate a patient-specific consent from template
   * Triggered from Consultation page - preloads patient + consultation data
   */
  async generateConsent(dto: GeneratePDFConsentDto, userId: string) {
    // Get template
    const template = await this.repository.findTemplateById(dto.templateId);
    if (!template) {
      throw new NotFoundException(`Template with ID ${dto.templateId} not found`);
    }

    if (!template.fileUrl) {
      throw new BadRequestException('Template does not have a PDF file');
    }

    // Load template PDF
    const templatePath = template.fileUrl; // In production, download from S3 if needed
    const templateBuffer = await this.pdfProcessing.loadPDF(templatePath);

    // Prepare placeholder values
    // Auto-populate common fields from patient/consultation data
    const placeholderValues: Record<string, string> = {
      ...dto.placeholderValues,
      // Add default placeholders if not provided
      DATE: new Date().toLocaleDateString(),
    };

    // Merge placeholders into PDF
    const mergedPdfBuffer = await this.pdfProcessing.mergePlaceholders(
      templateBuffer,
      placeholderValues,
    );

    // Save generated PDF
    const filename = this.pdfProcessing.generateFilename('temp', 'generated');
    const filePath = await this.pdfProcessing.savePDF(mergedPdfBuffer, filename);
    const generatedPdfUrl = this.pdfProcessing.getFileUrl(filePath);

    // Create consent record
    const consent = await this.repository.createConsent({
      ...dto,
      createdBy: userId,
      generatedPdfUrl,
    });

    // Emit event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: ConsentEventType.PDF_CONSENT_CREATED,
      domain: Domain.CONSENT,
      aggregateId: consent.id,
      aggregateType: 'PDFConsent',
      payload: {
        consentId: consent.id,
        templateId: consent.templateId,
        patientId: consent.patientId,
        consultationId: consent.consultationId || undefined,
        generatedPdfUrl: consent.generatedPdfUrl || undefined,
      } as PDFConsentCreatedPayload,
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return consent;
  }

  /**
   * Get consent by ID
   */
  async findOne(id: string, userId?: string) {
    const consent = await this.repository.findConsentById(id);
    if (!consent) {
      throw new NotFoundException(`Consent with ID ${id} not found`);
    }

    // Validate access
    if (userId) {
      const hasAccess = await this.rlsValidation.canAccessPatient(consent.patientId, userId);
      if (!hasAccess) {
        throw new ForbiddenException(`Access denied to consent ${id}`);
      }
    }

    return consent;
  }

  /**
   * Get consents by patient
   */
  async findByPatient(patientId: string, userId: string, includeArchived: boolean = false) {
    // Validate access
    const hasAccess = await this.rlsValidation.canAccessPatient(patientId, userId);
    if (!hasAccess) {
      throw new ForbiddenException(`Access denied to patient ${patientId}`);
    }

    return await this.repository.findConsentsByPatient(patientId, includeArchived);
  }

  /**
   * Get consents by consultation
   */
  async findByConsultation(consultationId: string, userId: string) {
    const consents = await this.repository.findConsentsByConsultation(consultationId);
    
    // Validate access to first consent's patient (all should be same patient)
    if (consents.length > 0) {
      const hasAccess = await this.rlsValidation.canAccessPatient(consents[0].patientId, userId);
      if (!hasAccess) {
        throw new ForbiddenException(`Access denied to consultation ${consultationId}`);
      }
    }

    return consents;
  }

  /**
   * Send consent for signature
   * When admin/doctor confirms, status changes to READY_FOR_SIGNATURE
   */
  async sendForSignature(dto: SendForSignatureDto, userId: string) {
    const consent = await this.findOne(dto.consentId, userId);

    if (consent.status !== ConsentStatus.DRAFT) {
      throw new BadRequestException(`Consent must be in DRAFT status to send for signature. Current status: ${consent.status}`);
    }

    // Update status
    await this.repository.updateConsentStatus(
      consent.id,
      ConsentStatus.READY_FOR_SIGNATURE,
      {
        sentForSignatureAt: new Date(),
      },
    );

    // Emit event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: ConsentEventType.PDF_CONSENT_READY_FOR_SIGNATURE,
      domain: Domain.CONSENT,
      aggregateId: consent.id,
      aggregateType: 'PDFConsent',
      payload: {
        consentId: consent.id,
        sentAt: new Date().toISOString(),
        sentBy: userId,
      } as PDFConsentReadyForSignaturePayload,
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return await this.findOne(consent.id, userId);
  }

  /**
   * Sign consent
   * Records signature and updates status
   */
  async signConsent(dto: SignPDFConsentDto, userId: string, request?: { ip?: string; headers?: any }) {
    const consent = await this.findOne(dto.consentId, userId);

    if (consent.status !== ConsentStatus.READY_FOR_SIGNATURE && consent.status !== ConsentStatus.PARTIALLY_SIGNED) {
      throw new BadRequestException(`Consent must be READY_FOR_SIGNATURE or PARTIALLY_SIGNED to sign. Current status: ${consent.status}`);
    }

    // Extract IP and device info from request
    const ipAddress = request?.ip || dto.ipAddress;
    const deviceInfo = dto.deviceInfo || request?.headers?.['user-agent'] || 'Unknown';

    // Create signature
    await this.repository.createSignature({
      ...dto,
      signerId: dto.signerId || userId,
      ipAddress,
      deviceInfo,
    });

    // Check if all required signatures are collected
    const signatures = await this.repository.getSignatures(consent.id);
    const isFullySigned = await this.repository.isConsentFullySigned(consent.id);

    // Update status
    let newStatus: ConsentStatus;
    if (isFullySigned || signatures.length >= 1) {
      // For now, if we have at least one signature, consider it signed
      // In production, check against template required parties
      newStatus = ConsentStatus.SIGNED;

      // Generate final locked PDF
      if (consent.generatedPdfUrl) {
        const generatedPdfBuffer = await this.pdfProcessing.loadPDF(consent.generatedPdfUrl);
        const signatureInfos: SignatureInfo[] = signatures.map(sig => ({
          signerName: sig.signerName,
          signerType: sig.signerType,
          signedAt: sig.signedAt,
          signatureUrl: sig.signatureUrl,
        }));

        const finalPdfBuffer = await this.pdfProcessing.generateFinalPDF(
          generatedPdfBuffer,
          signatureInfos,
        );

        const filename = this.pdfProcessing.generateFilename(consent.id, 'final');
        const filePath = await this.pdfProcessing.savePDF(finalPdfBuffer, filename);
        const finalPdfUrl = this.pdfProcessing.getFileUrl(filePath);

        await this.repository.updateConsentStatus(consent.id, newStatus, {
          finalPdfUrl,
          lockedAt: new Date(),
        });
      } else {
        await this.repository.updateConsentStatus(consent.id, newStatus);
      }
    } else {
      newStatus = ConsentStatus.PARTIALLY_SIGNED;
      await this.repository.updateConsentStatus(consent.id, newStatus);
    }

    // Emit event if fully signed
    if (newStatus === ConsentStatus.SIGNED) {
      const context = this.correlationService.getContext();
      await this.domainEventService.createEvent({
        eventType: ConsentEventType.PDF_CONSENT_SIGNED,
        domain: Domain.CONSENT,
        aggregateId: consent.id,
        aggregateType: 'PDFConsent',
        payload: {
          consentId: consent.id,
          signedAt: new Date().toISOString(),
          signerType: dto.signerType,
          signerName: dto.signerName,
          finalPdfUrl: consent.finalPdfUrl || '',
        } as PDFConsentSignedPayload,
        correlationId: context.correlationId || undefined,
        causationId: context.causationId || undefined,
        createdBy: userId,
        sessionId: context.sessionId || undefined,
        requestId: context.requestId || undefined,
      });
    }

    return await this.findOne(consent.id, userId);
  }

  /**
   * Revoke consent
   */
  async revokeConsent(dto: RevokePDFConsentDto, userId: string) {
    const consent = await this.findOne(dto.consentId, userId);

    if (consent.status === ConsentStatus.REVOKED) {
      throw new BadRequestException('Consent is already revoked');
    }

    if (consent.status === ConsentStatus.SIGNED) {
      throw new BadRequestException('Cannot revoke a signed consent. Create a new version instead.');
    }

    await this.repository.updateConsentStatus(consent.id, ConsentStatus.REVOKED);

    // Emit event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: ConsentEventType.PDF_CONSENT_REVOKED,
      domain: Domain.CONSENT,
      aggregateId: consent.id,
      aggregateType: 'PDFConsent',
      payload: {
        consentId: consent.id,
        revokedAt: new Date().toISOString(),
        revokedBy: userId,
        reason: dto.reason,
      } as PDFConsentRevokedPayload,
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return await this.findOne(consent.id, userId);
  }

  /**
   * Archive consent
   */
  async archiveConsent(dto: ArchivePDFConsentDto, userId: string) {
    const consent = await this.findOne(dto.consentId, userId);

    await this.repository.archiveConsent(consent.id, userId);

    // Emit event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: ConsentEventType.PDF_CONSENT_ARCHIVED,
      domain: Domain.CONSENT,
      aggregateId: consent.id,
      aggregateType: 'PDFConsent',
      payload: {
        consentId: consent.id,
        archivedAt: new Date().toISOString(),
        archivedBy: userId,
        reason: dto.reason,
      } as PDFConsentArchivedPayload,
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return await this.findOne(consent.id, userId);
  }
}

