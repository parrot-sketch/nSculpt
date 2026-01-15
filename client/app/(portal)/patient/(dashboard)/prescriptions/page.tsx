'use client';

import { usePatientProfile } from '@/hooks/usePatientSelf';
import { usePrescriptionsByPatient } from '@/hooks/usePrescriptions';
import { format } from 'date-fns';
import Link from 'next/link';
import { Pill, Calendar, Stethoscope, ArrowLeft, Loader2, ArrowRight } from 'lucide-react';
import { getFullName } from '@/lib/utils';
import { PrescriptionStatusBadge } from '@/components/prescriptions/PrescriptionStatusBadge';
import { PrescriptionStatus } from '@/services/prescription.service';

/**
 * Patient Prescriptions Page
 * 
 * Allows patients to view their prescriptions.
 * Shows only finalized/prescribed medications (read-only).
 */
export default function PatientPrescriptionsPage() {
  const { data: patient } = usePatientProfile();
  const { data: prescriptions, isLoading, error } = usePrescriptionsByPatient(patient?.id);

  // Filter to show only active/finalized prescriptions (not cancelled)
  const activePrescriptions = (prescriptions || []).filter(
    (p) => p.status !== PrescriptionStatus.CANCELLED
  );

  // Group by consultation date
  const prescriptionsByDate = activePrescriptions.reduce((acc, prescription) => {
    const date = prescription.consultation?.consultationDate || prescription.prescribedAt;
    const dateKey = format(new Date(date), 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(prescription);
    return acc;
  }, {} as Record<string, typeof activePrescriptions>);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-8">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6">
          <p className="text-rose-800 font-medium">Error loading prescriptions</p>
          <p className="text-rose-600 text-sm mt-2">
            {(error as any)?.message || 'Failed to load prescriptions'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/patient/dashboard"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-slate-900">My Prescriptions</h1>
        <p className="text-slate-600 mt-1">View your medication prescriptions</p>
      </div>

      {/* Prescriptions List */}
      {activePrescriptions.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(prescriptionsByDate)
            .sort(([a], [b]) => b.localeCompare(a)) // Most recent first
            .map(([dateKey, datePrescriptions]) => (
              <div key={dateKey}>
                <h2 className="text-lg font-semibold text-slate-900 mb-4">
                  {format(new Date(dateKey), 'MMMM d, yyyy')}
                </h2>
                <div className="space-y-3">
                  {datePrescriptions.map((prescription) => (
                    <Link
                      key={prescription.id}
                      href={`/patient/prescriptions/${prescription.id}`}
                      className="block bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:border-indigo-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="h-12 w-12 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <Pill className="h-6 w-6 text-indigo-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-slate-900">
                                {prescription.medicationName}
                              </h3>
                              <PrescriptionStatusBadge status={prescription.status} />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-slate-600 mb-2">
                              <div>
                                <span className="font-medium">Dosage:</span> {prescription.dosage}
                              </div>
                              <div>
                                <span className="font-medium">Frequency:</span> {prescription.frequency}
                              </div>
                              <div>
                                <span className="font-medium">Quantity:</span> {prescription.quantity}
                              </div>
                              {prescription.duration && (
                                <div>
                                  <span className="font-medium">Duration:</span> {prescription.duration}
                                </div>
                              )}
                            </div>
                            {prescription.prescribedBy && (
                              <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Stethoscope className="h-4 w-4" />
                                <span>
                                  Dr. {getFullName(prescription.prescribedBy.firstName || '', prescription.prescribedBy.lastName || '')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <Pill className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Prescriptions</h3>
          <p className="text-slate-600">
            You don't have any prescriptions yet. Prescriptions are created by your doctor during consultations.
          </p>
        </div>
      )}
    </div>
  );
}
