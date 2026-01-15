import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConsentTemplateUploadService } from '../services/consent-template-upload.service';
import { ConsentRepository } from '../repositories/consent.repository';
import { CreateConsentTemplateDto } from '../dto/create-template.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../modules/auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../../modules/auth/decorators/permissions.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../../modules/auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../../modules/auth/services/identityContext.service';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';

/**
 * Consent Template Controller
 * 
 * System configuration endpoints for managing consent templates.
 * Templates are system-wide configuration, not patient data, so RLS is not required.
 */
@Controller('consent/templates')
@UseGuards(RolesGuard, PermissionsGuard)
@UseInterceptors(DataAccessLogInterceptor)
export class ConsentTemplateController {
  private prisma: PrismaClient;

  constructor(
    private readonly uploadService: ConsentTemplateUploadService,
    private readonly consentRepository: ConsentRepository,
  ) {
    this.prisma = getPrismaClient();
  }

  /**
   * Upload PDF for template creation
   */
  @Post('upload')
  @Roles('ADMIN')
  @Permissions('consent:*:write')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPDF(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: 'application/pdf' }),
        ],
      }),
    )
    file: any,
    @CurrentUser() user: UserIdentity,
  ) {
    const uploadResult = await this.uploadService.uploadPDF(file);

    return {
      success: true,
      filePath: uploadResult.filePath,
      fileHash: uploadResult.fileHash,
      fileName: uploadResult.fileName,
      fileSize: uploadResult.fileSize,
      mimeType: uploadResult.mimeType,
      pageCount: uploadResult.pageCount,
      // Note: extractedText is optional and may not be available
      message: 'PDF uploaded successfully. Use this filePath and fileHash when creating template.',
    };
  }

  /**
   * Create consent template from structured data
   */
  @Post()
  @Roles('ADMIN')
  @Permissions('consent:*:write')
  async createTemplate(
    @Body() dto: CreateConsentTemplateDto,
    @CurrentUser() user: UserIdentity,
  ) {
    // Create template
    const template = await this.prisma.consentTemplate.create({
      data: {
        templateCode: dto.templateCode,
        name: dto.name,
        templateType: dto.templateType,
        description: dto.description,
        procedureCode: dto.procedureCode,
        applicableCPTCodes: dto.applicableCPTCodes || [],
        originalDocumentPath: dto.originalDocumentPath,
        originalDocumentHash: dto.originalDocumentHash,
        isActive: dto.isActive !== false,
        versionNumber: 1,
        version: '1.0.0',
        createdBy: user.id,
      },
    });

    // Create pages
    const pages = await Promise.all(
      dto.pages.map((pageDto) =>
        this.prisma.consentPage.create({
          data: {
            template: { connect: { id: template.id } },
            pageNumber: pageDto.pageNumber,
            title: pageDto.title,
            content: pageDto.content,
            sectionIds: pageDto.sectionIds || [],
            order: pageDto.pageNumber, // Use pageNumber as order
          },
        }),
      ),
    );

    // Create sections
    const sections = await Promise.all(
      dto.sections.map((sectionDto) =>
        this.prisma.consentSection.create({
          data: {
            templateId: template.id,
            sectionCode: sectionDto.sectionCode,
            title: sectionDto.title,
            content: sectionDto.content,
            plainLanguageContent: sectionDto.plainLanguageContent,
            requiresUnderstandingCheck: sectionDto.requiresUnderstandingCheck || false,
            understandingCheckPrompt: sectionDto.understandingCheckPrompt,
            order: sectionDto.order,
          },
        }).then(async (section) => {
          // Create clauses for this section
          if (sectionDto.clauses && sectionDto.clauses.length > 0) {
            await Promise.all(
              sectionDto.clauses.map((clauseDto) =>
                this.prisma.consentClause.create({
                  data: {
                    sectionId: section.id,
                    clauseCode: clauseDto.clauseCode,
                    content: clauseDto.content,
                    order: clauseDto.order,
                  },
                }),
              ),
            );
          }
          return section;
        }),
      ),
    );

    // Create fill-in fields
    if (dto.fillInFields && dto.fillInFields.length > 0) {
      await Promise.all(
        dto.fillInFields.map((fieldDto) =>
          this.prisma.consentFillInField.create({
            data: {
              template: { connect: { id: template.id } },
              ...(fieldDto.sectionId && {
                section: { connect: { id: fieldDto.sectionId } },
              }),
              ...(fieldDto.clauseId && {
                clause: { connect: { id: fieldDto.clauseId } },
              }),
              fieldCode: fieldDto.fieldCode,
              label: fieldDto.label,
              fieldType: fieldDto.fieldType || 'TEXT',
              required: fieldDto.required || false,
              order: fieldDto.order || 0,
              contentMarker: `___${fieldDto.fieldCode}___`, // Default marker format
            },
          }),
        ),
      );
    }

    // Create required parties
    await Promise.all(
      dto.requiredParties.map((partyDto) =>
        this.prisma.consentTemplateRequiredParty.create({
          data: {
            templateId: template.id,
            partyType: partyDto.partyType,
            required: partyDto.required,
            order: partyDto.order || 0,
          },
        }),
      ),
    );

    // Return full template with relations
    return this.prisma.consentTemplate.findUnique({
      where: { id: template.id },
      include: {
        pages: {
          orderBy: { pageNumber: 'asc' },
        },
        sections: {
          include: {
            clauses: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
        fillInFields: {
          orderBy: { order: 'asc' },
        },
        requiredParties: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  /**
   * Get template by ID with full structure
   */
  @Get(':id')
  @Roles('ADMIN', 'NURSE', 'DOCTOR')
  @Permissions('consent:*:read')
  async getTemplate(@Param('id') id: string) {
    return this.prisma.consentTemplate.findUnique({
      where: { id },
      include: {
        pages: {
          orderBy: { pageNumber: 'asc' },
        },
        sections: {
          include: {
            clauses: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
        fillInFields: {
          orderBy: { order: 'asc' },
        },
        requiredParties: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  /**
   * List all templates
   */
  @Get()
  @Roles('ADMIN', 'NURSE', 'DOCTOR')
  @Permissions('consent:*:read')
  async listTemplates() {
    return this.prisma.consentTemplate.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        templateCode: true,
        name: true,
        templateType: true,
        description: true,
        procedureCode: true,
        applicableCPTCodes: true,
        version: true,
        versionNumber: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}

