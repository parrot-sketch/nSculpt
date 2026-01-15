'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveGridProps {
  children: ReactNode;
  className?: string;
  /**
   * Number of columns at each breakpoint
   * Format: { mobile: 1, tablet?: 2, desktop?: 4 }
   * 
   * @example
   * columns={{ mobile: 1, tablet: 2, desktop: 4 }}
   * // Results in: grid-cols-1 md:grid-cols-2 lg:grid-cols-4
   */
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  /**
   * Gap between grid items
   * - sm: gap-4 (16px)
   * - md: gap-6 (24px) - default
   * - lg: gap-8 (32px)
   */
  gap?: 'sm' | 'md' | 'lg';
}

/**
 * ResponsiveGrid Component
 * 
 * Reusable responsive grid component.
 * Mobile-first: defaults to 1 column, expands at breakpoints.
 * 
 * @example
 * <ResponsiveGrid columns={{ mobile: 1, tablet: 2, desktop: 4 }} gap="md">
 *   <Card>Item 1</Card>
 *   <Card>Item 2</Card>
 * </ResponsiveGrid>
 */
export function ResponsiveGrid({
  children,
  className,
  columns = { mobile: 1 },
  gap = 'md',
}: ResponsiveGridProps) {
  const gapClass = 
    gap === 'sm' ? 'gap-4' :
    gap === 'lg' ? 'gap-8' :
    'gap-6';

  // Build grid columns classes
  const mobileCols = columns.mobile || 1;
  const tabletCols = columns.tablet;
  const desktopCols = columns.desktop;

  const gridColsClass = cn(
    `grid-cols-${mobileCols}`,
    tabletCols && `md:grid-cols-${tabletCols}`,
    desktopCols && `lg:grid-cols-${desktopCols}`
  );

  return (
    <div className={cn('grid', gridColsClass, gapClass, className)}>
      {children}
    </div>
  );
}









