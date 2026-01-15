'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { consentService } from '@/services/consent.service';
import { patientService } from '@/services/patient.service';
import { EnhancedPDFViewer } from '@/components/consents/EnhancedPDFViewer';
import { Card } from '@/components/layout/Card';
import { PageHeader } from '@/components/admin/PageHeader';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { ErrorState } from '@/components/admin/ErrorState';
import { FileText, AlertCircle } from 'lucide-react';
import type { PDFConsent } from '@/types/consent';

/**
 * Test PDF Consent Signing Page
 * 
 * Allows admins to test the consent signing experience after uploading a template.
 * Features:
 * - Auto-generates test consent from template
 * - Full-width responsive PDF viewer
 * - Interactive signature field overlays
 * - Real-time signature progress tracking
 * - Professional UX with keyboard shortcuts
 */
export default function TestConsentSigningPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;

  // Get template
  const { data: template, isLoading: isLoadingTemplate } = useQuery({
    queryKey: ['consent', 'template', templateId],
    queryFn: () => consentService.getTemplateById(templateId),
    enabled: !!templateId,
  });

  // Get first patient for testing (or create test patient)
  const { data: patients, isLoading: isLoadingPatients } = useQuery({
    queryKey: ['patients', 'list', 'test'],
    queryFn: () => patientService.getPatients(0, 1),
    enabled: !!templateId,
  });

  // Generate test consent mutation
  const generateConsentMutation = useMutation({
    mutationFn: async (patientId: string) => {
      return consentService.generatePDFConsent({
        templateId,
        patientId,
        placeholderValues: {
          PATIENT_NAME: 'Test Patient',
          DATE: new Date().toLocaleDateString(),
          PROCEDURE_NAME: template?.name || 'Test Procedure',
        },
      });
    },
  });

  // Get the generated consent
  const { data: consent, isLoading: isLoadingConsent, refetch: refetchConsent } = useQuery<PDFConsent>({
    queryKey: ['pdf-consent', 'test', generateConsentMutation.data?.id],
    queryFn: async () => {
      if (!generateConsentMutation.data?.id) return null;
      return consentService.getPDFConsentById(generateConsentMutation.data.id);
    },
    enabled: !!generateConsentMutation.data?.id,
  });

  // Send for signature mutation
  const sendForSignatureMutation = useMutation({
    mutationFn: async () => {
      if (!consent) throw new Error('No consent available');
      return consentService.sendPDFConsentForSignature({
        consentId: consent.id,
        version: consent.version || 1,
      });
    },
    onSuccess: () => {
      // Refresh consent to get updated status
      refetchConsent();
      alert('✅ Consent sent for signature! You can now place signatures on the document.');
    },
    onError: (error: any) => {
      alert(`Failed to send for signature: ${error.response?.data?.message || error.message}`);
    },
  });

  // Auto-generate consent when template and patient are loaded
  useEffect(() => {
    if (template && patients?.data && patients.data.length > 0 && !generateConsentMutation.data && !generateConsentMutation.isPending) {
      const patientId = patients.data[0].id;
      generateConsentMutation.mutate(patientId);
    }
  }, [template, patients, generateConsentMutation.data, generateConsentMutation.isPending]);

  if (isLoadingTemplate || isLoadingPatients) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Test Consent Signing"
          description="Generating test consent from template..."
          backLink="/admin/system-config/consent-templates"
        />
        <Card padding="md">
          <LoadingSpinner />
        </Card>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Test Consent Signing"
          description="Template not found"
          backLink="/admin/system-config/consent-templates"
        />
        <Card padding="md">
          <ErrorState
            title="Template not found"
            message="The consent template could not be found."
            onRetry={() => router.push('/admin/system-config/consent-templates')}
          />
        </Card>
      </div>
    );
  }

  if (!patients?.data || patients.data.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Test Consent Signing"
          description="No patients found"
          backLink="/admin/system-config/consent-templates"
        />
        <Card padding="md">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-900">
                No patients found
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                You need at least one patient to test consent signing. Please create a patient first.
              </p>
              <div className="mt-4">
                <button
                  onClick={() => router.push('/admin/patients/new')}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Create Patient
                </button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (generateConsentMutation.isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Test Consent Signing"
          description="Failed to generate test consent"
          backLink="/admin/system-config/consent-templates"
        />
        <Card padding="md">
          <ErrorState
            title="Failed to generate consent"
            message={
              generateConsentMutation.error instanceof Error
                ? generateConsentMutation.error.message
                : 'An error occurred while generating the test consent.'
            }
            onRetry={() => {
              const patientId = patients.data[0].id;
              generateConsentMutation.mutate(patientId);
            }}
          />
        </Card>
      </div>
    );
  }

  if (isLoadingConsent || !consent) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Test Consent Signing"
          description="Loading test consent..."
          backLink="/admin/system-config/consent-templates"
        />
        <Card padding="md">
          <LoadingSpinner />
        </Card>
      </div>
    );
  }

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    const styles = {
      DRAFT: 'bg-gray-100 text-gray-800 border-gray-300',
      READY_FOR_SIGNATURE: 'bg-blue-100 text-blue-800 border-blue-300',
      PARTIALLY_SIGNED: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      SIGNED: 'bg-green-100 text-green-800 border-green-300',
      REVOKED: 'bg-red-100 text-red-800 border-red-300',
      ARCHIVED: 'bg-gray-100 text-gray-600 border-gray-300',
    };
    return styles[status as keyof typeof styles] || styles.DRAFT;
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-neutral-50 z-50">
      {/* Test Mode Banner */}
      <div className="border-b border-amber-200 bg-amber-50 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-900">Test Mode</p>
              <p className="text-xs text-amber-700">This is a test consent for preview purposes</p>
            </div>
          </div>
          
          {consent && (
            <div className="flex items-center gap-2 pl-4 border-l border-amber-300">
              <span className="text-xs text-amber-700 font-medium">Status:</span>
              <span className={`px-2 py-1 text-xs font-medium rounded border ${getStatusBadge(consent.status)}`}>
                {consent.status.replace(/_/g, ' ')}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {consent?.status === 'DRAFT' && (
            <button
              onClick={() => sendForSignatureMutation.mutate()}
              disabled={sendForSignatureMutation.isPending}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {sendForSignatureMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Sending...
                </>
              ) : (
                <>
                  📝 Send for Signature
                </>
              )}
            </button>
          )}
          <button
            onClick={() => router.push('/admin/system-config/consent-templates')}
            className="px-4 py-1.5 text-sm text-neutral-700 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200"
          >
            ← Back to Templates
          </button>
        </div>
      </div>

      {/* Status Guide */}
      {consent?.status === 'DRAFT' && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-2">
          <div className="flex items-start gap-2">
            <div className="text-blue-600 mt-0.5">ℹ️</div>
            <div className="text-xs text-blue-800">
              <strong>Action Required:</strong> This consent is in <strong>DRAFT</strong> status. Click "Send for Signature" to approve it and enable signature placement.
            </div>
          </div>
        </div>
      )}
      {(consent?.status === 'READY_FOR_SIGNATURE' || consent?.status === 'PARTIALLY_SIGNED') && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-2">
          <div className="flex items-start gap-2">
            <div className="text-green-600 mt-0.5">✅</div>
            <div className="text-xs text-green-800">
              <strong>Ready to Sign:</strong> Use the Sign tool (✍️) in the sidebar to place signatures on the document. Click anywhere on the PDF after selecting a signature.
            </div>
          </div>
        </div>
      )}
      {consent?.status === 'SIGNED' && (
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-2">
          <div className="flex items-start gap-2">
            <div className="text-gray-600 mt-0.5">🔒</div>
            <div className="text-xs text-gray-800">
              <strong>Completed:</strong> This consent is fully signed and locked. No modifications can be made.
            </div>
          </div>
        </div>
      )}

      {/* Enhanced PDF Viewer - Full Screen */}
      <div className="flex-1 overflow-hidden">
        <EnhancedPDFViewer
          consentId={consent.id}
          consent={consent}
          onSignatureComplete={(signature) => {
            console.log('Signature completed:', signature);
            // Refresh consent to update status
            refetchConsent();
          }}
        />
      </div>
    </div>
  );
}

