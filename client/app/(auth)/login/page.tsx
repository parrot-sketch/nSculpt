'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { LoginForm } from '@/components/forms/LoginForm';
import { APP_NAME, APP_SUBTITLE } from '@/lib/constants';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  // Redirect authenticated users away from login page
  useEffect(() => {
    // Only redirect if:
    // 1. Not loading (auth state is determined)
    // 2. User is authenticated
    // 3. Not already redirecting (prevent loops)
    if (!isLoading && isAuthenticated && user) {
      // User is authenticated, redirect to appropriate dashboard
      const isAdmin = user.roles?.includes('ADMIN');
      const targetPath = isAdmin ? '/admin' : '/dashboard';

      // Only redirect if not already on target path
      if (window.location.pathname !== targetPath) {
        router.push(targetPath);
      }
    }
  }, [isAuthenticated, isLoading, router]); // Removed 'user' to prevent unnecessary re-renders

  // Show loading state while auth is initializing
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 opacity-20"></div>
            <div className="absolute inset-1 rounded-full border-2 border-transparent border-t-blue-500 border-r-purple-600 animate-spin"></div>
          </div>
          <p className="text-slate-400 font-medium">Initializing...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated, don't show login form
  if (isAuthenticated) {
    return null;
  }

  // Show login form for unauthenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 py-12">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-10 space-y-3">
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-blue-300 to-purple-400 bg-clip-text text-transparent">{APP_NAME}</h1>
          <p className="text-slate-400 text-lg">{APP_SUBTITLE}</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl hover:border-slate-600/50 transition-colors">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Welcome Back</h2>
          <LoginForm />
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm flex items-center justify-center gap-2">
            <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 111.414 1.414L7.414 9l3.293 3.293a1 1 0 11-1.414 1.414l-4-4z" clipRule="evenodd" />
            </svg>
            HIPAA-Compliant Secure Access
          </p>
          <p className="text-xs text-slate-600 mt-3">Enterprise-grade security • Data encryption • Multi-factor authentication</p>
        </div>

        {/* Version Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-700">v2.0 • Security Enhanced</p>
        </div>
      </div>
    </div>
  );
}
