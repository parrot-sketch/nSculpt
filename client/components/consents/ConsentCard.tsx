'use client';

import { Card } from '@/components/layout/Card';
import { ConsentStatusBadge } from './ConsentStatusBadge';
import { FileText, Calendar, User, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { PDFConsent } from '@/types/consent';

interface ConsentCardProps {
  consent: PDFConsent;
  patientId: string;
  showActions?: boolean;
  onView?: (consent: PDFConsent) => void;
}

export function ConsentCard({
  consent,
  patientId,
  showActions = true,
  onView,
}: ConsentCardProps) {
  const signatures = consent.signatures || [];
  const hasPatient = signatures.some(
    (s) => s.signerType === 'PATIENT' || s.signerType === 'GUARDIAN'
  );
  const hasDoctor = signatures.some((s) => s.signerType === 'DOCTOR');
  const totalSignatures = signatures.length;

  const progressText =
    consent.status === 'SIGNED'
      ? 'Complete'
      : consent.status === 'PARTIALLY_SIGNED'
      ? `${totalSignatures} signed`
      : 'Not started';

  return (
    <Card padding="md" className="hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-spaceCadet">
              {consent.template?.name || 'Consent Document'}
            </h3>
            <ConsentStatusBadge status={consent.status} size="sm" />
          </div>

          <div className="space-y-2 text-sm text-neutral-600">
            {consent.consultationId && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Linked to consultation</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>Signatures: {progressText}</span>
            </div>

            <div className="text-xs text-neutral-500">
              Updated: {new Date(consent.updatedAt).toLocaleString()}
            </div>
          </div>
        </div>

        {showActions && (
          <div className="flex items-center gap-2 ml-4">
            {onView ? (
              <button
                onClick={() => onView(consent)}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
              >
                View
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <Link
                href={`/admin/patients/${patientId}/consents/${consent.id}`}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
              >
                View
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}









