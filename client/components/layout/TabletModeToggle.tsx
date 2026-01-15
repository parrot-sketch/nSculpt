'use client';

import { useTabletMode } from '@/contexts/TabletModeContext';
import { useState } from 'react';

/**
 * Tablet Mode Toggle Component
 * 
 * Allows front desk staff to switch between:
 * - Front Desk Mode: Normal admin/staff interface
 * - Patient Mode: Patient self-registration interface
 * 
 * Designed for tablet/kiosk use in the front desk area.
 */

export function TabletModeToggle() {
  const { mode, isPatientMode, switchToPatientMode, switchToFrontDeskMode } = useTabletMode();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleToggle = () => {
    if (isPatientMode) {
      // Switching back to front desk mode - no confirmation needed
      switchToFrontDeskMode();
    } else {
      // Switching to patient mode - show confirmation
      setShowConfirm(true);
    }
  };

  const handleConfirm = () => {
    switchToPatientMode();
    setShowConfirm(false);
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  return (
    <>
      <div className="flex items-center gap-3">
        {/* Mode Indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isPatientMode ? 'bg-green-500 animate-pulse' : 'bg-blue-500'
            }`}
            title={isPatientMode ? 'Patient Mode Active' : 'Front Desk Mode Active'}
          />
          <span className="text-sm font-medium text-neutral-700 hidden sm:inline">
            {isPatientMode ? 'Patient Mode' : 'Front Desk Mode'}
          </span>
        </div>

        {/* Toggle Button */}
        <button
          onClick={handleToggle}
          className={`
            relative inline-flex h-8 w-14 items-center rounded-full transition-colors
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${isPatientMode ? 'bg-green-500' : 'bg-neutral-300'}
          `}
          aria-label={isPatientMode ? 'Switch to Front Desk Mode' : 'Switch to Patient Mode'}
        >
          <span
            className={`
              inline-block h-6 w-6 transform rounded-full bg-white transition-transform
              ${isPatientMode ? 'translate-x-7' : 'translate-x-1'}
            `}
          />
        </button>

        {/* Mode Label */}
        <span className="text-xs text-neutral-500 hidden md:inline">
          {isPatientMode ? 'Patient Registration' : 'Staff Interface'}
        </span>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
              Switch to Patient Mode?
            </h3>
            <p className="text-neutral-600 mb-6">
              This will switch the tablet to patient registration mode. The patient will be able to
              fill out their registration form. The tablet will automatically return to front desk
              mode after 30 minutes or when you manually switch it back.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Switch to Patient Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}






