'use client';

import { PrescriptionStatus } from '@/services/prescription.service';
import { cn } from '@/lib/utils';

interface PrescriptionStatusBadgeProps {
  status: PrescriptionStatus | string;
  className?: string;
}

/**
 * Prescription Status Badge Component
 * 
 * Displays prescription status with appropriate color coding.
 */
export function PrescriptionStatusBadge({ status, className }: PrescriptionStatusBadgeProps) {
  const statusVariants: Record<string, string> = {
    [PrescriptionStatus.PRESCRIBED]: 'bg-blue-100 text-blue-800 border-blue-200',
    [PrescriptionStatus.DISPENSED]: 'bg-green-100 text-green-800 border-green-200',
    [PrescriptionStatus.PARTIALLY_DISPENSED]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    [PrescriptionStatus.CANCELLED]: 'bg-red-100 text-red-800 border-red-200',
    [PrescriptionStatus.COMPLETED]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };

  const variant = statusVariants[status] || 'bg-slate-100 text-slate-800 border-slate-200';
  const displayText = String(status).replace(/_/g, ' ');

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        variant,
        className
      )}
    >
      {displayText}
    </span>
  );
}
