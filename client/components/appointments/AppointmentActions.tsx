'use client';

import { useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { useAppointmentMutations } from '@/hooks/useAppointments';
import { AppointmentStatus, type Appointment } from '@/services/appointment.service';
import { useAuth } from '@/hooks/useAuth';
import {
  X,
  CheckCircle2,
  Clock,
  Calendar,
  UserX,
  Play,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { format, isPast, isToday, isFuture } from 'date-fns';

interface AppointmentActionsProps {
  appointment: Appointment;
  onCancel?: () => void;
  onReschedule?: () => void;
  onComplete?: () => void;
}

/**
 * Appointment Actions Component
 * 
 * Displays role-based action buttons for appointment lifecycle management.
 * Follows the pattern of ConsentActions.tsx.
 * 
 * Actions are conditionally displayed based on:
 * - User role
 * - Appointment status
 * - Appointment date (past/future)
 * - Appointment ownership (for patients)
 */
export function AppointmentActions({
  appointment,
  onCancel,
  onReschedule,
  onComplete,
}: AppointmentActionsProps) {
  const { user } = useAuth();
  const { roles, hasRole } = usePermissions();
  const {
    cancelAppointment,
    confirmAppointment,
    checkInAppointment,
    rescheduleAppointment,
    markNoShow,
    markInProgress,
    completeAppointment,
  } = useAppointmentMutations();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelNotes, setCancelNotes] = useState('');
  const [paymentId, setPaymentId] = useState('');

  // Role checks
  const isPatient = hasRole('PATIENT');
  const isFrontDesk = hasRole('FRONT_DESK');
  const isAdmin = hasRole('ADMIN');
  const isDoctor = hasRole('DOCTOR') || hasRole('SURGEON');
  const isClinician = isDoctor || hasRole('NURSE');

  // Appointment state checks
  const appointmentDate = new Date(appointment.scheduledStartTime);
  const isPastAppointment = isPast(appointmentDate) && !isToday(appointmentDate);
  const isTodayAppointment = isToday(appointmentDate);
  const isFutureAppointment = isFuture(appointmentDate);
  const isOwnAppointment = isPatient && user?.id && appointment.patientId === user.id;

  // Status checks
  const isPendingPayment = appointment.status === AppointmentStatus.PENDING_PAYMENT || 
                          appointment.status === AppointmentStatus.PAYMENT_PENDING;
  const isConfirmed = appointment.status === AppointmentStatus.CONFIRMED;
  const isCheckedIn = appointment.status === AppointmentStatus.CHECKED_IN;
  const isInProgress = appointment.status === AppointmentStatus.IN_PROGRESS;
  const isCompleted = appointment.status === AppointmentStatus.COMPLETED;
  const isCancelled = appointment.status === AppointmentStatus.CANCELLED || 
                     appointment.status === AppointmentStatus.CANCELLED_AFTER_PAYMENT;
  const isNoShow = appointment.status === AppointmentStatus.NO_SHOW;

  // Terminal states - no actions available
  if (isCompleted || isCancelled || isNoShow) {
    return null;
  }

  // Patient Actions
  const canPatientCancel = isPatient && 
                          isOwnAppointment && 
                          (isPendingPayment || isConfirmed) && 
                          isFutureAppointment;

  // FrontDesk Actions
  const canFrontDeskConfirm = (isFrontDesk || isAdmin) && isPendingPayment;
  const canFrontDeskCheckIn = (isFrontDesk || isAdmin) && isConfirmed && (isTodayAppointment || isPastAppointment);
  const canFrontDeskReschedule = (isFrontDesk || isAdmin) && (isPendingPayment || isConfirmed) && isFutureAppointment;
  const canFrontDeskMarkNoShow = (isFrontDesk || isAdmin) && 
                                 isConfirmed && 
                                 isPastAppointment && 
                                 !isCheckedIn;

  // Clinician Actions
  const canClinicianMarkInProgress = isClinician && 
                                     isCheckedIn && 
                                     (appointment.doctorId === user?.id || isAdmin);
  const canClinicianComplete = isClinician && 
                               isInProgress && 
                               (appointment.doctorId === user?.id || isAdmin);

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      alert('Please provide a cancellation reason');
      return;
    }

    try {
      await cancelAppointment.mutateAsync({
        id: appointment.id,
        cancelDto: {
          cancellationReason: cancelReason,
          cancellationNotes: cancelNotes || undefined,
        },
      });
      setShowCancelModal(false);
      setCancelReason('');
      setCancelNotes('');
      onCancel?.();
    } catch (error: any) {
      alert(error?.message || 'Failed to cancel appointment');
    }
  };

  const handleConfirm = async () => {
    if (!paymentId.trim()) {
      alert('Please provide a payment ID');
      return;
    }

    try {
      await confirmAppointment.mutateAsync({
        id: appointment.id,
        paymentId,
      });
      setShowConfirmModal(false);
      setPaymentId('');
    } catch (error: any) {
      alert(error?.message || 'Failed to confirm appointment');
    }
  };

  const handleCheckIn = async () => {
    try {
      await checkInAppointment.mutateAsync(appointment.id);
    } catch (error: any) {
      alert(error?.message || 'Failed to check in patient');
    }
  };

  const handleMarkNoShow = async () => {
    if (!confirm('Mark this appointment as no-show?')) {
      return;
    }

    try {
      await markNoShow.mutateAsync({ id: appointment.id });
    } catch (error: any) {
      alert(error?.message || 'Failed to mark as no-show');
    }
  };

  const handleMarkInProgress = async () => {
    try {
      await markInProgress.mutateAsync({ id: appointment.id });
    } catch (error: any) {
      alert(error?.message || 'Failed to mark as in-progress');
    }
  };

  const handleComplete = async () => {
    // Navigate to consultation page to create/finalize consultation
    // The consultation page will handle completing the appointment
    if (onComplete) {
      onComplete();
    } else {
      // Navigate to consultation editor for this appointment
      window.location.href = `/doctor/appointments/${appointment.id}/consultation`;
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Patient: Cancel */}
      {canPatientCancel && (
        <button
          onClick={() => setShowCancelModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
          disabled={cancelAppointment.isPending}
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
      )}

      {/* FrontDesk: Confirm Payment */}
      {canFrontDeskConfirm && (
        <button
          onClick={() => setShowConfirmModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
          disabled={confirmAppointment.isPending}
        >
          <CheckCircle2 className="h-4 w-4" />
          Confirm Payment
        </button>
      )}

      {/* FrontDesk: Check In */}
      {canFrontDeskCheckIn && (
        <button
          onClick={handleCheckIn}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
          disabled={checkInAppointment.isPending}
        >
          <Clock className="h-4 w-4" />
          {checkInAppointment.isPending ? 'Checking In...' : 'Check In'}
        </button>
      )}

      {/* FrontDesk: Reschedule */}
      {canFrontDeskReschedule && (
        <button
          onClick={() => onReschedule?.()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Calendar className="h-4 w-4" />
          Reschedule
        </button>
      )}

      {/* FrontDesk: Mark No-Show */}
      {canFrontDeskMarkNoShow && (
        <button
          onClick={handleMarkNoShow}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          disabled={markNoShow.isPending}
        >
          <UserX className="h-4 w-4" />
          {markNoShow.isPending ? 'Marking...' : 'Mark No-Show'}
        </button>
      )}

      {/* Clinician: Mark In-Progress */}
      {canClinicianMarkInProgress && (
        <button
          onClick={handleMarkInProgress}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
          disabled={markInProgress.isPending}
        >
          <Play className="h-4 w-4" />
          {markInProgress.isPending ? 'Starting...' : 'Start Consultation'}
        </button>
      )}

      {/* Clinician: Complete */}
      {canClinicianComplete && (
        <button
          onClick={handleComplete}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
          disabled={completeAppointment.isPending}
        >
          <CheckCircle className="h-4 w-4" />
          {completeAppointment.isPending ? 'Completing...' : 'Complete'}
        </button>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Cancel Appointment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Reason <span className="text-rose-500">*</span>
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select a reason</option>
                  <option value="PATIENT_REQUEST">Patient Request</option>
                  <option value="DOCTOR_UNAVAILABLE">Doctor Unavailable</option>
                  <option value="EMERGENCY">Emergency</option>
                  <option value="WEATHER">Weather</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={cancelNotes}
                  onChange={(e) => setCancelNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Additional details..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                  setCancelNotes('');
                }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCancel}
                disabled={!cancelReason.trim() || cancelAppointment.isPending}
                className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelAppointment.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Payment Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Confirm Payment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Payment ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={paymentId}
                  onChange={(e) => setPaymentId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter payment ID"
                  required
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setPaymentId('');
                }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!paymentId.trim() || confirmAppointment.isPending}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {confirmAppointment.isPending ? 'Confirming...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
