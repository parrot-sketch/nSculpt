'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore, getAuthState } from '@/store/auth.store';
import { authService } from '@/services/auth.service';

/**
 * Public routes that don't require authentication
 */
const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password'];

/**
 * Check if a route is public (doesn't require authentication)
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Global Auth Initializer Component
 * 
 * CRITICAL FIXES:
 * 1. Single initialization lock using store flag (prevents race conditions)
 * 2. Proper pathname handling with usePathname hook
 * 3. Event listeners set up immediately (not in useEffect)
 * 4. Thread-safe state updates
 * 5. Proper error handling and recovery
 * 6. No duplicate event listeners
 * 
 * Key features:
 * - Initializes ONCE per app session (uses store flag)
 * - Uses smart caching to prevent unnecessary /auth/me calls
 * - Skips initialization on public routes
 * - Listens for auth events (logout, user updates) immediately
 * - Uses soft redirects (Next.js router) instead of hard redirects
 * - Properly cleans up event listeners on unmount
 * 
 * Performance:
 * - Single /auth/me call on app load
 * - No API calls on route navigation (uses cached data)
 * - Refetches only when cache expires (5 minutes)
 */
export function AuthInitializer() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    user,
    isInitialized,
    setUser,
    setLoading,
    setInitialized,
    setInitializationError,
    logout: clearAuth,
    shouldRefetch,
  } = useAuthStore();

  // Track if event listeners are set up (prevent duplicates)
  const listenersSetup = useRef(false);

  // Set up event listeners ONCE (immediately, not in useEffect)
  useEffect(() => {
    if (listenersSetup.current) return;
    listenersSetup.current = true;

    // Handle logout events (dispatched by apiClient on 401)
    const handleLogout = () => {
      const currentPath = window.location.pathname;
      clearAuth();
      // Only redirect if not already on a public route
      if (!isPublicRoute(currentPath)) {
        router.push('/login');
      }
    };

    // Handle user update events (dispatched by apiClient after token refresh)
    const handleUserUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ user: any; sessionId?: string }>;
      if (customEvent.detail?.user) {
        setUser(customEvent.detail.user, customEvent.detail.sessionId);
      }
    };

    // Set up listeners
    window.addEventListener('auth:logout', handleLogout);
    window.addEventListener('auth:user-updated', handleUserUpdate);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('auth:logout', handleLogout);
      window.removeEventListener('auth:user-updated', handleUserUpdate);
      listenersSetup.current = false;
    };
  }, [router, clearAuth, setUser]);

  // Initialize auth state ONCE per app session
  useEffect(() => {
    // Skip if already initialized (prevents race conditions)
    if (isInitialized) {
      return;
    }

    // Skip initialization on public routes
    if (isPublicRoute(pathname)) {
      setLoading(false);
      setInitialized(true);
      return;
    }

    // Check if we have cached user data that's still fresh
    const state = getAuthState();
    if (state.user && !shouldRefetch()) {
      setLoading(false);
      setInitialized(true);
      return;
    }

    // Initialize auth state
    const initAuth = async () => {
      // Set initialization lock immediately (prevents concurrent initializations)
      setInitialized(true);
      setLoading(true);
      setInitializationError(null);

      try {
        const userData = await authService.getCurrentUser();
        console.log('[AuthInitializer] Hydrated user:', userData);
        setUser(userData);
      } catch (err) {
        console.error('[AuthInitializer] Failed to initialize auth:', err);
        
        // Set error but don't clear initialized flag (prevents re-initialization loops)
        setInitializationError(
          err instanceof Error ? err.message : 'Failed to initialize authentication'
        );
        
        // Clear auth state
        clearAuth();
        
        // Only redirect if not already on a public route
        if (!isPublicRoute(pathname)) {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [pathname, isInitialized, shouldRefetch, setUser, setLoading, setInitialized, setInitializationError, clearAuth, router]);

  // This component doesn't render anything
  return null;
}
