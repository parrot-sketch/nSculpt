import { Injectable } from '@nestjs/common';
import { PrismaClient, ConsentStatus, SignerType } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { CreatePDFTemplateDto } from '../dto/create-pdf-template.dto';
import { GeneratePDFConsentDto } from '../dto/generate-pdf-consent.dto';
import { SignPDFConsentDto } from '../dto/sign-pdf-consent.dto';

@Injectable()
export class PDFConsentRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Create a PDF consent template
   */
  async createTemplate(data: CreatePDFTemplateDto & { createdBy: string }) {
    // Ensure fileUrl is provided
    if (!data.fileUrl) {
      throw new Error('fileUrl is required when creating a PDF template');
    }

    const template = await this.prisma.consentTemplate.create({
      data: {
        templateCode: `PDF-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        name: data.name,
        description: data.description,
        fileUrl: data.fileUrl, // Explicitly set fileUrl
        placeholders: data.placeholders || [],
        originalDocumentPath: data.fileUrl, // Also set originalDocumentPath as backup
        isActive: data.active !== false,
        createdBy: data.createdBy,
        templateType: 'PROCEDURE_SPECIFIC', // Default for PDF templates
        version: '1.0.0',
      },
    });

    // Verify fileUrl was saved
    if (!template.fileUrl) {
      throw new Error(`Template created but fileUrl is null. Data provided: ${JSON.stringify({ fileUrl: data.fileUrl })}`);
    }

    return template;
  }

  /**
   * Find template by ID
   * Explicitly select fileUrl and originalDocumentPath to ensure they're returned
   */
  async findTemplateById(id: string) {
    const template = await this.prisma.consentTemplate.findUnique({
      where: { id },
      select: {
        id: true,
        templateCode: true,
        name: true,
        description: true,
        fileUrl: true,
        originalDocumentPath: true,
        placeholders: true,
        isActive: true,
        templateType: true,
        version: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return template;
  }

  /**
   * Find all active templates
   */
  async findAllTemplates(activeOnly: boolean = true) {
    return await this.prisma.consentTemplate.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update template
   */
  async updateTemplate(id: string, data: Partial<CreatePDFTemplateDto>) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.fileUrl !== undefined) {
      updateData.fileUrl = data.fileUrl;
      updateData.originalDocumentPath = data.fileUrl;
    }
    if (data.placeholders !== undefined) updateData.placeholders = data.placeholders;
    if (data.active !== undefined) updateData.isActive = data.active;

    return await this.prisma.consentTemplate.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Create a PDF consent instance
   */
  async createConsent(data: GeneratePDFConsentDto & { createdBy: string; generatedPdfUrl?: string }) {
    return await this.prisma.pDFConsent.create({
      data: {
        templateId: data.templateId,
        patientId: data.patientId,
        consultationId: data.consultationId,
        generatedPdfUrl: data.generatedPdfUrl,
        status: ConsentStatus.DRAFT,
        createdById: data.createdBy,
      },
      include: {
        template: true,
        patient: true,
        consultation: true,
      },
    });
  }

  /**
   * Find consent by ID
   */
  async findConsentById(id: string) {
    return await this.prisma.pDFConsent.findUnique({
      where: { id },
      include: {
        template: true,
        patient: true,
        consultation: true,
        signatures: {
          include: {
            signer: true,
          },
          orderBy: {
            signedAt: 'asc',
          },
        },
      },
    });
  }

  /**
   * Find consents by patient
   */
  async findConsentsByPatient(patientId: string, includeArchived: boolean = false) {
    return await this.prisma.pDFConsent.findMany({
      where: {
        patientId,
        archivedAt: includeArchived ? undefined : null,
      },
      include: {
        template: true,
        consultation: true,
        signatures: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find consents by consultation
   */
  async findConsentsByConsultation(consultationId: string) {
    return await this.prisma.pDFConsent.findMany({
      where: { consultationId },
      include: {
        template: true,
        patient: true,
        signatures: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update consent status
   */
  async updateConsentStatus(
    id: string,
    status: ConsentStatus,
    options?: {
      generatedPdfUrl?: string;
      finalPdfUrl?: string;
      finalPdfHash?: string; // SHA-256 hash for integrity verification
      sentForSignatureAt?: Date;
      lockedAt?: Date;
    },
  ) {
    const updateData: any = { status };
    if (options?.generatedPdfUrl !== undefined) updateData.generatedPdfUrl = options.generatedPdfUrl;
    if (options?.finalPdfUrl !== undefined) updateData.finalPdfUrl = options.finalPdfUrl;
    if (options?.finalPdfHash !== undefined) updateData.finalPdfHash = options.finalPdfHash;
    if (options?.sentForSignatureAt !== undefined) updateData.sentForSignatureAt = options.sentForSignatureAt;
    if (options?.lockedAt !== undefined) updateData.lockedAt = options.lockedAt;

    return await this.prisma.pDFConsent.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Create a signature
   */
  async createSignature(data: SignPDFConsentDto & { signedAt?: Date }) {
    return await this.prisma.pDFConsentSignature.create({
      data: {
        consentId: data.consentId,
        signerId: data.signerId,
        signerName: data.signerName,
        signerType: data.signerType as SignerType,
        signatureUrl: data.signatureUrl || '',
        signedAt: data.signedAt || new Date(),
        ipAddress: data.ipAddress,
        deviceInfo: data.deviceInfo,
      },
    });
  }

  /**
   * Get all signatures for a consent
   */
  async getSignatures(consentId: string) {
    return await this.prisma.pDFConsentSignature.findMany({
      where: { consentId },
      include: {
        signer: true,
      },
      orderBy: { signedAt: 'asc' },
    });
  }

  /**
   * Archive a consent
   */
  async archiveConsent(id: string, archivedBy: string) {
    return await this.prisma.pDFConsent.update({
      where: { id },
      data: {
        archivedAt: new Date(),
        archivedById: archivedBy,
      },
    });
  }

  /**
   * Check if consent is signed (all required signatures collected)
   * This is a business logic check - implementation depends on template requirements
   */
  async isConsentFullySigned(consentId: string): Promise<boolean> {
    const consent = await this.findConsentById(consentId);
    if (!consent) return false;

    // For now, if status is SIGNED, consider it fully signed
    // In a full implementation, you'd check against template required parties
    return consent.status === ConsentStatus.SIGNED;
  }

  /**
   * Get all annotations for a consent
   */
  async getAnnotations(consentId: string) {
    return await this.prisma.pDFConsentAnnotation.findMany({
      where: {
        consentId,
        deletedAt: null, // Only active annotations
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /**
   * Get annotation by ID
   */
  async getAnnotationById(consentId: string, annotationId: string) {
    return await this.prisma.pDFConsentAnnotation.findFirst({
      where: {
        id: annotationId,
        consentId,
        deletedAt: null,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Create annotation
   */
  async createAnnotation(consentId: string, data: any) {
    return await this.prisma.pDFConsentAnnotation.create({
      data: {
        consentId,
        annotationType: data.annotationType,
        pageNumber: data.pageNumber,
        x: data.x,
        y: data.y,
        width: data.width,
        height: data.height,
        coordinates: data.coordinates,
        content: data.content,
        color: data.color || '#000000',
        createdById: data.createdById,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Update annotation
   */
  async updateAnnotation(consentId: string, annotationId: string, data: any) {
    return await this.prisma.pDFConsentAnnotation.update({
      where: {
        id: annotationId,
        consentId, // Ensure annotation belongs to consent
      },
      data: {
        annotationType: data.annotationType,
        pageNumber: data.pageNumber,
        x: data.x,
        y: data.y,
        width: data.width,
        height: data.height,
        coordinates: data.coordinates,
        content: data.content,
        color: data.color,
        updatedAt: new Date(),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Delete annotation (soft delete)
   */
  async deleteAnnotation(consentId: string, annotationId: string) {
    return await this.prisma.pDFConsentAnnotation.update({
      where: {
        id: annotationId,
        consentId, // Ensure annotation belongs to consent
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}

