import { Injectable } from '@nestjs/common';
import { ConsentRepository } from '../repositories/consent.repository';

/**
 * Consent Content Service
 * Handles rendering of consent content with fill-in values
 */
@Injectable()
export class ConsentContentService {
  constructor(private readonly consentRepository: ConsentRepository) {}

  /**
   * Render content with fill-in values replaced
   * Replaces markers like ___FIELD_CODE___ or {{FIELD_CODE}} with actual values
   */
  async renderContentWithFillIns(
    templateContent: string,
    instanceId: string,
  ): Promise<string> {
    // Get all fill-in values for this instance
    const fillInValues = await this.consentRepository.getFillInValues(instanceId);

    // Create a map of fieldCode -> value
    const valueMap = new Map<string, string>();
    fillInValues.forEach((fv) => {
      if (fv.field) {
        valueMap.set(fv.field.fieldCode, fv.value);
      }
    });

    // Replace markers in content
    let renderedContent = templateContent;

    // Replace ___FIELD_CODE___ patterns
    renderedContent = renderedContent.replace(
      /___([A-Z_]+)___/g,
      (match, fieldCode) => {
        return valueMap.get(fieldCode) || match; // Keep original if not found
      },
    );

    // Replace {{FIELD_CODE}} patterns
    renderedContent = renderedContent.replace(
      /\{\{([A-Z_]+)\}\}/g,
      (match, fieldCode) => {
        return valueMap.get(fieldCode) || match;
      },
    );

    return renderedContent;
  }

  /**
   * Generate full document text for snapshot
   * Combines all sections/clauses with fill-ins replaced
   */
  async generateFullDocumentText(instanceId: string): Promise<string> {
    const instance = await this.consentRepository.findInstanceWithFullData(instanceId);

    if (!instance || !instance.template) {
      throw new Error(`Consent instance ${instanceId} not found`);
    }

    const parts: string[] = [];

    // Add template header
    parts.push(`CONSENT FOR: ${instance.template.name}`);
    parts.push(`Template Version: ${instance.templateVersion}`);
    parts.push(`Patient: ${instance.patientId}`);
    parts.push('');

    // Get fill-in values map
    const fillInValues = await this.consentRepository.getFillInValues(instanceId);
    const valueMap = new Map<string, string>();
    fillInValues.forEach((fv) => {
      if (fv.field) {
        valueMap.set(fv.field.fieldCode, fv.value);
      }
    });

    // Render pages in order
    const pages = instance.template.pages || [];
    const sections = instance.template.sections || [];

    if (pages.length > 0) {
      // Render by pages
      for (const page of pages) {
        parts.push(`--- PAGE ${page.pageNumber} ---`);
        if (page.title) {
          parts.push(page.title);
          parts.push('');
        }

        // Render sections on this page
        const pageSectionIds = page.sectionIds || [];
        for (const sectionId of pageSectionIds) {
          const section = sections.find((s) => s.id === sectionId);
          if (section) {
            parts.push(this.renderSection(section, valueMap));
            parts.push('');
          }
        }
      }
    } else {
      // No pages defined, render all sections
      for (const section of sections) {
        parts.push(this.renderSection(section, valueMap));
        parts.push('');
      }
    }

    return parts.join('\n');
  }

  /**
   * Render a section with fill-ins replaced
   */
  private renderSection(
    section: any,
    valueMap: Map<string, string>,
  ): string {
    const parts: string[] = [];

    // Section title
    if (section.title) {
      parts.push(`## ${section.title}`);
    }

    // Section content
    if (section.content) {
      const renderedContent = this.replaceMarkers(section.content, valueMap);
      parts.push(renderedContent);
    }

    // Clauses
    if (section.clauses && section.clauses.length > 0) {
      for (const clause of section.clauses) {
        if (clause.content) {
          const renderedClause = this.replaceMarkers(clause.content, valueMap);
          parts.push(`${clause.order}. ${renderedClause}`);
        }
      }
    }

    return parts.join('\n\n');
  }

  /**
   * Replace fill-in markers in text
   */
  private replaceMarkers(content: string, valueMap: Map<string, string>): string {
    let rendered = content;

    // Replace ___FIELD_CODE___ patterns
    rendered = rendered.replace(/___([A-Z_]+)___/g, (match, fieldCode) => {
      return valueMap.get(fieldCode) || match;
    });

    // Replace {{FIELD_CODE}} patterns
    rendered = rendered.replace(/\{\{([A-Z_]+)\}\}/g, (match, fieldCode) => {
      return valueMap.get(fieldCode) || match;
    });

    return rendered;
  }
}









