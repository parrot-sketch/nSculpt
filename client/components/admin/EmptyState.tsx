'use client';

import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: string | ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Empty State Component
 * 
 * Displays an empty state when there's no data to show.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`text-center py-12 px-4 ${className}`}>
      {icon && (
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-neutral-100 mb-4">
          {typeof icon === 'string' ? (
            <span className="text-2xl">{icon}</span>
          ) : (
            icon
          )}
        </div>
      )}
      <h3 className="text-sm font-medium text-neutral-900 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-neutral-500 mb-4">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}









