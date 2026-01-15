'use client';

import { ConsultationStatus } from '@/services/consultation.service';
import { cn } from '@/lib/utils';

interface ConsultationStatusBadgeProps {
  status: ConsultationStatus | string;
  className?: string;
}

/**
 * Consultation Status Badge Component
 * 
 * Displays consultation status with appropriate color coding.
 */
export function ConsultationStatusBadge({ status, className }: ConsultationStatusBadgeProps) {
  const statusVariants: Record<string, string> = {
    [ConsultationStatus.SCHEDULED]: 'bg-blue-100 text-blue-800 border-blue-200',
    [ConsultationStatus.CHECKED_IN]: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    [ConsultationStatus.IN_TRIAGE]: 'bg-purple-100 text-purple-800 border-purple-200',
    [ConsultationStatus.IN_CONSULTATION]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    [ConsultationStatus.PLAN_CREATED]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    [ConsultationStatus.CLOSED]: 'bg-slate-100 text-slate-800 border-slate-200',
    [ConsultationStatus.FOLLOW_UP]: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    [ConsultationStatus.REFERRED]: 'bg-orange-100 text-orange-800 border-orange-200',
    [ConsultationStatus.SURGERY_SCHEDULED]: 'bg-pink-100 text-pink-800 border-pink-200',
    [ConsultationStatus.CANCELLED]: 'bg-red-100 text-red-800 border-red-200',
    [ConsultationStatus.NO_SHOW]: 'bg-slate-100 text-slate-800 border-slate-200',
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
