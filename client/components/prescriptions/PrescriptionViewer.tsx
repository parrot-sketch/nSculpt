'use client';

import { usePrescription } from '@/hooks/usePrescriptions';
import { format } from 'date-fns';
import { Pill, Calendar, User, Stethoscope, Loader2, AlertCircle } from 'lucide-react';
import { getFullName } from '@/lib/utils';
import { PrescriptionStatusBadge } from './PrescriptionStatusBadge';

interface PrescriptionViewerProps {
  prescriptionId: string;
}

/**
 * Prescription Viewer Component
 * 
 * Read-only view of a prescription.
 * Used by patients and non-clinician roles.
 */
export function PrescriptionViewer({ prescriptionId }: PrescriptionViewerProps) {
  const { data: prescription, isLoading, error } = usePrescription(prescriptionId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-rose-800 font-medium">Error loading prescription</p>
            <p className="text-rose-700 text-sm mt-1">
              {(error as any)?.message || 'Failed to load prescription details'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!prescription) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center">
        <Pill className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-600 font-medium">Prescription not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Prescription</h2>
            <p className="text-sm text-slate-600 mt-1">
              Prescribed on {format(new Date(prescription.prescribedAt), 'MMMM d, yyyy')}
            </p>
          </div>
          <PrescriptionStatusBadge status={prescription.status} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200">
          {prescription.prescribedBy && (
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Prescribed By</p>
                <p className="text-sm font-medium text-slate-900">
                  Dr. {getFullName(prescription.prescribedBy.firstName || '', prescription.prescribedBy.lastName || '')}
                </p>
              </div>
            </div>
          )}
          {prescription.consultation && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Consultation</p>
                <p className="text-sm font-medium text-slate-900">
                  #{prescription.consultation.consultationNumber}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Medication Details */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Medication Details</h3>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-slate-700 mb-1">Medication Name</p>
              <p className="text-slate-900 font-semibold">{prescription.medicationName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-1">Type</p>
              <p className="text-slate-900">{prescription.medicationType}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-1">Dosage</p>
              <p className="text-slate-900">{prescription.dosage}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-1">Frequency</p>
              <p className="text-slate-900">{prescription.frequency}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-1">Quantity</p>
              <p className="text-slate-900">{prescription.quantity}</p>
            </div>
            {prescription.duration && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-1">Duration</p>
                <p className="text-slate-900">{prescription.duration}</p>
              </div>
            )}
          </div>

          {prescription.instructions && (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-1">Instructions</p>
              <p className="text-slate-900 whitespace-pre-wrap">{prescription.instructions}</p>
            </div>
          )}

          {prescription.refills > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-1">Refills</p>
              <p className="text-slate-900">
                {prescription.refillsRemaining} of {prescription.refills} remaining
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
