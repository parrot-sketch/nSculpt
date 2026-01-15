'use client';

import { useState, FormEvent } from 'react';
import { authService } from '@/services/auth.service';
import type { MfaSetupResponse } from '@/types/auth';

interface MfaSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
}

export function MfaSetupModal({ isOpen, onClose, onComplete }: MfaSetupModalProps) {
    const [step, setStep] = useState<'loading' | 'qr' | 'verify' | 'complete'>('loading');
    const [setupData, setSetupData] = useState<MfaSetupResponse | null>(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);

    // Initialize MFA setup when modal opens
    useState(() => {
        if (isOpen && step === 'loading') {
            initiateMfaSetup();
        }
    });

    const initiateMfaSetup = async () => {
        try {
            setError(null);
            const data = await authService.setupMfa();
            setSetupData(data);
            setStep('qr');
        } catch (err: any) {
            setError(err?.response?.data?.message || err?.message || 'Failed to initiate MFA setup');
            setStep('qr'); // Still show modal to display error
        }
    };

    const handleVerifyCode = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (verificationCode.length !== 6) {
            setError('Please enter a 6-digit code');
            return;
        }

        setIsVerifying(true);
        setError(null);

        try {
            await authService.completeMfaSetup(verificationCode);
            setStep('complete');
        } catch (err: any) {
            setError(err?.response?.data?.message || err?.message || 'Invalid code. Please try again.');
            setVerificationCode('');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleComplete = () => {
        onComplete();
        onClose();
        // Reset state for next time
        setStep('loading');
        setSetupData(null);
        setVerificationCode('');
        setError(null);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                    onClick={onClose}
                />

                {/* Modal */}
                <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Loading state */}
                    {step === 'loading' && (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                            <p className="text-neutral-600">Setting up MFA...</p>
                        </div>
                    )}

                    {/* QR Code step */}
                    {step === 'qr' && setupData && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <h2 className="text-2xl font-semibold text-neutral-900 mb-2">
                                    Enable Two-Factor Authentication
                                </h2>
                                <p className="text-sm text-neutral-600">
                                    Scan this QR code with your authenticator app
                                </p>
                            </div>

                            {/* QR Code */}
                            <div className="flex justify-center p-4 bg-neutral-50 rounded-lg">
                                <img
                                    src={setupData.qrCode}
                                    alt="MFA QR Code"
                                    className="w-48 h-48"
                                />
                            </div>

                            {/* Manual entry option */}
                            <div className="text-center">
                                <p className="text-xs text-neutral-500 mb-2">
                                    Can't scan? Enter this code manually:
                                </p>
                                <code className="text-sm font-mono bg-neutral-100 px-3 py-1 rounded">
                                    {setupData.secret}
                                </code>
                            </div>

                            {/* Backup codes */}
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <h3 className="text-sm font-semibold text-yellow-900 mb-2">
                                    Backup Codes
                                </h3>
                                <p className="text-xs text-yellow-800 mb-3">
                                    Save these codes in a secure place. You can use them to access your account if you lose your device.
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    {setupData.backupCodes.map((code, index) => (
                                        <code key={index} className="text-xs font-mono bg-white px-2 py-1 rounded">
                                            {code}
                                        </code>
                                    ))}
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                                    <p className="text-sm text-red-800">{error}</p>
                                </div>
                            )}

                            <button
                                onClick={() => setStep('verify')}
                                className="w-full py-2.5 px-4 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
                            >
                                Continue to Verification
                            </button>
                        </div>
                    )}

                    {/* Verification step */}
                    {step === 'verify' && (
                        <form onSubmit={handleVerifyCode} className="space-y-6">
                            <div className="text-center">
                                <h2 className="text-2xl font-semibold text-neutral-900 mb-2">
                                    Verify Setup
                                </h2>
                                <p className="text-sm text-neutral-600">
                                    Enter the 6-digit code from your authenticator app
                                </p>
                            </div>

                            <div>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                                    placeholder="000000"
                                    maxLength={6}
                                    autoComplete="off"
                                    autoFocus
                                    required
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                                    <p className="text-sm text-red-800">{error}</p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setStep('qr')}
                                    className="flex-1 py-2.5 px-4 border border-neutral-300 text-neutral-700 rounded-md hover:bg-neutral-50 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={isVerifying || verificationCode.length !== 6}
                                    className="flex-1 py-2.5 px-4 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isVerifying ? 'Verifying...' : 'Verify'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Complete step */}
                    {step === 'complete' && (
                        <div className="text-center space-y-6 py-4">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-2xl font-semibold text-neutral-900 mb-2">
                                    MFA Enabled Successfully!
                                </h2>
                                <p className="text-sm text-neutral-600">
                                    Your account is now protected with two-factor authentication.
                                </p>
                            </div>
                            <button
                                onClick={handleComplete}
                                className="w-full py-2.5 px-4 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
                            >
                                Continue
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
