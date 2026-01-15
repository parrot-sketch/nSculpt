import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PDFConsentRepository } from '../repositories/pdf-consent.repository';
import { PDFProcessingService } from './pdf-processing.service';
import { CreatePDFTemplateDto } from '../dto/create-pdf-template.dto';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { ConsentEventType } from '../events/consent.events';
import { Domain } from '@prisma/client';

@Injectable()
export class PDFConsentTemplateService {
  private readonly logger = new Logger(PDFConsentTemplateService.name);

  constructor(
    private readonly repository: PDFConsentRepository,
    private readonly pdfProcessing: PDFProcessingService,
    private readonly domainEventService: DomainEventService,
    private readonly correlationService: CorrelationService,
  ) {}

  /**
   * Create a PDF consent template
   * Admin uploads PDF and system parses placeholders
   */
  async createTemplate(
    dto: CreatePDFTemplateDto,
    userId: string,
    pdfBuffer?: Buffer,
  ) {
    let placeholders: string[] = dto.placeholders || [];

    // If PDF buffer provided, parse placeholders from it
    if (pdfBuffer) {
      try {
        const parsedPlaceholders = await this.pdfProcessing.parsePlaceholders(pdfBuffer);
        // Merge with provided placeholders
        placeholders = Array.from(new Set([...placeholders, ...parsedPlaceholders]));
      } catch (error) {
        throw new BadRequestException(`Failed to parse PDF placeholders: ${error.message}`);
      }
    }

    // Save PDF file if buffer provided
    let fileUrl = dto.fileUrl;
    if (pdfBuffer && !fileUrl) {
      // Generate unique filename with template name (sanitized)
      const sanitizedName = (dto.name || 'template')
        .replace(/[^a-zA-Z0-9-_]/g, '-')
        .toLowerCase()
        .substring(0, 50);
      const filename = `template-${sanitizedName}-${Date.now()}`;
      const filePath = await this.pdfProcessing.savePDF(pdfBuffer, filename);
      fileUrl = this.pdfProcessing.getFileUrl(filePath);
      
      // Log for debugging
      this.logger.log(`PDF template saved: ${filePath}, URL: ${fileUrl}`);
    }
    
    if (!fileUrl) {
      throw new BadRequestException('PDF file is required. Please upload a PDF file.');
    }

    // Create template
    const template = await this.repository.createTemplate({
      ...dto,
      placeholders,
      fileUrl,
      createdBy: userId,
    });

    // Verify fileUrl was saved
    if (!template.fileUrl) {
      this.logger.error(`Template ${template.id} created but fileUrl is missing! Saved fileUrl: ${fileUrl}`);
      throw new BadRequestException('Failed to save PDF file URL to template. Please try again.');
    }

    this.logger.log(`Template ${template.id} created successfully with fileUrl: ${template.fileUrl}`);

    // Emit event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'ConsentTemplate.Created',
      domain: Domain.CONSENT,
      aggregateId: template.id,
      aggregateType: 'ConsentTemplate',
      payload: {
        templateId: template.id,
        name: template.name,
        placeholders,
        fileUrl: template.fileUrl,
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return template;
  }

  /**
   * Get all templates
   */
  async findAll(activeOnly: boolean = true) {
    return await this.repository.findAllTemplates(activeOnly);
  }

  /**
   * Get template by ID
   */
  async findOne(id: string) {
    const template = await this.repository.findTemplateById(id);
    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
    return template;
  }

  /**
   * Update template
   */
  async update(id: string, dto: Partial<CreatePDFTemplateDto>, userId: string) {
    const template = await this.findOne(id);
    
    return await this.repository.updateTemplate(id, dto);
  }

  /**
   * Deactivate template
   */
  async deactivate(id: string, userId: string) {
    const template = await this.findOne(id);
    
    return await this.repository.updateTemplate(id, { active: false });
  }
}





