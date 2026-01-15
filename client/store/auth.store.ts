import { create } from 'zustand';
import type { User, AuthState } from '@/types/auth';

interface AuthStore extends AuthState {
  lastFetch: number | null;
  sessionId: string | null;
  isInitialized: boolean; // Track if auth has been initialized
  initializationError: string | null;

  // MFA state
  mfaRequired: boolean;
  mfaSetupRequired: boolean;
  tempToken: string | null;

  // Actions
  setUser: (user: User | null, sessionId?: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setInitialized: (isInitialized: boolean) => void;
  setInitializationError: (error: string | null) => void;
  setMfaChallenge: (tempToken: string) => void;
  setMfaSetupRequired: (tempToken: string) => void;
  clearMfaChallenge: () => void;
  clearMfaSetup: () => void;
  logout: () => void;

  // Computed
  shouldRefetch: () => boolean;
}

const REFETCH_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Auth store using Zustand with subscription middleware
 * 
 * CRITICAL FIXES:
 * - Single source of truth for auth state
 * - Prevents race conditions with initialization flag
 * - Tracks initialization state separately from loading
 * - Thread-safe state updates
 * 
 * Features:
 * - Smart caching: Only refetch user data when necessary
 * - Session tracking: Track current session ID
 * - Initialization tracking: Prevent multiple simultaneous initializations
 * 
 * Note: Tokens are stored in HTTP-only cookies by backend
 */
export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  lastFetch: null,
  sessionId: null,
  isInitialized: false,
  initializationError: null,
  mfaRequired: false,
  mfaSetupRequired: false,
  tempToken: null,

  setUser: (user, sessionId) =>
    set((state) => ({
      user,
      isAuthenticated: !!user,
      error: null,
      lastFetch: user ? Date.now() : null,
      sessionId: sessionId ?? state.sessionId,
      // Mark as initialized when user is set
      isInitialized: true,
      initializationError: null,
      // Clear MFA state on successful login
      mfaRequired: false,
      mfaSetupRequired: false,
      tempToken: null,
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  setInitialized: (isInitialized) => set({ isInitialized }),

  setInitializationError: (error) => set({ initializationError: error }),

  setMfaChallenge: (tempToken) =>
    set({
      mfaRequired: true,
      mfaSetupRequired: false,
      tempToken,
      error: null,
    }),

  setMfaSetupRequired: (tempToken) =>
    set({
      mfaSetupRequired: true,
      mfaRequired: false,
      tempToken,
      error: null,
    }),

  clearMfaChallenge: () =>
    set({
      mfaRequired: false,
      tempToken: null,
    }),

  clearMfaSetup: () =>
    set({
      mfaSetupRequired: false,
      tempToken: null,
    }),

  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
      error: null,
      lastFetch: null,
      sessionId: null,
      // Keep isInitialized true so we don't re-initialize on next mount
      isInitialized: true,
      initializationError: null,
      mfaRequired: false,
      mfaSetupRequired: false,
      tempToken: null,
    }),

  /**
   * Check if we should refetch user data
   * Returns true if:
   * - Never fetched before
   * - Last fetch was more than 5 minutes ago
   * - Data is incomplete (missing names)
   */
  shouldRefetch: () => {
    const state = get();

    // Never fetched
    if (!state.lastFetch) return true;

    // Data incomplete (missing names)
    if (state.user && (!state.user.firstName || !state.user.lastName)) {
      return true;
    }

    // Last fetch was too long ago
    const timeSinceLastFetch = Date.now() - state.lastFetch;
    if (timeSinceLastFetch > REFETCH_INTERVAL) return true;

    return false;
  },
}));

/**
 * Get store state synchronously (for use outside React components)
 */
export const getAuthState = () => useAuthStore.getState();

/**
 * Subscribe to auth state changes (for event-driven updates)
 */
export const subscribeToAuth = (callback: (state: AuthStore) => void) => {
  return useAuthStore.subscribe(callback);
};
