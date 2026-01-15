'use client';

import { ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  action?: ReactNode;
  className?: string;
}

/**
 * Error State Component
 * 
 * Gracefully displays error states with retry option.
 * More user-friendly than showing raw error messages.
 */
export function ErrorState({
  title = 'Unable to load data',
  message = 'Something went wrong while loading this content. Please try again.',
  onRetry,
  action,
  className = '',
}: ErrorStateProps) {
  return (
    <div className={`text-center py-12 px-4 ${className}`}>
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
        <AlertCircle className="h-6 w-6 text-red-600" />
      </div>
      <h3 className="text-sm font-medium text-neutral-900 mb-1">{title}</h3>
      <p className="text-sm text-neutral-500 mb-4 max-w-md mx-auto">{message}</p>
      {(onRetry || action) && (
        <div className="mt-6 flex justify-center gap-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          )}
          {action}
        </div>
      )}
    </div>
  );
}









