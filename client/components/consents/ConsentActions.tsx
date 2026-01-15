'use client';

import { useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { getConsentActionTooltip } from '@/lib/consent-errors';
import {
  FileText,
  Send,
  PenTool,
  X,
  Archive,
  Download,
  AlertCircle,
} from 'lucide-react';
import type { PDFConsent } from '@/types/consent';

interface ConsentActionsProps {
  consent: PDFConsent;
  onGenerate?: () => void;
  onSendForSignature?: () => void;
  onSign?: () => void;
  onRevoke?: () => void;
  onArchive?: () => void;
  onDownload?: () => void;
}

export function ConsentActions({
  consent,
  onGenerate,
  onSendForSignature,
  onSign,
  onRevoke,
  onArchive,
  onDownload,
}: ConsentActionsProps) {
  const { roles } = usePermissions();
  const userRole = roles[0] || 'FRONT_DESK'; // Get primary role
  const [tooltip, setTooltip] = useState<string | null>(null);

  const isAdmin = roles.includes('ADMIN');
  const isDoctor = roles.includes('DOCTOR') || roles.includes('SURGEON');
  const isNurse = roles.includes('NURSE');
  const isFrontDesk = roles.includes('FRONT_DESK');

  // Determine button states
  const canGenerate = (isAdmin || isDoctor || isNurse) && consent.status === 'DRAFT';
  const canSendForSignature =
    (isAdmin || isDoctor || isNurse) &&
    (consent.status === 'DRAFT' || consent.status === 'READY_FOR_SIGNATURE');
  const canSign =
    !isFrontDesk &&
    (consent.status === 'READY_FOR_SIGNATURE' ||
      consent.status === 'PARTIALLY_SIGNED');
  const canRevoke =
    (isAdmin || isDoctor) &&
    consent.status !== 'SIGNED' &&
    consent.status !== 'REVOKED' &&
    consent.status !== 'ARCHIVED';
  const canArchive = isAdmin && (consent.status === 'SIGNED' || consent.status === 'REVOKED');
  const canDownload =
    !isFrontDesk &&
    (consent.finalPdfUrl || consent.generatedPdfUrl) &&
    consent.status !== 'DRAFT';

  const getTooltip = (action: string) => {
    return getConsentActionTooltip(action, consent, userRole);
  };

  const handleAction = (
    action: string,
    handler: (() => void) | undefined,
    tooltipText: string | null
  ) => {
    if (tooltipText) {
      setTooltip(tooltipText);
      setTimeout(() => setTooltip(null), 3000);
      return;
    }
    handler?.();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canGenerate && onGenerate && (
        <button
          onClick={() => handleAction('generate', onGenerate, null)}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          <FileText className="w-4 h-4" />
          Generate
        </button>
      )}

      {canSendForSignature && onSendForSignature && (
        <button
          onClick={() => handleAction('send', onSendForSignature, null)}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Send className="w-4 h-4" />
          Send for Signature
        </button>
      )}

      {canSign && onSign && (
        <button
          onClick={() =>
            handleAction('sign', onSign, getTooltip('sign'))
          }
          disabled={!!getTooltip('sign')}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={getTooltip('sign') || undefined}
        >
          <PenTool className="w-4 h-4" />
          Sign
        </button>
      )}

      {canRevoke && onRevoke && (
        <button
          onClick={() =>
            handleAction('revoke', onRevoke, getTooltip('revoke'))
          }
          disabled={!!getTooltip('revoke')}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={getTooltip('revoke') || undefined}
        >
          <X className="w-4 h-4" />
          Revoke
        </button>
      )}

      {canArchive && onArchive && (
        <button
          onClick={() =>
            handleAction('archive', onArchive, getTooltip('archive'))
          }
          disabled={!!getTooltip('archive')}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-neutral-600 text-white rounded-lg hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={getTooltip('archive') || undefined}
        >
          <Archive className="w-4 h-4" />
          Archive
        </button>
      )}

      {canDownload && onDownload && (
        <button
          onClick={onDownload}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download
        </button>
      )}

      {tooltip && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{tooltip}</span>
        </div>
      )}
    </div>
  );
}









