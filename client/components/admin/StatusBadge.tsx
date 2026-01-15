'use client';

import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string | boolean;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Status Badge
 * 
 * Reusable status badge component for displaying entity status.
 */
export function StatusBadge({
  status,
  variant = 'default',
  size = 'md',
  className,
}: StatusBadgeProps) {
  // Normalize boolean status
  const statusText = typeof status === 'boolean' ? (status ? 'Active' : 'Inactive') : status;
  const statusVariant = typeof status === 'boolean' && !status ? 'danger' : variant;

  const variants = {
    default: 'bg-neutral-100 text-neutral-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        variants[statusVariant],
        sizes[size],
        className
      )}
    >
      {statusText}
    </span>
  );
}









