'use client';

import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

interface PatientAccountCreationSectionProps {
  createUserAccount: boolean;
  email: string;
  password: string;
  passwordConfirm: string;
  onToggleAccountCreation: (value: boolean) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onPasswordConfirmChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Patient Account Creation Section
 * 
 * Clean, reusable component for account creation during patient registration.
 * Follows Single Responsibility Principle: handles only account creation UI.
 */
export function PatientAccountCreationSection({
  createUserAccount,
  email,
  password,
  passwordConfirm,
  onToggleAccountCreation,
  onEmailChange,
  onPasswordChange,
  onPasswordConfirmChange,
  onKeyDown,
}: PatientAccountCreationSectionProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const isPasswordValid = password.length >= 8;
  const doPasswordsMatch = password === passwordConfirm || passwordConfirm === '';

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <div className="flex items-start gap-3 mb-4">
        <input
          type="checkbox"
          id="createUserAccount"
          checked={createUserAccount}
          onChange={(e) => onToggleAccountCreation(e.target.checked)}
          className="mt-1 w-4 h-4 text-primary border-neutral-300 rounded focus:ring-primary"
        />
        <div className="flex-1">
          <label htmlFor="createUserAccount" className="text-sm font-semibold text-neutral-900 cursor-pointer">
            Create user account for patient portal access
          </label>
          <p className="text-xs text-neutral-600 mt-1">
            Patient will be able to login and access their dashboard after registration
          </p>
        </div>
      </div>

      {createUserAccount && (
        <div className="mt-4 space-y-4 pl-7 border-l-2 border-blue-300">
          {/* Email Field */}
          <div>
            <label htmlFor="accountEmail" className="block text-sm font-medium text-neutral-700 mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                id="accountEmail"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                onKeyDown={onKeyDown}
                required={createUserAccount}
                className="w-full px-4 py-2 pl-11 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                placeholder="patient@example.com"
              />
              <Mail className="absolute left-3 top-2.5 w-5 h-5 text-neutral-400 pointer-events-none" />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="accountPassword" className="block text-sm font-medium text-neutral-700 mb-2">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="accountPassword"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                onKeyDown={onKeyDown}
                required={createUserAccount}
                minLength={8}
                className="w-full px-4 py-2 pl-11 pr-11 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                placeholder="Minimum 8 characters"
              />
              <Lock className="absolute left-3 top-2.5 w-5 h-5 text-neutral-400 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {password && !isPasswordValid && (
              <p className="mt-1 text-xs text-red-600">Password must be at least 8 characters</p>
            )}
          </div>

          {/* Password Confirmation Field */}
          <div>
            <label htmlFor="accountPasswordConfirm" className="block text-sm font-medium text-neutral-700 mb-2">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPasswordConfirm ? 'text' : 'password'}
                id="accountPasswordConfirm"
                value={passwordConfirm}
                onChange={(e) => onPasswordConfirmChange(e.target.value)}
                onKeyDown={onKeyDown}
                required={createUserAccount}
                className="w-full px-4 py-2 pl-11 pr-11 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                placeholder="Re-enter password"
              />
              <Lock className="absolute left-3 top-2.5 w-5 h-5 text-neutral-400 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-600"
              >
                {showPasswordConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {passwordConfirm && !doPasswordsMatch && (
              <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
