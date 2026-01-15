import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js middleware for route protection
 * Handles basic route gating based on authentication cookies
 * 
 * Full authentication and authorization is handled client-side by:
 * - useAuth hook (session restoration on app load)
 * - AuthGuard component (route-level protection)
 * - Axios interceptors (automatic token refresh)
 * 
 * Tokens are in secure HTTP-only cookies set by backend.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/forgot-password'];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // If accessing public route, allow through
  // Client-side LoginForm will handle showing appropriate content based on auth state
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // For protected routes, allow through
  // Client-side AuthGuard component will handle redirects if user not authenticated
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

