import apiClient from './apiClient';
import { getApiUrl } from '@/lib/env';
import type {
  LoginCredentials,
  AuthResponse,
  LogoutRequest,
  User,
  MfaSetupResponse,
} from '@/types/auth';

/**
 * Authentication service
 * Handles all authentication-related API calls
 * Tokens are managed via secure HTTP-only cookies
 */
export const authService = {
  /**
   * Login with email and password
   * Tokens are returned in secure HTTP-only cookies
   * 
   * Returns one of:
   * - AuthResponse: Full auth tokens (user is logged in)
   * - MfaChallengeResponse: MFA verification required (user has MFA enabled)
   * - MfaSetupRequiredResponse: MFA setup required (user has sensitive role but no MFA)
   */
  async login(credentials: LoginCredentials): Promise<any> {
    const response = await apiClient.post<any>(
      getApiUrl('/auth/login'),
      credentials
    );
    return response.data;
  },

  /**
   * Initiate MFA setup
   * Generates TOTP secret and QR code
   * Called with temporary MFA setup token
   */
  async setupMfa(tempToken?: string): Promise<MfaSetupResponse> {
    // Create an axios instance with the temp token if provided
    const headers: any = {};
    if (tempToken) {
      headers['Authorization'] = `Bearer ${tempToken}`;
    }

    const response = await apiClient.post<MfaSetupResponse>(
      getApiUrl('/auth/mfa/enable'),
      {},
      { headers }
    );
    return response.data;
  },

  /**
   * Complete MFA setup by verifying code
   * Returns full auth tokens upon successful verification
   * Called with temporary MFA setup token
   */
  async completeMfaSetup(code: string, tempToken?: string): Promise<AuthResponse> {
    const headers: any = {};
    if (tempToken) {
      headers['Authorization'] = `Bearer ${tempToken}`;
    }

    const response = await apiClient.post<AuthResponse>(
      getApiUrl('/auth/mfa/verify'),
      { code },
      { headers }
    );
    return response.data;
  },

  /**
   * Verify MFA code during login (MFA Challenge)
   * Also used for completing setup if passed in that context
   */
  async verifyMfa({ code, tempToken }: { code: string; tempToken?: string }): Promise<AuthResponse> {
    // Re-use api logic, but handle object signature
    const headers: any = {};
    if (tempToken) {
      headers['Authorization'] = `Bearer ${tempToken}`;
    }

    const response = await apiClient.post<AuthResponse>(
      getApiUrl('/auth/mfa/verify'),
      { code },
      { headers }
    );
    return response.data;
  },

  /**
   * Refresh access token using secure cookie
   * Backend verifies refresh token from cookie and sets new access token cookie
   */
  async refreshToken(): Promise<void> {
    // No need to pass refresh token - it's in the secure cookie
    await apiClient.post<void>(
      getApiUrl('/auth/refresh'),
      {}
    );
  },

  /**
   * Logout current session
   * Clears secure cookies on backend
   */
  async logout(reason?: string): Promise<void> {
    try {
      await apiClient.post<void>(getApiUrl('/auth/logout'), { reason } as LogoutRequest);
    } catch (error) {
      // Even if logout fails, user will be logged out client-side
      console.error('Logout error:', error);
    }
  },

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>(getApiUrl('/auth/me'));
    return response.data;
  },
};












