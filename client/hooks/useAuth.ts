'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';
import type { LoginCredentials } from '@/types/auth';
import { getDashboardRouteForUser } from '@/lib/department-routing';

/**
 * Main authentication hook
 * Provides login, logout, and session management
 * 
 * Tokens are managed via secure HTTP-only cookies set by backend.
 * This hook handles user state and navigation only.
 * 
 * Enterprise-grade features:
 * - Zero-friction persistence (cookies survive reload)
 * - Automatic token refresh via interceptors
 * - Graceful degradation on network failures
 * - HIPAA-compliant session management
 * 
 * INITIALIZATION: Moved to AuthInitializer component to ensure it runs exactly once,
 * not once per useAuth() hook call (which would cause multiple initializations).
 */
export function useAuth() {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    mfaRequired,
    mfaSetupRequired,
    tempToken,
    setUser,
    setLoading,
    setError,
    setMfaChallenge,
    setMfaSetupRequired,
    logout: clearAuth
  } = useAuthStore();

  /**
   * Login with email and password
   * Handles three possible outcomes:
   * 1. Full auth - redirect to dashboard
   * 2. MFA challenge - show MFA verification form
   * 3. MFA setup required - show MFA setup form
   */
  const login = useCallback(
    async (credentials: LoginCredentials) => {
      setLoading(true);
      setError(null);

      try {
        const response = await authService.login(credentials);
        console.log('Login response:', response);

        // Check if MFA setup is required
        if ('mfaSetupRequired' in response && response.mfaSetupRequired) {
          console.log('MFA setup required, setting temp token');
          // User must set up MFA before accessing the system
          setMfaSetupRequired(response.tempToken);
          return;
        }

        // Check if MFA is required (user has MFA enabled)
        if ('mfaRequired' in response && response.mfaRequired) {
          console.log('MFA challenge required, setting temp token');
          // User must complete MFA verification
          setMfaChallenge(response.tempToken);
          return;
        }

        // Full auth response - user is logged in
        console.log('Full auth response, logging user in');
        const { user: userData } = response as any;
        setUser(userData);

        // Department-aware routing (falls back to role-based if department missing)
        const dashboardRoute = getDashboardRouteForUser(userData);
        console.log('[useAuth] Routing user to:', dashboardRoute, {
          department: userData.department?.code,
          roles: userData.roles,
        });
        router.push(dashboardRoute);
      } catch (err: any) {
        console.error('Login error:', err);
        // Use the structured error message if available, otherwise fallback
        const errorMessage = err?.message || 'Login failed. Please check your credentials.';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [router, setUser, setLoading, setError, setMfaChallenge, setMfaSetupRequired]
  );

  /**
   * Logout current session
   */
  const logout = useCallback(
    async (reason?: string) => {
      setLoading(true);

      try {
        await authService.logout(reason);
      } catch (err) {
        console.error('Logout error:', err);
      } finally {
        // Clear auth state (cookies are cleared by backend)
        clearAuth();
        router.push('/patient/discover');
        setLoading(false);
      }
    },
    [router, clearAuth, setLoading]
  );

  /**
   * Refresh current user data
   */
  const refreshUser = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch (err) {
      console.error('Failed to refresh user:', err);
      // If refresh fails, logout
      await logout();
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, setUser, setLoading, logout]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    mfaRequired,
    mfaSetupRequired,
    tempToken,
    login,
    logout,
    refreshUser,
  };
}

