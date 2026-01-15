'use client';

import { Stethoscope, Clock, FileText, AlertCircle } from 'lucide-react';
import type { Patient } from '@/services/patient.service';

interface BookingConfirmProps {
  bookingData: {
    doctorId: string | null;
    doctorName: string | null;
    reason: string;
  };
  patient: Patient;
  onReasonChange: (reason: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  error: Error | null;
  canSubmit: boolean;
}

/**
 * Step 3: Booking Confirmation Component
 * 
 * Shows booking summary and allows patient to enter reason and confirm
 */
export default function BookingConfirm({
  bookingData,
  patient,
  onReasonChange,
  onSubmit,
  isSubmitting,
  error,
  canSubmit,
}: BookingConfirmProps) {
  if (!bookingData.doctorId) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-600 font-medium mb-2">Incomplete details</p>
        <p className="text-slate-500 text-sm">Please select a clinician first</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-900 mb-2">Confirm Your Appointment</h2>
      <p className="text-slate-600 mb-6">Please review your booking details and confirm</p>

      {/* Booking Summary */}
      <div className="bg-slate-50 rounded-lg p-6 mb-6 border border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">
          Appointment Details
        </h3>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Stethoscope className="h-5 w-5 text-slate-500 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Doctor</p>
              <p className="text-sm font-semibold text-slate-900">
                {bookingData.doctorName || 'Any Available Clinician'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-indigo-500 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Scheduling</p>
              <p className="text-sm font-semibold text-indigo-700 italic">
                Our team will assign your time slot after review.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-slate-500 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Patient</p>
              <p className="text-sm font-semibold text-slate-900">
                {patient.firstName} {patient.lastName}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Reason for Visit */}
      <div className="mb-6">
        <label htmlFor="reason" className="block text-sm font-medium text-slate-700 mb-2">
          Reason for Visit <span className="text-rose-500">*</span>
        </label>
        <textarea
          id="reason"
          rows={4}
          value={bookingData.reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="Please describe the reason for your visit..."
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          required
        />
        <p className="mt-2 text-xs text-slate-500">
          This information helps us prepare for your appointment
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-rose-800 font-medium text-sm">Booking failed</p>
            <p className="text-rose-600 text-sm mt-1">
              {(error as any)?.message || 'Unable to book appointment. Please try again.'}
            </p>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        id="confirm-request-button"
        onClick={onSubmit}
        disabled={!canSubmit || isSubmitting}
        className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {isSubmitting ? 'Submitting Request...' : 'Confirm Request'}
      </button>

      <p className="mt-4 text-xs text-center text-slate-500">
        By confirming, you agree to our appointment policies. You will receive a confirmation email shortly.
      </p>
    </div>
  );
}
