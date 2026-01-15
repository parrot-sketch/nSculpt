import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PDFConsentRepository } from '../repositories/pdf-consent.repository';
import { PDFProcessingService, SignatureInfo } from './pdf-processing.service';
import { GeneratePDFConsentDto } from '../dto/generate-pdf-consent.dto';
import { SignPDFConsentDto, PDFSignerType } from '../dto/sign-pdf-consent.dto';
import { SendForSignatureDto } from '../dto/send-for-signature.dto';
import { RevokePDFConsentDto } from '../dto/revoke-pdf-consent.dto';
import { ArchivePDFConsentDto } from '../dto/archive-pdf-consent.dto';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { ConsentEventType, PDFConsentCreatedPayload, PDFConsentReadyForSignaturePayload, PDFConsentSignedPayload, PDFConsentRevokedPayload, PDFConsentArchivedPayload } from '../events/consent.events';
import { Domain, ConsentStatus, SignerType } from '@prisma/client';
import { RlsValidationService } from '../../audit/services/rlsValidation.service';
import { IdentityContextService } from '../../auth/services/identityContext.service';
import { EMRNoteService } from '../../emr/services/emr-note.service';
import { ListNotesDto } from '../../emr/dto/list-notes.dto';
import { getPrismaClient } from '../../../prisma/client';

/**
 * Enhanced PDF Consent Service with production-ready hardening
 * 
 * Features:
 * - Signature order enforcement (Patient → Doctor → Witness)
 * - EMR auto-attachment on signing
 * - Revocation constraints (no revoke if surgery scheduled)
 * - Archive validation
 * - Version conflict protection
 * - Comprehensive guard rails
 */
@Injectable()
export class PDFConsentService {
  private readonly logger = new Logger(PDFConsentService.name);
  private readonly prisma = getPrismaClient();

  // Signature order: Patient must sign before Doctor, Witness after Patient
  private readonly SIGNATURE_ORDER: Record<string, number> = {
    PATIENT: 1,
    GUARDIAN: 1, // Same priority as patient
    DOCTOR: 2,
    NURSE_WITNESS: 3,
    ADMIN: 4, // Admin can only sign with override
  };

  constructor(
    private readonly repository: PDFConsentRepository,
    private readonly pdfProcessing: PDFProcessingService,
    private readonly domainEventService: DomainEventService,
    private readonly correlationService: CorrelationService,
    private readonly rlsValidation: RlsValidationService,
    private readonly identityContext: IdentityContextService,
    private readonly emrNoteService: EMRNoteService,
  ) {}

  /**
   * Generate a patient-specific consent from template
   * Triggered from Consultation page - preloads patient + consultation data
   */
  async generateConsent(dto: GeneratePDFConsentDto, userId: string) {
    // Validate patient access
    const hasAccess = await this.rlsValidation.canAccessPatient(dto.patientId, userId);
    if (!hasAccess) {
      throw new ForbiddenException(`Access denied to patient ${dto.patientId}`);
    }

    // Get template
    const template = await this.repository.findTemplateById(dto.templateId);
    if (!template) {
      throw new NotFoundException(`Template with ID ${dto.templateId} not found`);
    }

    // Debug logging
    this.logger.debug(`Template ${dto.templateId} - fileUrl: ${template.fileUrl}, originalDocumentPath: ${template.originalDocumentPath}`);

    // Check both fileUrl and originalDocumentPath (fallback)
    const pdfFileUrl = template.fileUrl || template.originalDocumentPath;
    if (!pdfFileUrl) {
      this.logger.error(`Template ${dto.templateId} has no PDF file. Template data: ${JSON.stringify({ id: template.id, name: template.name, fileUrl: template.fileUrl, originalDocumentPath: template.originalDocumentPath })}`);
      throw new BadRequestException('Template does not have a PDF file. Please ensure the PDF was uploaded correctly.');
    }

    // Load template PDF
    // Convert URL path to file path
    // fileUrl format: /uploads/consents/filename.pdf
    // Need to convert to: ./uploads/consents/filename.pdf or absolute path
    let templatePath = pdfFileUrl;
    if (templatePath.startsWith('/uploads/')) {
      // Convert URL path to file system path
      templatePath = templatePath.replace('/uploads/consents/', './uploads/consents/');
    }
    this.logger.debug(`Loading PDF from path: ${templatePath}`);
    const templateBuffer = await this.pdfProcessing.loadPDF(templatePath);

    // Prepare placeholder values
    const placeholderValues: Record<string, string> = {
      ...dto.placeholderValues,
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

    this.logger.log(`Consent ${consent.id} generated for patient ${dto.patientId}`);

    return consent;
  }

  /**
   * Get consent by ID with access validation
   */
  async findOne(id: string, userId?: string) {
    const consent = await this.repository.findConsentById(id);
    if (!consent) {
      throw new NotFoundException(`Consent with ID ${id} not found`);
    }

    // Validate access using consent-specific RLS check
    if (userId) {
      const hasAccess = await this.rlsValidation.canAccessPDFConsent(id, userId);
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
    const hasAccess = await this.rlsValidation.canAccessPatient(patientId, userId);
    if (!hasAccess) {
      throw new ForbiddenException(`Access denied to patient ${patientId}`);
    }

    return await this.repository.findConsentsByPatient(patientId, includeArchived);
  }

  /**
   * Get consents by patient (alias for PatientService)
   */
  async getConsentsByPatient(patientId: string, userId: string, includeArchived: boolean = false) {
    return this.findByPatient(patientId, userId, includeArchived);
  }

  /**
   * Get active consents by patient
   */
  async getActiveConsentsByPatient(patientId: string, userId: string) {
    const consents = await this.findByPatient(patientId, userId, false);
    return consents.filter(c => c.status === ConsentStatus.SIGNED || c.status === ConsentStatus.READY_FOR_SIGNATURE || c.status === ConsentStatus.PARTIALLY_SIGNED);
  }

  /**
   * Get revoked consents by patient
   */
  async getRevokedConsentsByPatient(patientId: string, userId: string) {
    const consents = await this.findByPatient(patientId, userId, false);
    return consents.filter(c => c.status === ConsentStatus.REVOKED);
  }

  /**
   * Get consents by consultation
   */
  async findByConsultation(consultationId: string, userId: string) {
    const consents = await this.repository.findConsentsByConsultation(consultationId);
    
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
   */
  async sendForSignature(dto: SendForSignatureDto, userId: string) {
    const consent = await this.findOne(dto.consentId, userId);

    // Version conflict check
    if (consent.version !== dto.version) {
      throw new ConflictException('Consent has been modified. Please refresh and try again.');
    }

    if (consent.status !== ConsentStatus.DRAFT) {
      throw new BadRequestException(`Consent must be in DRAFT status. Current: ${consent.status}`);
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
   * Sign consent with order enforcement and validation
   */
  async signConsent(
    dto: SignPDFConsentDto,
    userId: string,
    request?: { ip?: string; headers?: any },
    overrideFlag?: boolean,
    overrideReason?: string,
  ) {
    const consent = await this.findOne(dto.consentId, userId);

    // CRITICAL: No signatures allowed once SIGNED
    if (consent.status === ConsentStatus.SIGNED) {
      throw new BadRequestException('Cannot sign consent that is already fully signed and locked');
    }

    if (consent.status !== ConsentStatus.READY_FOR_SIGNATURE && consent.status !== ConsentStatus.PARTIALLY_SIGNED) {
      throw new BadRequestException(`Consent must be READY_FOR_SIGNATURE or PARTIALLY_SIGNED. Current: ${consent.status}`);
    }

    // Get existing signatures
    const existingSignatures = await this.repository.getSignatures(consent.id);
    const existingSignerTypes = new Set(existingSignatures.map(s => s.signerType));

    // Enforce signature order
    const signerOrder = this.SIGNATURE_ORDER[dto.signerType] || 999;
    
    // Check if patient/guardian has signed (required before doctor)
    if (dto.signerType === PDFSignerType.DOCTOR) {
      const hasPatientSignature = existingSignerTypes.has(SignerType.PATIENT) || 
                                   existingSignerTypes.has(SignerType.GUARDIAN);
      if (!hasPatientSignature) {
        throw new BadRequestException('Patient or Guardian must sign before Doctor');
      }
    }

    // Check if witness can sign (must be after patient)
    if (dto.signerType === PDFSignerType.NURSE_WITNESS) {
      const hasPatientSignature = existingSignerTypes.has(SignerType.PATIENT) || 
                                   existingSignerTypes.has(SignerType.GUARDIAN);
      if (!hasPatientSignature) {
        throw new BadRequestException('Patient or Guardian must sign before Witness');
      }
    }

    // Admin override check
    if (dto.signerType === PDFSignerType.ADMIN) {
      const isAdmin = this.identityContext.hasRole('ADMIN');
      if (!isAdmin) {
        throw new ForbiddenException('Only ADMIN can sign as ADMIN');
      }
      if (!overrideFlag) {
        throw new BadRequestException('Admin signature requires override flag and reason');
      }
      if (!overrideReason) {
        throw new BadRequestException('Admin signature requires override reason');
      }
    }

    // Prevent duplicate signatures
    if (existingSignerTypes.has(dto.signerType as SignerType)) {
      throw new BadRequestException(`${dto.signerType} has already signed this consent`);
    }

    // Extract metadata
    const ipAddress = request?.ip || dto.ipAddress;
    const deviceInfo = dto.deviceInfo || request?.headers?.['user-agent'] || 'Unknown';

    // Create signature
    await this.repository.createSignature({
      ...dto,
      signerId: dto.signerId || userId,
      ipAddress,
      deviceInfo,
    });

    this.logger.log(`Signature recorded: ${dto.signerType} by ${dto.signerName} for consent ${consent.id}`);

    // Get updated signatures
    const allSignatures = await this.repository.getSignatures(consent.id);
    
    // Determine if fully signed (simplified: at least patient + doctor)
    // In production, check against template required parties
    const hasPatient = allSignatures.some(s => 
      s.signerType === SignerType.PATIENT || s.signerType === SignerType.GUARDIAN
    );
    const hasDoctor = allSignatures.some(s => s.signerType === SignerType.DOCTOR);
    const isFullySigned = hasPatient && hasDoctor;

    let newStatus: ConsentStatus;
    
    if (isFullySigned) {
      newStatus = ConsentStatus.SIGNED;

      // Generate final locked PDF
      if (consent.generatedPdfUrl) {
        const generatedPdfBuffer = await this.pdfProcessing.loadPDF(consent.generatedPdfUrl);
        const signatureInfos: SignatureInfo[] = allSignatures.map(sig => ({
          signerName: sig.signerName,
          signerType: sig.signerType,
          signedAt: sig.signedAt,
          signatureUrl: sig.signatureUrl,
        }));

        const { pdfBuffer: finalPdfBuffer, hash: finalHash } = await this.pdfProcessing.generateFinalPDF(
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

        // Auto-attach to EMR
        await this.attachToEMR(consent, finalPdfUrl, allSignatures, userId);

        this.logger.log(`Consent ${consent.id} fully signed and locked. Final PDF: ${finalPdfUrl}`);
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
   * Auto-attach signed consent to EMR
   */
  private async attachToEMR(
    consent: any,
    finalPdfUrl: string,
    signatures: any[],
    userId: string,
  ) {
    try {
      if (!consent.consultationId) {
        this.logger.warn(`Consent ${consent.id} has no consultationId, skipping EMR attachment`);
        return;
      }

      // Find EMR notes for this consultation
      const notesResult = await this.emrNoteService.listNotesByConsultation(
        consent.consultationId,
        {} as ListNotesDto, // Empty DTO for default filtering
        userId,
      );

      if (!notesResult.notes || notesResult.notes.length === 0) {
        this.logger.warn(`No EMR notes found for consultation ${consent.consultationId}`);
        return;
      }

      // Attach to most recent note
      const latestNote = notesResult.notes[0];

      // Create addendum content
      const signatureSummary = signatures
        .map(s => `${s.signerType}: ${s.signerName} (${s.signedAt.toLocaleString()})`)
        .join('\n');

      const addendumContent = `Surgical consent signed and attached to consultation.

Consent ID: ${consent.id}
Signed: ${new Date().toLocaleString()}

Signatures:
${signatureSummary}

Final PDF: ${finalPdfUrl}

This consent is digitally signed and locked. Do not proceed with surgery until all required signatures are collected.`;

      await this.emrNoteService.addAddendum(latestNote.id, { content: addendumContent }, userId);

      this.logger.log(`Consent ${consent.id} attached to EMR note ${latestNote.id}`);
    } catch (error) {
      this.logger.error(`Failed to attach consent to EMR: ${error.message}`, error.stack);
      // Don't throw - EMR attachment failure shouldn't fail consent signing
    }
  }

  /**
   * Revoke consent with constraints
   */
  async revokeConsent(dto: RevokePDFConsentDto, userId: string) {
    const consent = await this.findOne(dto.consentId, userId);

    // Only Admin or Doctor can revoke
    const isAdmin = this.identityContext.hasRole('ADMIN');
    const isDoctor = this.identityContext.hasRole('DOCTOR');
    if (!isAdmin && !isDoctor) {
      throw new ForbiddenException('Only ADMIN or DOCTOR can revoke consents');
    }

    if (consent.status === ConsentStatus.REVOKED) {
      throw new BadRequestException('Consent is already revoked');
    }

    if (consent.status === ConsentStatus.SIGNED) {
      throw new BadRequestException('Cannot revoke a signed consent. Create a new version instead.');
    }

    // Check if surgery is scheduled
    if (consent.consultationId) {
      const consultation = await this.prisma.consultation.findUnique({
        where: { id: consent.consultationId },
        include: {
          procedurePlans: {
            include: {
              surgicalCases: true,
            },
          },
        },
      });

      if (consultation) {
        const hasScheduledSurgery = consultation.procedurePlans.some(
          plan => plan.surgicalCases && plan.surgicalCases.some(c => c.status === 'SCHEDULED')
        );

        if (hasScheduledSurgery) {
          throw new BadRequestException(
            'Cannot revoke consent when surgery is already scheduled. Cancel surgery first or create new consent.'
          );
        }
      }
    }

    if (!dto.reason) {
      throw new BadRequestException('Revocation reason is required');
    }

    await this.repository.updateConsentStatus(consent.id, ConsentStatus.REVOKED);

    // Update EMR addendum if exists
    await this.updateEMRRevocation(consent, dto.reason, userId);

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

    this.logger.warn(`Consent ${consent.id} revoked by ${userId}. Reason: ${dto.reason}`);

    return await this.findOne(consent.id, userId);
  }

  /**
   * Update EMR with revocation notice
   */
  private async updateEMRRevocation(consent: any, reason: string, userId: string) {
    try {
      if (!consent.consultationId) return;

      const notesResult = await this.emrNoteService.listNotesByConsultation(
        consent.consultationId,
        {} as ListNotesDto, // Empty DTO for default filtering
        userId,
      );

      if (!notesResult.notes || notesResult.notes.length === 0) return;

      const latestNote = notesResult.notes[0];
      const addendumContent = `Consent revoked — do not proceed until re-authorized.

Consent ID: ${consent.id}
Revoked: ${new Date().toLocaleString()}
Revoked by: ${userId}
Reason: ${reason}

⚠️ WARNING: This consent is no longer valid. Do not proceed with surgery until a new consent is obtained.`;

      await this.emrNoteService.addAddendum(latestNote.id, { content: addendumContent }, userId);
    } catch (error) {
      this.logger.error(`Failed to update EMR with revocation: ${error.message}`);
    }
  }

  /**
   * Archive consent with validation
   */
  async archiveConsent(dto: ArchivePDFConsentDto, userId: string) {
    // Only Admin can archive
    const isAdmin = this.identityContext.hasRole('ADMIN');
    if (!isAdmin) {
      throw new ForbiddenException('Only ADMIN can archive consents');
    }

    const consent = await this.findOne(dto.consentId, userId);

    // Disallow if consent not signed or revoked
    if (consent.status !== ConsentStatus.SIGNED && consent.status !== ConsentStatus.REVOKED) {
      throw new BadRequestException(
        `Cannot archive consent in ${consent.status} status. Only SIGNED or REVOKED consents can be archived.`
      );
    }

    if (!dto.reason) {
      throw new BadRequestException('Archive reason is required');
    }

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

    this.logger.log(`Consent ${consent.id} archived by ${userId}`);

    return await this.findOne(consent.id, userId);
  }

  /**
   * Get all annotations for a consent
   */
  async getAnnotations(consentId: string) {
    const consent = await this.findOne(consentId);
    return await this.repository.getAnnotations(consentId);
  }

  /**
   * Get annotation by ID
   */
  async getAnnotationById(consentId: string, annotationId: string) {
    await this.findOne(consentId);
    return await this.repository.getAnnotationById(consentId, annotationId);
  }

  /**
   * Create annotation
   */
  async createAnnotation(consentId: string, createDto: any, userId: string) {
    const consent = await this.findOne(consentId, userId);
    
    // Validate consent can be annotated
    if (consent.status === ConsentStatus.SIGNED || consent.status === ConsentStatus.REVOKED || consent.status === ConsentStatus.ARCHIVED) {
      throw new BadRequestException(`Cannot add annotations to consent in ${consent.status} state`);
    }

    return await this.repository.createAnnotation(consentId, {
      ...createDto,
      createdById: userId,
    });
  }

  /**
   * Update annotation
   */
  async updateAnnotation(consentId: string, annotationId: string, updateDto: any, userId: string) {
    const consent = await this.findOne(consentId, userId);
    
    // Validate consent can be annotated
    if (consent.status === ConsentStatus.SIGNED || consent.status === ConsentStatus.REVOKED || consent.status === ConsentStatus.ARCHIVED) {
      throw new BadRequestException(`Cannot modify annotations on consent in ${consent.status} state`);
    }

    return await this.repository.updateAnnotation(consentId, annotationId, updateDto);
  }

  /**
   * Delete annotation (soft delete)
   */
  async deleteAnnotation(consentId: string, annotationId: string, userId: string) {
    const consent = await this.findOne(consentId, userId);
    
    // Validate consent can be annotated
    if (consent.status === ConsentStatus.SIGNED || consent.status === ConsentStatus.REVOKED || consent.status === ConsentStatus.ARCHIVED) {
      throw new BadRequestException(`Cannot delete annotations from consent in ${consent.status} state`);
    }

    await this.repository.deleteAnnotation(consentId, annotationId);
  }
}

