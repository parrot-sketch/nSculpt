import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConsentRepository } from '../repositories/consent.repository';
import { ConsentContentService } from './consent-content.service';
import { StructuredDataValidatorService } from './structured-data-validator.service';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { IdentityContextService } from '../../../modules/auth/services/identityContext.service';
import { RlsValidationService } from '../../../modules/audit/services/rlsValidation.service';
import { CreateConsentDto } from '../dto/create-consent.dto';
import { UpdateConsentDto } from '../dto/update-consent.dto';
import { CreateFillInValueDto } from '../dto/fill-in-value.dto';
import { CreateStructuredDataDto } from '../dto/structured-data.dto';
import { CreatePageAcknowledgementDto } from '../dto/page-acknowledgement.dto';
import { SignConsentDto } from '../dto/sign-consent.dto';
import { AcknowledgeSectionDto } from '../dto/acknowledge-section.dto';
import { ConsentEventType, ConsentRevokedPayload } from '../events/consent.events';
import { Domain } from '@prisma/client';
import { createHash } from 'crypto';

@Injectable()
export class ConsentService {
  constructor(
    private readonly consentRepository: ConsentRepository,
    private readonly contentService: ConsentContentService,
    private readonly validatorService: StructuredDataValidatorService,
    private readonly domainEventService: DomainEventService,
    private readonly correlationService: CorrelationService,
    private readonly identityContext: IdentityContextService,
    private readonly rlsValidation: RlsValidationService,
  ) {}

  async create(createConsentDto: CreateConsentDto, userId: string) {
    const instance = await this.consentRepository.createInstance({
      ...createConsentDto,
      presentedBy: userId,
      createdBy: userId,
    });

    // Pre-populate fill-in values if provided
    if (createConsentDto.fillInValues && createConsentDto.fillInValues.length > 0) {
      // Get template with fill-in fields
      const template = await this.consentRepository.findInstanceWithFullData(instance.id);
      if (template?.template?.fillInFields) {
        for (const fillIn of createConsentDto.fillInValues) {
          const field = template.template.fillInFields.find(
            (f) => f.fieldCode === fillIn.fieldCode,
          );
          if (field) {
            await this.setFillInValue(
              instance.id,
              field.id,
              fillIn.value,
              userId,
            );
          }
        }
      }
    }

    const context = this.correlationService.getContext();

    await this.domainEventService.createEvent({
      eventType: ConsentEventType.CONSENT_CREATED,
      domain: Domain.CONSENT,
      aggregateId: instance.id,
      aggregateType: 'PatientConsentInstance',
      payload: {
        instanceId: instance.id,
        instanceNumber: instance.instanceNumber,
        templateId: instance.templateId,
        patientId: instance.patientId,
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return instance;
  }

  async findOne(id: string, userId?: string) {
    const instance = await this.consentRepository.findInstanceById(id);
    if (!instance) {
      throw new NotFoundException(`Consent instance with ID ${id} not found`);
    }

    // Validate access if userId provided
    if (userId) {
      const hasAccess = await this.rlsValidation.canAccessConsent(id, userId);
      if (!hasAccess) {
        throw new ForbiddenException(`Access denied to consent instance ${id}`);
      }
    }

    return instance;
  }

  async update(id: string, updateConsentDto: UpdateConsentDto, userId: string) {
    // Validate access
    const existing = await this.findOne(id, userId);

    // If revoking consent, handle specially
    if (updateConsentDto.status === 'REVOKED') {
      return this.revokeConsent(id, updateConsentDto, userId);
    }

    // If signing consent
    if (updateConsentDto.status === 'SIGNED') {
      const updated = await this.consentRepository.updateInstance(id, updateConsentDto);

      const context = this.correlationService.getContext();

      await this.domainEventService.createEvent({
        eventType: ConsentEventType.CONSENT_SIGNED,
        domain: Domain.CONSENT,
        aggregateId: id,
        aggregateType: 'PatientConsentInstance',
        payload: {
          instanceId: id,
          signedAt: updated.signedAt?.toISOString() || new Date().toISOString(),
          signedBy: userId || '',
        },
        correlationId: context.correlationId || undefined,
        causationId: context.causationId || undefined,
        createdBy: userId,
        sessionId: context.sessionId || undefined,
        requestId: context.requestId || undefined,
      });

      return updated;
    }

    // Regular update
    return this.consentRepository.updateInstance(id, updateConsentDto);
  }

  async revokeConsent(id: string, updateConsentDto: UpdateConsentDto, userId: string) {
    // Validate access
    const existing = await this.findOne(id, userId);

    const context = this.correlationService.getContext();

    // CRITICAL: Create revocation event first
    const revocationEvent = await this.domainEventService.createEvent({
      eventType: ConsentEventType.CONSENT_REVOKED,
      domain: Domain.CONSENT,
      aggregateId: id,
      aggregateType: 'PatientConsentInstance',
      payload: {
        instanceId: id,
        revokedAt: new Date().toISOString(),
        revokedBy: userId || '',
        reason: (updateConsentDto as any).reason,
      } as ConsentRevokedPayload,
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    // Update instance with revocation event ID
    await this.consentRepository.setRevocationEvent(id, revocationEvent.id);
    const updated = await this.consentRepository.updateInstance(id, {
      status: 'REVOKED',
      ...(userId ? { revokedBy: userId } : {}),
    } as any);

    return updated;
  }

  async findAll(skip?: number, take?: number, userId?: string) {
    if (!userId) {
      return [];
    }

    // ADMIN sees all consents
    if (this.identityContext.hasRole('ADMIN')) {
      return this.consentRepository.findAllInstances(skip, take);
    }

    // Filter by patient relationships
    return this.consentRepository.findAllFiltered(skip, take, userId);
  }

  // ============================================================================
  // Fill-in Values Methods
  // ============================================================================

  async setFillInValue(
    instanceId: string,
    fieldId: string,
    value: string,
    userId: string,
  ) {
    // Validate instance exists
    const instance = await this.findOne(instanceId, userId);
    if (instance.status === 'SIGNED') {
      throw new BadRequestException('Cannot modify fill-in values after consent is signed');
    }

    return await this.consentRepository.createFillInValue({
      instanceId,
      fieldId,
      value,
      filledBy: userId,
    });
  }

  async getFillInValues(instanceId: string, userId?: string) {
    await this.findOne(instanceId, userId); // Validate access
    return await this.consentRepository.getFillInValues(instanceId);
  }

  // ============================================================================
  // Structured Data Methods
  // ============================================================================

  async setStructuredData(dto: CreateStructuredDataDto, userId: string) {
    // Validate instance exists
    const instance = await this.findOne(dto.instanceId, userId);
    if (instance.status === 'SIGNED') {
      throw new BadRequestException('Cannot modify structured data after consent is signed');
    }

    // Get or create schema
    let schema = dto.schema;
    if (!schema) {
      schema = this.validatorService.getDefaultSchema(dto.dataType);
    }

    // Validate data against schema
    this.validatorService.validate(dto.dataType, schema, dto.data);

    return await this.consentRepository.createOrUpdateStructuredData({
      instanceId: dto.instanceId,
      dataType: dto.dataType,
      schema,
      data: JSON.stringify(dto.data),
      createdBy: userId,
    });
  }

  async getStructuredData(instanceId: string, dataType?: string, userId?: string) {
    await this.findOne(instanceId, userId); // Validate access
    const data = await this.consentRepository.getStructuredData(instanceId, dataType);
    return data.map((d) => ({
      ...d,
      data: JSON.parse(d.data), // Parse JSON back to object
    }));
  }

  // ============================================================================
  // Page Methods
  // ============================================================================

  async acknowledgePage(dto: CreatePageAcknowledgementDto, userId: string) {
    // Validate instance exists and user has access
    const instance = await this.findOne(dto.instanceId, userId);

    // Validate page exists
    const page = await this.consentRepository.getPageById(dto.pageId);
    if (!page) {
      throw new NotFoundException(`Page with ID ${dto.pageId} not found`);
    }

    // Create acknowledgment
    const acknowledgement = await this.consentRepository.createPageAcknowledgement({
      ...dto,
      acknowledgedBy: userId,
    });

    return acknowledgement;
  }

  async getPageContent(instanceId: string, pageId: string, userId?: string) {
    await this.findOne(instanceId, userId); // Validate access

    const instance = await this.consentRepository.findInstanceWithFullData(instanceId);
    const page = await this.consentRepository.getPageById(pageId);

    if (!page) {
      throw new NotFoundException(`Page with ID ${pageId} not found`);
    }

    // Render page content with fill-ins
    let renderedContent = page.content || '';
    if (renderedContent) {
      renderedContent = await this.contentService.renderContentWithFillIns(
        renderedContent,
        instanceId,
      );
    }

    // Get page acknowledgment status
    const acknowledgements = await this.consentRepository.getPageAcknowledgements(instanceId);
    const pageAck = acknowledgements.find((a) => a.pageId === pageId);

    return {
      page,
      renderedContent,
      acknowledged: !!pageAck,
      acknowledgement: pageAck,
    };
  }

  // ============================================================================
  // Section/Clause Acknowledgment Methods
  // ============================================================================

  async acknowledgeSection(dto: AcknowledgeSectionDto, userId: string) {
    // Validate instance exists
    const instance = await this.findOne(dto.instanceId, userId);

    // Get client IP and user agent from request context (if available)
    // For now, using placeholders - these should be injected via decorator/interceptor
    const ipAddress = undefined; // TODO: Get from request context
    const userAgent = undefined; // TODO: Get from request context

    const acknowledgement = await this.consentRepository.createAcknowledgement({
      instanceId: dto.instanceId,
      sectionId: dto.sectionId,
      clauseId: dto.clauseId,
      acknowledgedBy: userId,
      acknowledged: dto.acknowledged,
      declinedReason: dto.declinedReason,
      ipAddress,
      userAgent,
      // Additional fields for understanding checks
      understandingCheckPassed: dto.understandingCheckPassed || false,
      understandingResponse: dto.understandingResponse,
      discussionRequired: dto.discussionRequired || false,
      discussionCompleted: dto.discussionCompleted || false,
      discussedWith: dto.discussedWith,
      timeSpentSeconds: dto.timeSpentSeconds,
      scrollDepth: dto.scrollDepth,
    });

    // Update instance flags
    await this.updateInstanceFlags(dto.instanceId);

    return acknowledgement;
  }

  // ============================================================================
  // Signature Methods
  // ============================================================================

  async signConsent(dto: SignConsentDto, userId: string, req?: any) {
    // Validate instance exists
    const instance = await this.findOne(dto.instanceId, userId);

    // Check if already signed by this party
    const existingSignatures = await this.consentRepository.getSignatures(dto.instanceId);
    const alreadySigned = existingSignatures.some(
      (s) => s.partyType === dto.partyType,
    );

    if (alreadySigned) {
      throw new BadRequestException(
        `Consent already signed by ${dto.partyType}`,
      );
    }

    // Generate signature hash
    const signatureHash = dto.signatureData
      ? createHash('sha256').update(dto.signatureData).digest('hex')
      : undefined;

    // Get IP and user agent from request
    const ipAddress = req?.ip || req?.socket?.remoteAddress;
    const userAgent = req?.headers?.['user-agent'];

    // Create signature
    const signature = await this.consentRepository.createSignature({
      instanceId: dto.instanceId,
      partyType: dto.partyType,
      signedBy: userId,
      signatureMethod: dto.signatureMethod,
      signatureData: dto.signatureData,
      deviceType: dto.deviceType,
      ipAddress,
      userAgent,
      signatureHash,
      guardianRelationship: dto.guardianRelationship,
      guardianConsentFor: dto.guardianConsentFor,
      notes: dto.notes,
    });

    // Check if all required parties have signed
    await this.checkAllPartiesSigned(dto.instanceId);

    return signature;
  }

  /**
   * Check if all required parties have signed
   * Update status to SIGNED if complete
   */
  private async checkAllPartiesSigned(instanceId: string) {
    const instance = await this.consentRepository.findInstanceWithFullData(instanceId);
    if (!instance || !instance.template) {
      return;
    }

    const requiredParties = instance.template.requiredParties?.filter((p) => p.required) || [];
    const signatures = await this.consentRepository.getSignatures(instanceId);

    const signedPartyTypes = new Set(signatures.map((s) => s.partyType));
    const allRequiredSigned = requiredParties.every((p) =>
      signedPartyTypes.has(p.partyType),
    );

    if (allRequiredSigned && instance.status !== 'SIGNED') {
      // Generate document snapshot
      const fullDocumentText = await this.contentService.generateFullDocumentText(instanceId);

      // Create snapshot
      await this.consentRepository.createDocumentSnapshot({
        instanceId,
        templateId: instance.templateId,
        fullDocumentText,
        sectionSnapshots: null, // TODO: Generate structured snapshots
        templateVersion: instance.templateVersion,
        templateVersionNumber: instance.template.versionNumber,
      });

      // Update status to SIGNED
      await this.consentRepository.updateInstance(instanceId, {
        status: 'SIGNED',
        signedAt: new Date(),
      } as any);

      // Emit event
      const context = this.correlationService.getContext();
      await this.domainEventService.createEvent({
        eventType: ConsentEventType.CONSENT_SIGNED,
        domain: Domain.CONSENT,
        aggregateId: instanceId,
        aggregateType: 'PatientConsentInstance',
        payload: {
          instanceId,
          signedAt: new Date().toISOString(),
        },
        correlationId: context.correlationId || undefined,
        causationId: context.causationId || undefined,
        createdBy: signatures[signatures.length - 1]?.signedBy || '',
      });
    }
  }

  /**
   * Update instance flags based on acknowledgments
   */
  private async updateInstanceFlags(instanceId: string) {
    const instance = await this.consentRepository.findInstanceWithFullData(instanceId);
    if (!instance) {
      return;
    }

    const allSectionsAcknowledged =
      instance.template?.sections?.every((section) => {
        const ack = instance.acknowledgments?.find(
          (a) => a.sectionId === section.id,
        );
        return ack && ack.acknowledged;
      }) || false;

    const understandingChecksPassed =
      instance.acknowledgments?.every(
        (ack) => !ack.understandingCheckPassed || ack.understandingCheckPassed === true,
      ) || false;

    await this.consentRepository.updateInstance(instanceId, {
      allSectionsAcknowledged,
      understandingChecksPassed,
    } as any);
  }

  // ============================================================================
  // Template Methods
  // ============================================================================

  async findTemplateByCPTCode(cptCode: string) {
    return await this.consentRepository.findTemplateByCPTCode(cptCode);
  }

  async getInstanceWithFullData(id: string, userId?: string) {
    const instance = await this.findOne(id, userId);
    return await this.consentRepository.findInstanceWithFullData(id);
  }
}

