'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePatientProfile } from '@/hooks/usePatientSelf';
import { useDoctors, useCreateAppointment } from '@/hooks/useBooking';
import Link from 'next/link';

import {
  ArrowLeft,
  ArrowRight,
  Stethoscope,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import DoctorSelect from './components/DoctorSelect';
import BookingConfirm from './components/BookingConfirm';

const TOTAL_STEPS = 2;
const FINAL_STEP = 2;

const steps = [
  { number: 1, title: 'Choose Clinician', icon: Stethoscope },
  { number: 2, title: 'Confirm Request', icon: CheckCircle2 },
];

/**
 * Patient Appointment Booking Page
 * 
 * Multi-step booking flow:
 * 1. Choose Clinician (doctor or no preference)
 * 2. Select Date & Time (available slots)
 * 3. Confirm Booking (summary and submit)
 */
export default function BookAppointmentPage() {
  const searchParams = useSearchParams();
  const serviceCodeParam = searchParams.get('service');

  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [bookingData, setBookingData] = useState<{
    doctorId: string | null;
    doctorName: string | null;
    date: string | null; // YYYY-MM-DD
    timeSlot: { start: string; end: string } | null;
    reason: string;
    serviceCode: string | null;
  }>({
    doctorId: null,
    doctorName: null,
    date: null,
    timeSlot: null,
    reason: '',
    serviceCode: serviceCodeParam,
  });

  // Update serviceCode if query param changes
  useEffect(() => {
    if (serviceCodeParam && serviceCodeParam !== bookingData.serviceCode) {
      setBookingData(prev => ({ ...prev, serviceCode: serviceCodeParam }));
    }
  }, [serviceCodeParam]);

  // Get patient profile (needed for booking)
  const { data: patient, isLoading: isLoadingProfile } = usePatientProfile();

  // Get doctors list
  const { data: doctors, isLoading: isLoadingDoctors } = useDoctors();

  // Filter doctors based on service eligibility if serviceCode is selected
  const filteredDoctors = useMemo(() => {
    if (!doctors) return [];
    if (!bookingData.serviceCode) return doctors;

    // In a real scenario, we'd fetch only doctors linked to the service from the backend.
    // For now, since the Doctor type on frontend needs updating to include 'services' relation,
    // we'll use a loose filter or assume they are pre-filtered if we had a dedicated hook.
    // Given current types, we'll keep all for now but prepare the structure.
    return doctors;
  }, [doctors, bookingData.serviceCode]);

  // Create appointment mutation
  const createAppointmentMutation = useCreateAppointment();

  // Navigation handlers
  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleDoctorSelect = (doctorId: string | null, doctorName: string | null) => {
    setBookingData((prev) => ({
      ...prev,
      doctorId,
      doctorName,
    }));
  };

  const handleReasonChange = (reason: string) => {
    setBookingData((prev) => ({
      ...prev,
      reason,
    }));
  };

  const handleSubmit = async () => {
    if (!patient?.id || !bookingData.doctorId) {
      return;
    }

    try {
      // NOTE: Using the specialized request endpoint instead of full-slot booking
      await createAppointmentMutation.mutateAsync({
        patientId: patient.id,
        doctorId: bookingData.doctorId,
        appointmentType: 'CONSULTATION',
        reason: bookingData.reason || undefined,
        serviceCode: bookingData.serviceCode || undefined,
      } as any);

      setShowSuccess(true);
    } catch (error) {
      console.error('Booking failed:', error);
    }
  };

  // Success screen
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Appointment Scheduled</h2>
          <p className="text-slate-600 mb-6">
            Your appointment has been successfully scheduled.
          </p>
          {bookingData.doctorName && (
            <div className="bg-slate-50 rounded-lg p-4 mb-6 text-left">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-slate-500" />
                  <span className="text-slate-700">
                    <span className="font-medium">Doctor:</span> {bookingData.doctorName}
                  </span>
                </div>
                <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
                  <p className="text-xs text-indigo-700 font-bold mb-1">STATUS: REQUESTED</p>
                  <p className="text-xs text-indigo-600 leading-relaxed">
                    Our team will contact you shortly to confirm your clinical time slot.
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <Link
              href="/patient/appointments"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              View My Appointments
            </Link>
            <Link
              href="/patient/dashboard"
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-8">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center">
          <AlertCircle className="h-12 w-12 text-rose-600 mx-auto mb-4" />
          <p className="text-rose-800 font-medium">Profile not found</p>
          <p className="text-rose-600 text-sm mt-2">
            Your patient profile could not be found. Please contact support.
          </p>
          <Link
            href="/patient/dashboard"
            className="inline-block mt-4 text-sm text-rose-600 hover:text-rose-800 underline"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Check if step can proceed
  const canProceedToStep2 = bookingData.doctorId !== null;
  const isReadyToSubmit = canProceedToStep2 && bookingData.reason.trim().length > 0;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/patient/appointments"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Appointments
        </Link>
        <h1 className="text-3xl font-bold text-slate-900">Book Appointment</h1>
        <p className="text-slate-600 mt-1">Schedule your consultation</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;
            const isLast = index === steps.length - 1;

            return (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${isActive
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : isCompleted
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-white border-slate-300 text-slate-400'
                      }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      <Icon className="h-6 w-6" />
                    )}
                  </div>
                  <p
                    className={`mt-2 text-xs font-medium ${isActive ? 'text-indigo-600' : isCompleted ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                  >
                    {step.title}
                  </p>
                </div>
                {!isLast && (
                  <div
                    className={`h-0.5 flex-1 mx-4 ${isCompleted ? 'bg-emerald-600' : 'bg-slate-200'
                      }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
        {currentStep === 1 && (
          <DoctorSelect
            doctors={filteredDoctors}
            isLoading={isLoadingDoctors}
            selectedDoctorId={bookingData.doctorId}
            onSelect={handleDoctorSelect}
          />
        )}

        {currentStep === 2 && (
          <BookingConfirm
            bookingData={bookingData}
            patient={patient}
            onReasonChange={handleReasonChange}
            onSubmit={handleSubmit}
            isSubmitting={createAppointmentMutation.isPending}
            error={createAppointmentMutation.error}
            canSubmit={isReadyToSubmit}
          />
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="mt-8 flex justify-between">
        <button
          onClick={handleBack}
          disabled={currentStep === 1}
          className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {currentStep < FINAL_STEP ? (
          <button
            id="next-button"
            onClick={handleNext}
            disabled={currentStep === 1 && !canProceedToStep2}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
