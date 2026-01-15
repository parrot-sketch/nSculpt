'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { AuthInitializer } from '@/components/auth/AuthInitializer';
import { Toaster } from 'sonner';

/**
 * Providers component
 * Wraps the app with necessary providers (React Query, etc.)
 * 
 * Enterprise-grade configuration:
 * - Intelligent caching with appropriate stale times
 * - Smart retry strategies
 * - Optimistic updates support
 * - Error handling and recovery
 * - Network status awareness
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache data for 5 minutes - balance between freshness and performance
            staleTime: 5 * 60 * 1000, // 5 minutes
            // Keep unused data in cache for 10 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
            // Retry strategy: exponential backoff for network resilience
            retry: (failureCount, error: any) => {
              // Don't retry on 4xx errors (client errors)
              if (error?.response?.status >= 400 && error?.response?.status < 500) {
                return false;
              }
              // Retry up to 3 times for network/server errors
              return failureCount < 3;
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            // Don't refetch on window focus to prevent UI instability
            refetchOnWindowFocus: false,
            // Refetch on reconnect (important for mobile/offline scenarios)
            refetchOnReconnect: true,
            // Refetch on mount if data is stale
            refetchOnMount: true,
            // Network mode: use network first, fall back to cache
            networkMode: 'online',
          },
          mutations: {
            // Retry mutations once on network errors
            retry: 1,
            retryDelay: 1000,
            // Network mode: require network for mutations (critical operations)
            networkMode: 'online',
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer />
      <Toaster />
      {children}
      {/* React Query DevTools - only in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
      )}
    </QueryClientProvider>
  );
}




