'use client';

import { useQuery } from '@tanstack/react-query';
import { patientService } from '@/services/patient.service';
import { ConsentCard } from './ConsentCard';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { EmptyState } from '@/components/admin/EmptyState';
import { FileText } from 'lucide-react';
import type { PDFConsent } from '@/types/consent';

interface ConsentListProps {
  patientId: string;
  filter?: 'all' | 'active' | 'revoked' | 'archived';
  onConsentClick?: (consent: PDFConsent) => void;
}

export function ConsentList({
  patientId,
  filter = 'all',
  onConsentClick,
}: ConsentListProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['patient-consents', patientId, filter],
    queryFn: async () => {
      switch (filter) {
        case 'active':
          return patientService.getActiveConsents(patientId);
        case 'revoked':
          return patientService.getRevokedConsents(patientId);
        default:
          return patientService.getPatientConsents(patientId, filter === 'archived');
      }
    },
    enabled: !!patientId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    const errorMessage = (error as any)?.response?.data?.message || 
                        (error as any)?.message || 
                        'Unknown error';
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm font-medium text-red-800 mb-2">
          Failed to load consents
        </p>
        <p className="text-sm text-red-700">
          {errorMessage}
        </p>
        {(error as any)?.response?.status === 403 && (
          <p className="text-xs text-red-600 mt-2">
            You may not have permission to view consents for this patient.
          </p>
        )}
      </div>
    );
  }

  const consents = data?.pdfConsents || [];

  if (consents.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="w-6 h-6 text-neutral-400" />}
        title="No consents found"
        description={
          filter === 'active'
            ? 'This patient has no active consents.'
            : filter === 'revoked'
            ? 'This patient has no revoked consents.'
            : filter === 'archived'
            ? 'This patient has no archived consents.'
            : 'This patient has no consents.'
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {consents.map((consent) => (
        <ConsentCard
          key={consent.id}
          consent={consent}
          patientId={patientId}
          onView={onConsentClick}
        />
      ))}
    </div>
  );
}

