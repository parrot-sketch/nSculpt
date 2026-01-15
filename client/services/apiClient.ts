import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { getApiUrl } from '@/lib/env';
import { ApiError } from '@/types/api';

/**
 * Create axios instance with default configuration
 * Tokens are now handled via secure HTTP-only cookies
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: getApiUrl(''),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // CRITICAL: Include cookies in all requests
});

/**
 * Request interceptor
 * Tokens are now in secure HTTP-only cookies, sent automatically by browser
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // No need to manually add token - browser handles secure cookies automatically
    // This keeps the implementation secure and clean
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - Handle errors and token refresh
 * Token refresh is automatic via secure cookies
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Handle 401 Unauthorized - Token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      // CRITICAL: Do not attempt to refresh if the error call was the login, MFA verification, or logout endpoint
      const url = originalRequest.url || '';
      const isAuthExempt = url.includes('/auth/login') ||
        url.includes('/auth/mfa/verify') ||
        url.includes('/auth/mfa/enable') ||
        url.includes('/auth/logout');

      if (isAuthExempt) {
        // Structured error for auth endpoints
        const apiError: ApiError = {
          message: error.response?.data?.message || 'Authentication failed',
          statusCode: 401,
          error: error.response?.data?.error || 'Unauthorized',
          timestamp: error.response?.data?.timestamp || new Date().toISOString(),
          path: error.response?.data?.path || url,
        };
        return Promise.reject(apiError);
      }

      originalRequest._retry = true;

      try {
        // Request new access token from refresh endpoint
        const response = await axios.post<{
          user?: any;
          sessionId?: string;
          expiresIn?: number;
        }>(
          getApiUrl('/auth/refresh'),
          {},
          { withCredentials: true }
        );

        // Dispatch event to update auth store with refreshed user data
        if (response.data.user && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:user-updated', {
            detail: {
              user: response.data.user,
              sessionId: response.data.sessionId
            }
          }));
        }

        // Retry original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:logout'));
        }
        return Promise.reject(refreshError);
      }
    }

    // Standardize all other errors into ApiError format
    const apiError: ApiError = {
      message: error.response?.data?.message || error.message || 'An unexpected error occurred',
      statusCode: error.response?.status || 500,
      error: error.response?.data?.error || (error.response?.status === 403 ? 'Forbidden' : 'Internal Server Error'),
      timestamp: error.response?.data?.timestamp || new Date().toISOString(),
      path: error.response?.data?.path || originalRequest.url,
    };

    // Log error for developers
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[API Error] ${apiError.statusCode} ${apiError.path}:`, apiError.message);
    }

    return Promise.reject(apiError);
  }
);

export default apiClient;

