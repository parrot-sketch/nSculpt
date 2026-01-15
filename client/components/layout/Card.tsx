'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  /**
   * Padding variant
   * - sm: p-4 (16px)
   * - md: p-6 (24px) - default
   * - lg: p-8 (32px)
   * - none: No padding
   */
  padding?: 'sm' | 'md' | 'lg' | 'none';
  /**
   * Shadow variant
   * - soft: Subtle shadow (default)
   * - medium: More prominent shadow
   * - none: No shadow
   */
  shadow?: 'soft' | 'medium' | 'none';
  /**
   * Click handler - makes card interactive
   */
  onClick?: () => void;
}

/**
 * Card Component
 * 
 * Reusable card component with consistent styling.
 * Replaces repeated patterns: bg-white rounded-lg border border-neutral-200 shadow-sm
 * 
 * @example
 * <Card padding="md" shadow="soft">
 *   <h2>Card Title</h2>
 *   <p>Card content</p>
 * </Card>
 */
export function Card({
  children,
  className,
  padding = 'md',
  shadow = 'soft',
  onClick,
}: CardProps) {
  const paddingClass = 
    padding === 'sm' ? 'p-4' :
    padding === 'lg' ? 'p-8' :
    padding === 'none' ? '' :
    'p-6';

  const shadowClass = 
    shadow === 'medium' ? 'shadow-medium' :
    shadow === 'none' ? '' :
    'shadow-soft';

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-lg border border-neutral-200',
        paddingClass,
        shadowClass,
        onClick && 'cursor-pointer hover:shadow-medium transition-shadow',
        className
      )}
    >
      {children}
    </div>
  );
}









