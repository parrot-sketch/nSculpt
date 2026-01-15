import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { CreateConsentDto } from '../dto/create-consent.dto';
import { UpdateConsentDto } from '../dto/update-consent.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ConsentRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  async createInstance(data: CreateConsentDto & { createdBy?: string }) {
    // Get template to capture version
    const template = await this.prisma.consentTemplate.findUnique({
      where: { id: data.templateId },
    });

    if (!template) {
      throw new Error(`Consent template ${data.templateId} not found`);
    }

    const instanceNumber = `CONSENT-${Date.now()}-${uuidv4().substring(0, 8)}`;

    return await this.prisma.patientConsentInstance.create({
      data: {
        instanceNumber,
        templateId: data.templateId,
        templateVersion: template.version,
        patientId: data.patientId,
        consultationId: data.consultationId,
        procedurePlanId: data.procedurePlanId,
        relatedCaseId: data.relatedCaseId,
        relatedRecordId: data.relatedRecordId,
        presentedBy: data.presentedBy,
        language: data.language || 'en',
        notes: data.notes,
        status: 'DRAFT',
        createdBy: data.createdBy,
      },
    });
  }

  async findInstanceById(id: string) {
    return await this.prisma.patientConsentInstance.findUnique({
      where: { id },
      include: {
        template: {
          include: {
            sections: {
              include: {
                clauses: true,
              },
            },
          },
        },
        acknowledgments: true,
        artifacts: true,
      },
    });
  }

  async updateInstance(id: string, data: UpdateConsentDto) {
    const updateData: any = {};
    if (data.status) updateData.status = data.status;
    if (data.status === 'SIGNED') updateData.signedAt = new Date();
    if (data.status === 'REVOKED') updateData.revokedAt = new Date();
    if (data.allSectionsAcknowledged !== undefined) updateData.allSectionsAcknowledged = data.allSectionsAcknowledged;
    if (data.understandingChecksPassed !== undefined) updateData.understandingChecksPassed = data.understandingChecksPassed;
    
    return await this.prisma.patientConsentInstance.update({
      where: { id },
      data: updateData,
    });
  }

  async setRevocationEvent(id: string, revocationEventId: string) {
    return await this.prisma.patientConsentInstance.update({
      where: { id },
      data: {
        revocationEventId,
      },
    });
  }

  async createAcknowledgement(data: {
    instanceId: string;
    sectionId?: string;
    clauseId?: string;
    acknowledgedBy: string;
    acknowledged: boolean;
    declinedReason?: string;
    ipAddress?: string;
    userAgent?: string;
    signatureHash?: string;
    understandingCheckPassed?: boolean;
    understandingResponse?: string;
    discussionRequired?: boolean;
    discussionCompleted?: boolean;
    discussedWith?: string;
    timeSpentSeconds?: number;
    scrollDepth?: number;
  }) {
    // Get clause content if clauseId provided
    let clauseContent: string | undefined;
    if (data.clauseId) {
      const clause = await this.prisma.consentClause.findUnique({
        where: { id: data.clauseId },
      });
      clauseContent = clause?.content;
    }

    // Get section code if sectionId provided
    let sectionCode: string | undefined;
    if (data.sectionId) {
      const section = await this.prisma.consentSection.findUnique({
        where: { id: data.sectionId },
      });
      sectionCode = section?.sectionCode;
    }

    return await this.prisma.patientConsentAcknowledgement.create({
      data: {
        instanceId: data.instanceId,
        sectionId: data.sectionId,
        clauseId: data.clauseId,
        acknowledgedBy: data.acknowledgedBy,
        acknowledged: data.acknowledged,
        declinedReason: data.declinedReason,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        signatureHash: data.signatureHash,
        sectionCode,
        clauseContent,
        understandingCheckPassed: data.understandingCheckPassed || false,
        understandingResponse: data.understandingResponse,
        discussionRequired: data.discussionRequired || false,
        discussionCompleted: data.discussionCompleted || false,
        discussedWith: data.discussedWith,
        timeSpentSeconds: data.timeSpentSeconds,
        scrollDepth: data.scrollDepth,
      },
    });
  }

  async findAllInstances(skip?: number, take?: number) {
    return await this.prisma.patientConsentInstance.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        template: true,
      },
    });
  }

  async findAllFiltered(skip?: number, take?: number, userId?: string) {
    if (!userId) {
      return [];
    }

    // Find patients user has access to via surgical cases
    const cases = await this.prisma.surgicalCase.findMany({
      where: {
        OR: [
          { primarySurgeonId: userId },
          {
            resourceAllocations: {
              some: {
                resourceType: 'STAFF',
                resourceId: userId,
                status: 'ALLOCATED',
              },
            },
          },
        ],
      },
      select: {
        patientId: true,
      },
      distinct: ['patientId'],
    });

    const patientIds = cases.map((c) => c.patientId);

    if (patientIds.length === 0) {
      return [];
    }

    return await this.prisma.patientConsentInstance.findMany({
      where: {
        patientId: { in: patientIds },
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        template: true,
      },
    });
  }

  // ============================================================================
  // Fill-in Fields Methods
  // ============================================================================

  async createFillInValue(data: {
    instanceId: string;
    fieldId: string;
    value: string;
    filledBy: string;
  }) {
    return await this.prisma.consentFillInValue.upsert({
      where: {
        instanceId_fieldId: {
          instanceId: data.instanceId,
          fieldId: data.fieldId,
        },
      },
      create: data,
      update: {
        value: data.value,
        filledBy: data.filledBy,
        filledAt: new Date(),
      },
    });
  }

  async getFillInValues(instanceId: string) {
    return await this.prisma.consentFillInValue.findMany({
      where: { instanceId },
      include: {
        field: true,
      },
    });
  }

  async getFillInFieldsByTemplate(templateId: string) {
    return await this.prisma.consentFillInField.findMany({
      where: {
        OR: [
          { templateId },
          { section: { templateId } },
          { clause: { section: { templateId } } },
        ],
      },
      orderBy: { order: 'asc' },
    });
  }

  // ============================================================================
  // Structured Data Methods
  // ============================================================================

  async createOrUpdateStructuredData(data: {
    instanceId: string;
    dataType: string;
    schema: string;
    data: string;
    createdBy: string;
  }) {
    return await this.prisma.consentStructuredData.upsert({
      where: {
        instanceId_dataType: {
          instanceId: data.instanceId,
          dataType: data.dataType,
        },
      },
      create: data,
      update: {
        schema: data.schema,
        data: data.data,
        updatedBy: data.createdBy,
        updatedAt: new Date(),
        version: { increment: 1 },
      },
    });
  }

  async getStructuredData(instanceId: string, dataType?: string) {
    return await this.prisma.consentStructuredData.findMany({
      where: {
        instanceId,
        ...(dataType ? { dataType } : {}),
      },
    });
  }

  // ============================================================================
  // Page Methods
  // ============================================================================

  async getPagesByTemplate(templateId: string) {
    return await this.prisma.consentPage.findMany({
      where: { templateId },
      orderBy: { pageNumber: 'asc' },
    });
  }

  async getPageById(pageId: string) {
    return await this.prisma.consentPage.findUnique({
      where: { id: pageId },
      include: {
        template: true,
      },
    });
  }

  async createPageAcknowledgement(data: {
    instanceId: string;
    pageId: string;
    acknowledgedBy: string;
    initialsData?: string;
    timeSpentSeconds?: number;
    scrollDepth?: number;
    ipAddress?: string;
    userAgent?: string;
    deviceType?: string;
  }) {
    return await this.prisma.consentPageAcknowledgement.upsert({
      where: {
        instanceId_pageId: {
          instanceId: data.instanceId,
          pageId: data.pageId,
        },
      },
      create: data,
      update: {
        initialsData: data.initialsData,
        timeSpentSeconds: data.timeSpentSeconds,
        scrollDepth: data.scrollDepth,
        acknowledgedAt: new Date(),
      },
    });
  }

  async getPageAcknowledgements(instanceId: string) {
    return await this.prisma.consentPageAcknowledgement.findMany({
      where: { instanceId },
      include: {
        page: true,
      },
    });
  }

  // ============================================================================
  // Template Methods
  // ============================================================================

  async findTemplateByCPTCode(cptCode: string) {
    return await this.prisma.consentTemplate.findFirst({
      where: {
        isActive: true,
        OR: [
          { procedureCode: cptCode },
          { applicableCPTCodes: { has: cptCode } },
        ],
        AND: [
          {
            OR: [
              { effectiveUntil: null },
              { effectiveUntil: { gte: new Date() } },
            ],
          },
        ],
      },
      include: {
        sections: {
          include: {
            clauses: true,
          },
          orderBy: { order: 'asc' },
        },
        pages: {
          orderBy: { pageNumber: 'asc' },
        },
        fillInFields: {
          orderBy: { order: 'asc' },
        },
        requiredParties: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { versionNumber: 'desc' },
    });
  }

  async findInstanceWithFullData(id: string) {
    return await this.prisma.patientConsentInstance.findUnique({
      where: { id },
      include: {
        template: {
          include: {
            sections: {
              include: {
                clauses: true,
              },
              orderBy: { order: 'asc' },
            },
            pages: {
              orderBy: { pageNumber: 'asc' },
            },
            fillInFields: true,
            requiredParties: {
              orderBy: { order: 'asc' },
            },
          },
        },
        fillInValues: {
          include: {
            field: true,
          },
        },
        structuredData: true,
        pageAcknowledgments: {
          include: {
            page: true,
          },
        },
        signatures: {
          orderBy: { signedAt: 'asc' },
        },
        acknowledgments: {
          include: {
            section: true,
            clause: true,
          },
        },
        documentSnapshot: true,
      },
    });
  }

  // ============================================================================
  // Signature Methods
  // ============================================================================

  async createSignature(data: {
    instanceId: string;
    partyType: string;
    signedBy: string;
    signatureMethod: string;
    signatureData?: string;
    ipAddress?: string;
    userAgent?: string;
    deviceType?: string;
    signatureHash?: string;
    guardianRelationship?: string;
    guardianConsentFor?: string;
    notes?: string;
  }) {
    return await this.prisma.consentSignature.create({
      data: {
        ...data,
        signedAt: new Date(),
      },
    });
  }

  async getSignatures(instanceId: string) {
    return await this.prisma.consentSignature.findMany({
      where: { instanceId },
      orderBy: { signedAt: 'asc' },
    });
  }

  // ============================================================================
  // Document Snapshot Methods
  // ============================================================================

  async createDocumentSnapshot(data: {
    instanceId: string;
    templateId: string;
    fullDocumentText: string;
    sectionSnapshots?: any;
    templateVersion: string;
    templateVersionNumber: number;
  }) {
    return await this.prisma.consentDocumentSnapshot.create({
      data,
    });
  }

  async getDocumentSnapshot(instanceId: string) {
    return await this.prisma.consentDocumentSnapshot.findUnique({
      where: { instanceId },
      include: {
        template: true,
        instance: true,
      },
    });
  }
}

