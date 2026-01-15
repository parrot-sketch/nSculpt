'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';
import type { MfaSetupResponse } from '@/types/auth';

/**
 * MFA Setup Form Component
 * 
 * Professional, modern UI for setting up two-factor authentication
 * Displayed when a user with a sensitive role logs in without MFA enabled
 */
export function MfaSetupForm() {
  const router = useRouter();
  const { tempToken, setUser, clearMfaSetup } = useAuthStore();
  
  const [step, setStep] = useState<'setup' | 'verify' | 'complete'>('setup');
  const [setupData, setSetupData] = useState<MfaSetupResponse | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [backupCodesVisible, setBackupCodesVisible] = useState(false);
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  // Initialize MFA setup when component mounts
  useEffect(() => {
    if (step === 'setup' && !setupData && tempToken) {
      initiateMfaSetup();
    }
  }, [step, setupData, tempToken]);

  const initiateMfaSetup = async () => {
    try {
      setError(null);
      setIsLoading(true);

      const response = await authService.setupMfa(tempToken);
      setSetupData(response);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to initiate MFA setup';
      setError(errorMsg);
      console.error('MFA setup error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const authResult = await authService.completeMfaSetup(verificationCode, tempToken);
      
      setUser(authResult.user, authResult.sessionId);
      clearMfaSetup();
      
      setStep('complete');

      setTimeout(() => {
        const isAdmin = authResult.user.roles?.includes('ADMIN');
        router.push(isAdmin ? '/admin' : '/dashboard');
      }, 1500);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Invalid code. Please try again.';
      setError(errorMsg);
      setVerificationCode('');
      console.error('MFA verification error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const copyBackupCodes = () => {
    if (!setupData?.backupCodes) return;
    
    const text = setupData.backupCodes.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
    });
  };

  return (
    <div className="w-full max-w-2xl">
      {/* Loading State */}
      {isLoading && step === 'setup' && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="relative w-16 h-16 mb-6">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 opacity-20"></div>
            <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-blue-600 border-r-purple-600 animate-spin"></div>
          </div>
          <p className="text-lg text-slate-600 font-medium">Preparing your authentication...</p>
          <p className="text-sm text-slate-500 mt-2">This usually takes a few seconds</p>
        </div>
      )}

      {/* Setup Step - Display QR Code */}
      {step === 'setup' && setupData && (
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="flex justify-center mb-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Set Up Two-Factor Authentication</h1>
            <p className="text-base text-slate-600 max-w-md mx-auto leading-relaxed">
              Secure your account with an additional layer of protection. You'll need an authenticator app to proceed.
            </p>
          </div>

          {/* QR Code Section */}
          <div className="bg-gradient-to-b from-slate-50 to-white rounded-2xl border border-slate-200 p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-col items-center space-y-4">
              <p className="text-sm font-medium text-slate-600">Scan this QR code</p>
              <div className="bg-white p-6 rounded-xl border-2 border-slate-100 shadow-sm">
                <img
                  src={setupData.qrCodeDataUrl || setupData.qrCode}
                  alt="MFA Setup QR Code"
                  className="w-56 h-56"
                  title="Scan with authenticator app"
                />
              </div>
              <div className="flex flex-wrap gap-2 justify-center pt-2">
                <span className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium rounded-full">Google Authenticator</span>
                <span className="px-3 py-1 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-medium rounded-full">Microsoft Authenticator</span>
                <span className="px-3 py-1 bg-slate-100 border border-slate-300 text-slate-700 text-xs font-medium rounded-full">Authy</span>
              </div>
            </div>
          </div>

          {/* Manual Entry Alternative */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900">Can't scan the QR code?</p>
                <p className="text-sm text-amber-800 mt-1">Enter this secret key manually in your authenticator app:</p>
                <div className="mt-3 bg-white border border-amber-300 rounded-lg px-4 py-3 font-mono text-center text-sm text-slate-700 break-all select-all tracking-wider hover:bg-amber-50 transition-colors">
                  {setupData.secret}
                </div>
              </div>
            </div>
          </div>

          {/* Backup Codes */}
          <div className="border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition-colors">
            <button
              type="button"
              onClick={() => setBackupCodesVisible(!backupCodesVisible)}
              className="w-full px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-150 flex items-center justify-between transition-all group"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-slate-600 group-hover:text-slate-700" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
                </svg>
                <span className="font-semibold text-slate-700">Save Backup Codes</span>
              </div>
              <svg className={`w-5 h-5 text-slate-500 transition-transform ${backupCodesVisible ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            
            {backupCodesVisible && (
              <div className="border-t border-slate-200 bg-white p-6 space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-red-900 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Save these codes in a secure location
                  </p>
                  <p className="text-sm text-red-800 mt-2">Each code can only be used once. Keep them safe in case you lose access to your authenticator app.</p>
                </div>
                <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-lg p-4">
                  {setupData.backupCodes?.map((code, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded px-3 py-2">
                      <div className="text-xs font-mono text-slate-600">{code}</div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={copyBackupCodes}
                  className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                    showCopySuccess
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 011 1v1h2V4a1 1 0 011-1h2.757a1 1 0 01.986.836l.74 4.435a1 1 0 01-.99 1.144H17v4a2 2 0 01-2 2h-2.5a2.5 2.5 0 01-2.5-2.5V10h-3v4a2 2 0 01-2 2H3a2 2 0 01-2-2V9H.257a1 1 0 01-.99-1.144l.74-4.435A1 1 0 012.243 3H5V2z" />
                  </svg>
                  {showCopySuccess ? 'Copied to clipboard!' : 'Copy All Codes'}
                </button>
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={() => setStep('verify')}
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-300 disabled:to-slate-400 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:shadow-none disabled:cursor-not-allowed"
          >
            {isLoading ? 'Setting up...' : 'Next: Verify Your Code'}
          </button>
        </div>
      )}

      {/* Verify Step - Accept 6-digit Code */}
      {step === 'verify' && (
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="flex justify-center mb-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Verify Your Code</h1>
            <p className="text-base text-slate-600">Enter the 6-digit code from your authenticator app to complete setup</p>
          </div>

          <form onSubmit={handleVerifyCode} className="space-y-6">
            <div className="space-y-3">
              <label htmlFor="code" className="block text-sm font-semibold text-slate-700">
                6-Digit Authentication Code
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                pattern="[0-9]*"
                value={verificationCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setVerificationCode(val);
                }}
                placeholder="000000"
                className="w-full px-5 py-4 border-2 border-slate-200 rounded-xl text-center text-4xl font-bold tracking-widest focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                disabled={isLoading}
                autoComplete="one-time-code"
                required
              />
              <p className="text-xs text-slate-500 text-center">Enter 6 digits without spaces</p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-800 font-medium">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep('setup')}
                disabled={isLoading}
                className="flex-1 py-3 px-4 border-2 border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading || verificationCode.length !== 6}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-slate-300 disabled:to-slate-400 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:shadow-none disabled:cursor-not-allowed"
              >
                {isLoading ? 'Verifying...' : 'Complete Setup'}
              </button>
            </div>
          </form>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-900 flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1a1 1 0 11-2 0 1 1 0 012 0zm3 0a1 1 0 11-2 0 1 1 0 012 0zm3 0a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
              </svg>
              Open your authenticator app and find the 6-digit code for this account
            </p>
          </div>
        </div>
      )}

      {/* Complete Step - Success */}
      {step === 'complete' && (
        <div className="space-y-8 text-center py-8">
          <div className="flex justify-center">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 animate-pulse"></div>
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200">
                <svg className="w-10 h-10 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-slate-900">Setup Complete!</h2>
            <p className="text-base text-slate-600 max-w-md mx-auto">
              Your account is now protected with two-factor authentication. You're being redirected to your dashboard...
            </p>
          </div>

          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
