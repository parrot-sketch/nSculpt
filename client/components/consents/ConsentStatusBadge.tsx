'use client';

import { StatusBadge } from '@/components/admin/StatusBadge';
import type { PDFConsentStatus } from '@/types/consent';

interface ConsentStatusBadgeProps {
  status: PDFConsentStatus;
  size?: 'sm' | 'md' | 'lg';
}

export function ConsentStatusBadge({ status, size = 'md' }: ConsentStatusBadgeProps) {
  const statusConfig: Record<PDFConsentStatus, { variant: 'success' | 'warning' | 'danger' | 'info'; label: string }> = {
    DRAFT: { variant: 'info', label: 'Draft' },
    READY_FOR_SIGNATURE: { variant: 'warning', label: 'Ready for Signature' },
    PARTIALLY_SIGNED: { variant: 'warning', label: 'Partially Signed' },
    SIGNED: { variant: 'success', label: 'Signed' },
    REVOKED: { variant: 'danger', label: 'Revoked' },
    EXPIRED: { variant: 'danger', label: 'Expired' },
    ARCHIVED: { variant: 'info', label: 'Archived' },
  };

  const config = statusConfig[status] || { variant: 'info', label: status };

  return (
    <StatusBadge
      status={config.label}
      variant={config.variant}
      size={size}
    />
  );
}









