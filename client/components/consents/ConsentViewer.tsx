'use client';

import { useQuery } from '@tanstack/react-query';
import { consentService } from '@/services/consent.service';
import { ConsentStatusBadge } from './ConsentStatusBadge';
import { ConsentActions } from './ConsentActions';
import { SignaturePanel } from './SignaturePanel';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { Card } from '@/components/layout/Card';
import { usePermissions } from '@/hooks/usePermissions';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { mapConsentError } from '@/lib/consent-errors';
import { useState } from 'react';
import {
  FileText,
  Calendar,
  User,
  Clock,
  Download,
  X,
} from 'lucide-react';
import type { PDFConsent, SignPDFConsentDto } from '@/types/consent';

interface ConsentViewerProps {
  consentId: string;
  patientId: string;
  onClose?: () => void;
}

export function ConsentViewer({
  consentId,
  patientId,
  onClose,
}: ConsentViewerProps) {
  const [showSignaturePanel, setShowSignaturePanel] = useState(false);
  const queryClient = useQueryClient();
  const { roles } = usePermissions();
  const isFrontDesk = roles.includes('FRONT_DESK');

  const { data: consent, isLoading, error } = useQuery({
    queryKey: ['pdf-consent', consentId],
    queryFn: () => consentService.getPDFConsentById(consentId),
    enabled: !!consentId,
  });

  const signMutation = useMutation({
    mutationFn: (data: SignPDFConsentDto) =>
      consentService.signPDFConsent(consentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdf-consent', consentId] });
      queryClient.invalidateQueries({ queryKey: ['patient-consents', patientId] });
      setShowSignaturePanel(false);
    },
    onError: (error: any) => {
      const mappedError = mapConsentError(error);
      alert(mappedError.message);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (reason: string) =>
      consentService.revokePDFConsent({
        consentId,
        reason,
        version: consent?.version || 1,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdf-consent', consentId] });
      queryClient.invalidateQueries({ queryKey: ['patient-consents', patientId] });
    },
    onError: (error: any) => {
      const mappedError = mapConsentError(error);
      alert(mappedError.message);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (reason: string) =>
      consentService.archivePDFConsent({
        consentId,
        reason,
        version: consent?.version || 1,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdf-consent', consentId] });
      queryClient.invalidateQueries({ queryKey: ['patient-consents', patientId] });
    },
    onError: (error: any) => {
      const mappedError = mapConsentError(error);
      alert(mappedError.message);
    },
  });

  const sendForSignatureMutation = useMutation({
    mutationFn: () =>
      consentService.sendPDFConsentForSignature({
        consentId,
        version: consent?.version || 1,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdf-consent', consentId] });
      queryClient.invalidateQueries({ queryKey: ['patient-consents', patientId] });
    },
    onError: (error: any) => {
      const mappedError = mapConsentError(error);
      alert(mappedError.message);
    },
  });

  const downloadMutation = useMutation({
    mutationFn: () => consentService.downloadPDFConsent(consentId),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `consent-${consentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !consent) {
    return (
      <Card padding="md" className="bg-red-50 border-red-200">
        <p className="text-sm text-red-800">
          Failed to load consent: {(error as any)?.message || 'Unknown error'}
        </p>
      </Card>
    );
  }

  const signatures = consent.signatures || [];
  // Use downloadUrl (secure API endpoint) if available, fallback to direct URLs
  const pdfUrl = consent.downloadUrl 
    ? `${process.env.NEXT_PUBLIC_API_URL_BROWSER || 'http://localhost:3002'}${consent.downloadUrl}`
    : consent.finalPdfUrl || consent.generatedPdfUrl;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-spaceCadet mb-2">
            {consent.template?.name || 'Consent Document'}
          </h2>
          <div className="flex items-center gap-4 text-sm text-neutral-600">
            <ConsentStatusBadge status={consent.status} />
            <span>Consent #{consent.consentNumber}</span>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Metadata */}
      <Card padding="md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {consent.consultationId && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-neutral-400" />
              <span className="text-sm text-neutral-600">
                Linked to consultation
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-neutral-400" />
            <span className="text-sm text-neutral-600">
              Created: {new Date(consent.createdAt).toLocaleString()}
            </span>
          </div>
          {consent.updatedAt && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-neutral-400" />
              <span className="text-sm text-neutral-600">
                Updated: {new Date(consent.updatedAt).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* PDF Viewer */}
      {!isFrontDesk && pdfUrl ? (
        <Card padding="md">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-spaceCadet mb-2">
              Document Preview
            </h3>
          </div>
          <iframe
            src={pdfUrl}
            className="w-full h-[600px] border border-neutral-200 rounded-lg"
            title="Consent PDF"
            onError={(e) => {
              console.error('PDF iframe error:', e);
            }}
          />
        </Card>
      ) : isFrontDesk ? (
        <Card padding="md" className="bg-yellow-50 border-yellow-200">
          <p className="text-sm text-yellow-800">
            Front Desk users cannot view consent documents. Contact a doctor or administrator.
          </p>
        </Card>
      ) : (
        <Card padding="md">
          <p className="text-sm text-neutral-600">
            PDF document not available yet.
          </p>
        </Card>
      )}

      {/* Signatures Timeline */}
      {!isFrontDesk && signatures.length > 0 && (
        <Card padding="md">
          <h3 className="text-lg font-semibold text-spaceCadet mb-4">
            Signatures
          </h3>
          <div className="space-y-3">
            {signatures.map((signature) => (
              <div
                key={signature.id}
                className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg"
              >
                <User className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <div className="font-medium text-neutral-900">
                    {signature.signerName}
                  </div>
                  <div className="text-sm text-neutral-600">
                    {signature.signerType} •{' '}
                    {new Date(signature.signedAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Actions */}
      {!isFrontDesk && (
        <Card padding="md">
          <ConsentActions
            consent={consent}
            onSendForSignature={() => {
              if (confirm('Send this consent for signature? This will notify all required signers.')) {
                sendForSignatureMutation.mutate();
              }
            }}
            onSign={() => setShowSignaturePanel(true)}
            onRevoke={() => {
              const reason = prompt('Please provide a reason for revocation:');
              if (reason) {
                revokeMutation.mutate(reason);
              }
            }}
            onArchive={() => {
              const reason = prompt('Please provide a reason for archiving:');
              if (reason) {
                archiveMutation.mutate(reason);
              }
            }}
            onDownload={() => downloadMutation.mutate()}
          />
        </Card>
      )}

      {/* Signature Panel */}
      <SignaturePanel
        isOpen={showSignaturePanel}
        onClose={() => setShowSignaturePanel(false)}
        onSign={(data) => {
          signMutation.mutate({
            consentId,
            ...data,
            version: consent.version,
          });
        }}
        consentVersion={consent.version}
      />
    </div>
  );
}

