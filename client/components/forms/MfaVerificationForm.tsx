'use client';

import { useState, FormEvent, useRef, useEffect } from 'react';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';

export function MfaVerificationForm() {
    const router = useRouter();
    const { tempToken, setUser, setError, clearMfaChallenge } = useAuthStore();
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!tempToken) {
            setLocalError('Session expired. Please login again.');
            return;
        }

        if (code.length !== 6) {
            setLocalError('Please enter a 6-digit code');
            return;
        }

        setIsLoading(true);
        setLocalError(null);
        setError(null);

        try {
            const response = await authService.verifyMfa({ tempToken, code });
            const { user: userData, sessionId } = response;

            // Update auth store with user data
            setUser(userData, sessionId);
            clearMfaChallenge();

            // Redirect based on user role
            const isAdmin = userData.roles?.includes('ADMIN');
            router.push(isAdmin ? '/admin' : '/dashboard');
        } catch (err: any) {
            const errorMessage =
                err?.response?.data?.message ||
                err?.message ||
                'Invalid MFA code. Please try again.';
            setLocalError(errorMessage);
            setCode(''); // Clear code on error
            inputRef.current?.focus();
        } finally {
            setIsLoading(false);
        }
    };

    const handleCodeChange = (value: string) => {
        // Only allow digits, max 6 characters
        const sanitized = value.replace(/\D/g, '').slice(0, 6);
        setCode(sanitized);
        setLocalError(null);
    };

    return (
        <div className="w-full max-w-2xl">
            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Header */}
                <div className="text-center space-y-3">
                    <div className="flex justify-center mb-4">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
                            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900">Verify Your Identity</h1>
                    <p className="text-base text-slate-600">Enter the 6-digit code from your authenticator app</p>
                </div>

                <div className="space-y-3">
                    <label htmlFor="mfa-code" className="block text-sm font-semibold text-slate-700">
                        6-Digit Authentication Code
                    </label>
                    <input
                        ref={inputRef}
                        id="mfa-code"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={code}
                        onChange={(e) => handleCodeChange(e.target.value)}
                        className="w-full px-5 py-4 border-2 border-slate-200 rounded-xl text-center text-4xl font-bold tracking-widest focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                        placeholder="000000"
                        maxLength={6}
                        autoComplete="one-time-code"
                        required
                        disabled={isLoading}
                    />
                    <p className="text-xs text-slate-500 text-center">Enter 6 digits without spaces</p>
                </div>

                {localError && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3">
                        <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-red-800 font-medium">{localError}</p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading || code.length !== 6}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-300 disabled:to-slate-400 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isLoading && (
                        <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    )}
                    {isLoading ? 'Verifying...' : 'Verify Code'}
                </button>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-sm text-blue-900 flex items-center gap-2">
                        <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1a1 1 0 11-2 0 1 1 0 012 0zm3 0a1 1 0 11-2 0 1 1 0 012 0zm3 0a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
                        </svg>
                        Open your authenticator app and find the 6-digit code for this account
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        clearMfaChallenge();
                        setCode('');
                    }}
                    className="w-full py-3 px-4 border-2 border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    ← Back to Login
                </button>
            </form>
        </div>
    );
}
