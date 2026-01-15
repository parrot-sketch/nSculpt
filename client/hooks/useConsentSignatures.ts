import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  PDFConsent,
  PDFConsentSignature,
  PDFSignerType,
} from '@/types/consent';

// ============================================================================
// TYPES
// ============================================================================

export interface SignatureField {
  id: string;
  signerType: PDFSignerType;
  signerName?: string;
  required: boolean;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  signed: boolean;
  signedAt?: string;
  signedBy?: string;
  signatureId?: string;
}

export interface SignatureProgress {
  total: number;
  signed: number;
  pending: number;
  percentComplete: number;
  canFinalize: boolean;
}

interface SignatureData {
  signerType: PDFSignerType;
  signerName: string;
  signatureData: string; // Base64 or URL
  signatureMethod: 'DRAW' | 'TYPE' | 'UPLOAD';
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================================================
// HOOK: useConsentSignatures
// ============================================================================

/**
 * Custom hook for managing consent signatures
 * 
 * Handles:
 * - Fetching existing signatures
 * - Building signature fields from template
 * - Tracking signature progress
 * - Validating signature requirements
 * - Submitting new signatures
 * 
 * @param consentId - The consent document ID
 * @param consent - The consent object
 */
export function useConsentSignatures(consentId: string, consent: PDFConsent) {
  const queryClient = useQueryClient();

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  // Fetch existing signatures
  const {
    data: signatures = [],
    isLoading,
    error,
    refetch,
  } = useQuery<PDFConsentSignature[]>({
    queryKey: ['pdf-consent-signatures', consentId],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL_BROWSER || 'http://localhost:3002/api/v1'}/consents/${consentId}/signatures`,
        {
          credentials: 'include',
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch signatures');
      }
      
      return response.json();
    },
    enabled: !!consentId,
    staleTime: 30000, // 30 seconds
  });

  // Fetch signature fields from template (TODO: Backend endpoint)
  const { data: templateFields = [] } = useQuery<Omit<SignatureField, 'signed' | 'signedAt' | 'signedBy'>[]>({
    queryKey: ['consent-template-signature-fields', consent.templateId],
    queryFn: async () => {
      // TODO: Implement backend endpoint
      // For now, return mock data based on consent type
      return [
        {
          id: 'field-patient-1',
          signerType: 'PATIENT',
          required: true,
          pageNumber: 15,
          x: 50,
          y: 700,
          width: 200,
          height: 60,
        },
        {
          id: 'field-doctor-1',
          signerType: 'DOCTOR',
          required: true,
          pageNumber: 15,
          x: 350,
          y: 700,
          width: 200,
          height: 60,
        },
      ];
    },
    enabled: !!consent.templateId,
    staleTime: 300000, // 5 minutes - template fields don't change often
  });

  // ============================================================================
  // SIGNATURE MUTATION
  // ============================================================================

  const signatureMutation = useMutation({
    mutationFn: async (data: SignatureData) => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL_BROWSER || 'http://localhost:3002/api/v1'}/consents/${consentId}/signatures`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save signature');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['pdf-consent-signatures', consentId] });
      queryClient.invalidateQueries({ queryKey: ['pdf-consents', consentId] });
    },
  });

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  // Build signature fields with current status
  const signatureFields: SignatureField[] = useMemo(() => {
    return templateFields.map(field => {
      const existingSignature = signatures.find(
        sig =>
          sig.signerType === field.signerType &&
          sig.pageNumber === field.pageNumber &&
          Math.abs((sig.x || 0) - field.x) < 10 && // Fuzzy match position
          Math.abs((sig.y || 0) - field.y) < 10
      );

      return {
        ...field,
        signed: !!existingSignature,
        signedAt: existingSignature?.signedAt,
        signedBy: existingSignature?.signerName,
        signatureId: existingSignature?.id,
      };
    });
  }, [templateFields, signatures]);

  // Calculate signature progress
  const progress: SignatureProgress = useMemo(() => {
    const requiredFields = signatureFields.filter(f => f.required);
    const signedRequired = requiredFields.filter(f => f.signed);
    const total = requiredFields.length;
    const signed = signedRequired.length;
    const pending = total - signed;
    const percentComplete = total > 0 ? (signed / total) * 100 : 0;
    const canFinalize = pending === 0;

    return {
      total,
      signed,
      pending,
      percentComplete,
      canFinalize,
    };
  }, [signatureFields]);

  // ============================================================================
  // VALIDATION
  // ============================================================================

  /**
   * Validate if a field can be signed
   */
  const canSignField = useCallback(
    (field: SignatureField): { canSign: boolean; reason?: string } => {
      // Already signed
      if (field.signed) {
        return { canSign: false, reason: 'Field is already signed' };
      }

      // Consent is locked
      if (consent.lockedAt) {
        return { canSign: false, reason: 'Document is locked' };
      }

      // Consent status doesn't allow signing
      const allowedStatuses: PDFConsent['status'][] = [
        'DRAFT',
        'READY_FOR_SIGNATURE',
        'PARTIALLY_SIGNED',
      ];
      if (!allowedStatuses.includes(consent.status)) {
        return { canSign: false, reason: `Cannot sign in status: ${consent.status}` };
      }

      // TODO: Add role-based validation
      // e.g., only doctors can sign doctor fields

      return { canSign: true };
    },
    [consent]
  );

  /**
   * Validate if consent can be finalized
   */
  const canFinalize = useCallback((): { canFinalize: boolean; reason?: string } => {
    if (!progress.canFinalize) {
      return {
        canFinalize: false,
        reason: `${progress.pending} signature(s) still required`,
      };
    }

    if (consent.status === 'SIGNED') {
      return {
        canFinalize: false,
        reason: 'Document is already finalized',
      };
    }

    return { canFinalize: true };
  }, [progress, consent.status]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Submit a signature for a field
   */
  const submitSignature = useCallback(
    async (field: SignatureField, signatureData: Omit<SignatureData, 'pageNumber' | 'x' | 'y' | 'width' | 'height'>) => {
      const validation = canSignField(field);
      if (!validation.canSign) {
        throw new Error(validation.reason);
      }

      return signatureMutation.mutateAsync({
        ...signatureData,
        pageNumber: field.pageNumber,
        x: field.x,
        y: field.y,
        width: field.width,
        height: field.height,
      });
    },
    [canSignField, signatureMutation]
  );

  /**
   * Get signature fields for a specific page
   */
  const getFieldsForPage = useCallback(
    (pageNumber: number) => {
      return signatureFields.filter(f => f.pageNumber === pageNumber);
    },
    [signatureFields]
  );

  /**
   * Get next unsigned field
   */
  const getNextUnsignedField = useCallback((): SignatureField | null => {
    return signatureFields.find(f => f.required && !f.signed) || null;
  }, [signatureFields]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Data
    signatureFields,
    signatures,
    progress,
    
    // State
    isLoading,
    error,
    isSubmitting: signatureMutation.isPending,
    
    // Validation
    canSignField,
    canFinalize,
    
    // Actions
    submitSignature,
    refetch,
    getFieldsForPage,
    getNextUnsignedField,
  };
}





