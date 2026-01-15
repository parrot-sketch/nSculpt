import apiClient from './apiClient';
import { getApiUrl } from '@/lib/env';
import type {
  ConsentTemplate,
  PatientConsentInstance,
  CreateConsentInstanceDto,
  AcknowledgeConsentSectionDto,
  SignConsentDto,
  ConsentSection,
  ConsentSignature,
  PDFConsentAnnotation,
  CreateAnnotationDto,
  UpdateAnnotationDto,
} from '@/types/consent';

/**
 * Consent Service
 * Handles all consent-related API calls
 */
export const consentService = {
  /**
   * Get all consent templates
   */
  async getTemplates(procedureCode?: string): Promise<ConsentTemplate[]> {
    const response = await apiClient.get<{ data: ConsentTemplate[] }>(
      getApiUrl('/consent/templates'),
      {
        params: procedureCode ? { procedureCode } : {},
      }
    );
    return response.data.data;
  },

  /**
   * List all consent templates (alias for getTemplates, used by admin pages)
   */
  async listTemplates(): Promise<ConsentTemplate[]> {
    const response = await apiClient.get<ConsentTemplate[]>(
      getApiUrl('/consent/templates')
    );
    return Array.isArray(response.data) ? response.data : response.data.data || [];
  },

  /**
   * Get consent template by ID
   */
  async getTemplateById(id: string): Promise<ConsentTemplate> {
    const response = await apiClient.get<ConsentTemplate>(
      getApiUrl(`/consent/templates/${id}`)
    );
    return response.data;
  },

  /**
   * Find consent template by CPT code
   */
  async findTemplateByCPTCode(cptCode: string): Promise<ConsentTemplate | null> {
    try {
      const templates = await this.getTemplates(cptCode);
      return templates.find(
        (t) =>
          t.procedureCode === cptCode ||
          t.applicableCPTCodes.includes(cptCode)
      ) || null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Get all consent instances for a patient
   */
  async getInstancesByPatient(patientId: string): Promise<PatientConsentInstance[]> {
    const response = await apiClient.get<{ data: PatientConsentInstance[] }>(
      getApiUrl('/consent/instances'),
      {
        params: { patientId },
      }
    );
    return response.data.data;
  },

  /**
   * Get consent instance by ID
   */
  async getInstanceById(id: string): Promise<PatientConsentInstance> {
    const response = await apiClient.get<PatientConsentInstance>(
      getApiUrl(`/consent/instances/${id}`)
    );
    return response.data;
  },

  /**
   * Create new consent instance
   */
  async createInstance(data: CreateConsentInstanceDto): Promise<PatientConsentInstance> {
    const response = await apiClient.post<PatientConsentInstance>(
      getApiUrl('/consent/instances'),
      data
    );
    return response.data;
  },

  /**
   * Acknowledge consent section/clause
   */
  async acknowledgeSection(data: AcknowledgeConsentSectionDto): Promise<void> {
    await apiClient.post(
      getApiUrl(`/consent/instances/${data.instanceId}/acknowledge`),
      data
    );
  },

  /**
   * Sign consent (for a specific party)
   */
  async signConsent(data: SignConsentDto): Promise<ConsentSignature> {
    const response = await apiClient.post<ConsentSignature>(
      getApiUrl(`/consent/instances/${data.instanceId}/sign`),
      data
    );
    return response.data;
  },

  /**
   * Get consent sections with acknowledgments
   */
  async getSectionsWithAcknowledgments(
    instanceId: string
  ): Promise<ConsentSection[]> {
    const response = await apiClient.get<{ data: ConsentSection[] }>(
      getApiUrl(`/consent/instances/${instanceId}/sections`)
    );
    return response.data.data;
  },

  /**
   * Download consent artifact (signed PDF)
   */
  async downloadArtifact(instanceId: string): Promise<Blob> {
    const response = await apiClient.get(
      getApiUrl(`/consent/instances/${instanceId}/artifact`),
      {
        responseType: 'blob',
      }
    );
    return response.data;
  },

  /**
   * Revoke consent
   */
  async revokeConsent(instanceId: string, reason: string): Promise<void> {
    await apiClient.post(
      getApiUrl(`/consent/instances/${instanceId}/revoke`),
      { reason }
    );
  },

  // ============================================================================
  // Template Management (Admin)
  // ============================================================================

  /**
   * Upload PDF for template creation
   */
  async uploadTemplatePDF(file: File): Promise<{
    filePath: string;
    fileHash: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<{
      success: boolean;
      filePath: string;
      fileHash: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
    }>(getApiUrl('/consent/templates/upload'), formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Create consent template
   */
  async createTemplate(data: any): Promise<ConsentTemplate> {
    const response = await apiClient.post<ConsentTemplate>(
      getApiUrl('/consent/templates'),
      data
    );
    return response.data;
  },

  /**
   * Create PDF consent template (simplified workflow)
   * Uploads PDF and creates template in one step
   */
  async createPDFTemplate(
    file: File,
    data: { name: string; description?: string }
  ): Promise<ConsentTemplate> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', data.name);
    if (data.description) {
      formData.append('description', data.description);
    }

    const response = await apiClient.post<ConsentTemplate>(
      getApiUrl('/consents/templates'),
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  /**
   * Get template by ID with full structure
   */
  async getTemplateWithStructure(id: string): Promise<ConsentTemplate> {
    const response = await apiClient.get<ConsentTemplate>(
      getApiUrl(`/consent/templates/${id}`)
    );
    return response.data;
  },

  /**
   * List all templates
   */
  async listTemplates(): Promise<ConsentTemplate[]> {
    const response = await apiClient.get<ConsentTemplate[]>(
      getApiUrl('/consent/templates')
    );
    return response.data;
  },

  /**
   * Find template by CPT code
   */
  async findTemplateByCPTCode(cptCode: string): Promise<ConsentTemplate | null> {
    try {
      const response = await apiClient.get<ConsentTemplate>(
        getApiUrl(`/consent/templates/by-cpt/${cptCode}`)
      );
      return response.data;
    } catch (error) {
      return null;
    }
  },

  // ============================================================================
  // Instance Management (Enhanced)
  // ============================================================================

  /**
   * Get instance with full data
   */
  async getInstanceWithFullData(id: string): Promise<PatientConsentInstance> {
    const response = await apiClient.get<PatientConsentInstance>(
      getApiUrl(`/consent/instances/${id}/full`)
    );
    return response.data;
  },

  /**
   * Get fill-in values
   */
  async getFillInValues(instanceId: string): Promise<any[]> {
    const response = await apiClient.get<any[]>(
      getApiUrl(`/consent/instances/${instanceId}/fill-in-values`)
    );
    return response.data;
  },

  /**
   * Set fill-in value
   */
  async setFillInValue(
    instanceId: string,
    fieldId: string,
    value: string
  ): Promise<void> {
    await apiClient.post(
      getApiUrl(`/consent/instances/${instanceId}/fill-in-values/${fieldId}`),
      { value }
    );
  },

  /**
   * Get page content
   */
  async getPageContent(instanceId: string, pageId: string): Promise<any> {
    const response = await apiClient.get<any>(
      getApiUrl(`/consent/instances/${instanceId}/pages/${pageId}`)
    );
    return response.data;
  },

  /**
   * Acknowledge page
   */
  async acknowledgePage(
    instanceId: string,
    pageId: string,
    data: {
      initialsData?: string;
      timeSpentSeconds?: number;
      scrollDepth?: number;
    }
  ): Promise<void> {
    await apiClient.post(
      getApiUrl(`/consent/instances/${instanceId}/pages/${pageId}/acknowledge`),
      data
    );
  },

  /**
   * Get signatures
   */
  async getSignatures(instanceId: string): Promise<ConsentSignature[]> {
    const response = await apiClient.get<ConsentSignature[]>(
      getApiUrl(`/consent/instances/${instanceId}/signatures`)
    );
    return response.data;
  },

  // ============================================================================
  // PDF Consent Methods (for PDF-based consent workflow)
  // ============================================================================

  /**
   * Get PDF consent by ID
   */
  async getPDFConsentById(id: string): Promise<import('@/types/consent').PDFConsent> {
    const response = await apiClient.get<import('@/types/consent').PDFConsent>(
      getApiUrl(`/consents/${id}`)
    );
    return response.data;
  },

  /**
   * Generate PDF consent
   */
  async generatePDFConsent(
    data: import('@/types/consent').GeneratePDFConsentDto
  ): Promise<import('@/types/consent').PDFConsent> {
    const response = await apiClient.post<import('@/types/consent').PDFConsent>(
      getApiUrl('/consents/generate'),
      data
    );
    return response.data;
  },

  /**
   * Send PDF consent for signature
   */
  async sendPDFConsentForSignature(
    data: import('@/types/consent').SendForSignatureDto
  ): Promise<import('@/types/consent').PDFConsent> {
    const response = await apiClient.post<import('@/types/consent').PDFConsent>(
      getApiUrl(`/consents/${data.consentId}/send-for-signature`),
      data
    );
    return response.data;
  },

  /**
   * Sign PDF consent
   */
  async signPDFConsent(
    consentId: string,
    data: import('@/types/consent').SignPDFConsentDto
  ): Promise<import('@/types/consent').PDFConsent> {
    const response = await apiClient.post<import('@/types/consent').PDFConsent>(
      getApiUrl(`/consents/${consentId}/sign`),
      data
    );
    return response.data;
  },

  /**
   * Revoke PDF consent
   */
  async revokePDFConsent(
    data: import('@/types/consent').RevokePDFConsentDto
  ): Promise<import('@/types/consent').PDFConsent> {
    const response = await apiClient.post<import('@/types/consent').PDFConsent>(
      getApiUrl(`/consents/${data.consentId}/revoke`),
      data
    );
    return response.data;
  },

  /**
   * Archive PDF consent
   */
  async archivePDFConsent(
    data: import('@/types/consent').ArchivePDFConsentDto
  ): Promise<import('@/types/consent').PDFConsent> {
    const response = await apiClient.post<import('@/types/consent').PDFConsent>(
      getApiUrl(`/consents/${data.consentId}/archive`),
      data
    );
    return response.data;
  },

  /**
   * Download PDF consent
   */
  async downloadPDFConsent(consentId: string): Promise<Blob> {
    const response = await apiClient.get(
      getApiUrl(`/consents/${consentId}/download`),
      {
        responseType: 'blob',
      }
    );
    return response.data;
  },

  /**
   * Get PDF consent templates
   */
  async getPDFConsentTemplates(): Promise<import('@/types/consent').PDFConsentTemplate[]> {
    const response = await apiClient.get<import('@/types/consent').PDFConsentTemplate[]>(
      getApiUrl('/consents/templates')
    );
    return Array.isArray(response.data) ? response.data : response.data.data || [];
  },

  // ============================================================================
  // PDF Annotation Methods
  // ============================================================================

  /**
   * Get all annotations for a PDF consent
   */
  async getPDFConsentAnnotations(consentId: string): Promise<PDFConsentAnnotation[]> {
    const response = await apiClient.get<PDFConsentAnnotation[]>(
      getApiUrl(`/consents/${consentId}/annotations`)
    );
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Get a specific annotation by ID
   */
  async getPDFConsentAnnotationById(
    consentId: string,
    annotationId: string
  ): Promise<PDFConsentAnnotation> {
    const response = await apiClient.get<PDFConsentAnnotation>(
      getApiUrl(`/consents/${consentId}/annotations/${annotationId}`)
    );
    return response.data;
  },

  /**
   * Create a new annotation
   */
  async createPDFConsentAnnotation(
    consentId: string,
    data: CreateAnnotationDto
  ): Promise<PDFConsentAnnotation> {
    const response = await apiClient.post<PDFConsentAnnotation>(
      getApiUrl(`/consents/${consentId}/annotations`),
      data
    );
    return response.data;
  },

  /**
   * Update an annotation
   */
  async updatePDFConsentAnnotation(
    consentId: string,
    annotationId: string,
    data: UpdateAnnotationDto
  ): Promise<PDFConsentAnnotation> {
    const response = await apiClient.put<PDFConsentAnnotation>(
      getApiUrl(`/consents/${consentId}/annotations/${annotationId}`),
      data
    );
    return response.data;
  },

  /**
   * Delete an annotation (soft delete)
   */
  async deletePDFConsentAnnotation(
    consentId: string,
    annotationId: string
  ): Promise<void> {
    await apiClient.delete(
      getApiUrl(`/consents/${consentId}/annotations/${annotationId}`)
    );
  },
};

