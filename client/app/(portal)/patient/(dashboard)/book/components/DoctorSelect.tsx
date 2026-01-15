'use client';

import { Stethoscope, User, CheckCircle2 } from 'lucide-react';
import { getFullName } from '@/lib/utils';

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  department?: {
    id: string;
    name: string;
    code: string;
  };
}

interface DoctorSelectProps {
  doctors: Doctor[];
  isLoading: boolean;
  selectedDoctorId: string | null;
  onSelect: (doctorId: string | null, doctorName: string | null) => void;
}

/**
 * Step 1: Doctor Selection Component
 * 
 * Allows patient to select a doctor or choose "No preference"
 */
export default function DoctorSelect({
  doctors,
  isLoading,
  selectedDoctorId,
  onSelect,
}: DoctorSelectProps) {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4" />
        <p className="text-slate-500 text-sm">Loading available doctors...</p>
      </div>
    );
  }

  if (doctors.length === 0) {
    return (
      <div className="text-center py-12">
        <Stethoscope className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-600 font-medium mb-2">No doctors available</p>
        <p className="text-slate-500 text-sm">
          Please contact reception to schedule an appointment.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-900 mb-2">Choose Your Clinician</h2>
      <p className="text-slate-600 mb-6">
        Select a doctor for your appointment, or choose "Any available clinician"
      </p>

      <div className="space-y-3">
        {/* No Preference Option */}
        <button
          onClick={() => onSelect(null, null)}
          className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
            selectedDoctorId === null
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  selectedDoctorId === null
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Any Available Clinician</p>
                <p className="text-sm text-slate-500">We'll assign the next available doctor</p>
              </div>
            </div>
            {selectedDoctorId === null && (
              <CheckCircle2 className="h-5 w-5 text-indigo-600" />
            )}
          </div>
        </button>

        {/* Doctor Options */}
        {doctors.map((doctor) => {
          const fullName = getFullName(doctor.firstName, doctor.lastName);
          const isSelected = selectedDoctorId === doctor.id;

          return (
            <button
              key={doctor.id}
              onClick={() => onSelect(doctor.id, fullName)}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      isSelected
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <Stethoscope className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Dr. {fullName}</p>
                    {doctor.department && (
                      <p className="text-sm text-slate-500">{doctor.department.name}</p>
                    )}
                  </div>
                </div>
                {isSelected && <CheckCircle2 className="h-5 w-5 text-indigo-600" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
