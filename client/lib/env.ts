export const env = {
  // Use browser URL if available (for client-side requests), otherwise fallback to server URL
  apiUrl: 
    (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_URL_BROWSER) 
      ? process.env.NEXT_PUBLIC_API_URL_BROWSER 
      : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1',
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Nairobi Sculpt EHR',
  appEnv: process.env.NEXT_PUBLIC_APP_ENV || 'development',
  sessionTimeout: parseInt(process.env.NEXT_PUBLIC_SESSION_TIMEOUT || '3600000', 10),
} as const;

export function getApiUrl(path: string): string {
  const baseUrl = env.apiUrl.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

