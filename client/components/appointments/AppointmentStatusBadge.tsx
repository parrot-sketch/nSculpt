'use client';

import { AppointmentStatus } from '@/services/appointment.service';
import { cn } from '@/lib/utils';

interface AppointmentStatusBadgeProps {
  status: AppointmentStatus | string;
  className?: string;
}

/**
 * Appointment Status Badge Component
 * 
 * Displays appointment status with appropriate color coding.
 * Follows the pattern of EncounterStatusBadge.
 */
export function AppointmentStatusBadge({ status, className }: AppointmentStatusBadgeProps) {
  const statusVariants: Record<string, string> = {
    [AppointmentStatus.PENDING_PAYMENT]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    [AppointmentStatus.PAYMENT_PENDING]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    [AppointmentStatus.SCHEDULED]: 'bg-blue-100 text-blue-800 border-blue-200',
    [AppointmentStatus.CONFIRMED]: 'bg-green-100 text-green-800 border-green-200',
    [AppointmentStatus.CHECKED_IN]: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    [AppointmentStatus.IN_PROGRESS]: 'bg-purple-100 text-purple-800 border-purple-200 animate-pulse',
    [AppointmentStatus.COMPLETED]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    [AppointmentStatus.CANCELLED]: 'bg-red-100 text-red-800 border-red-200 line-through',
    [AppointmentStatus.CANCELLED_AFTER_PAYMENT]: 'bg-orange-100 text-orange-800 border-orange-200 line-through',
    [AppointmentStatus.NO_SHOW]: 'bg-slate-100 text-slate-800 border-slate-200',
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
