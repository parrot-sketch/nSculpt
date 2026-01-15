'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AppContainerProps {
  children: ReactNode;
  className?: string;
  /**
   * Max width variant
   * - full: No max-width (full width)
   * - 7xl: Max-width 80rem (1280px) - default
   * - 6xl: Max-width 72rem (1152px)
   * - 5xl: Max-width 64rem (1024px)
   */
  maxWidth?: 'full' | '7xl' | '6xl' | '5xl';
}

/**
 * AppContainer Component
 * 
 * Responsive container wrapper with consistent max-width and padding.
 * Mobile-first: smaller padding on mobile, larger on desktop.
 * 
 * @example
 * <AppContainer>
 *   <h1>Content</h1>
 * </AppContainer>
 */
export function AppContainer({
  children,
  className,
  maxWidth = '7xl',
}: AppContainerProps) {
  const maxWidthClass = maxWidth === 'full' 
    ? '' 
    : maxWidth === '6xl' 
    ? 'max-w-6xl' 
    : maxWidth === '5xl'
    ? 'max-w-5xl'
    : 'max-w-7xl';

  return (
    <div className={cn('mx-auto w-full', maxWidthClass, className)}>
      {children}
    </div>
  );
}









