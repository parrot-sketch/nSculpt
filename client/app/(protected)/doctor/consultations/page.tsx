'use client';

import { useConsultations } from '@/hooks/useConsultations';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import Link from 'next/link';
import { FileText, Calendar, User, ArrowRight, Loader2 } from 'lucide-react';
import { getFullName } from '@/lib/utils';
import { ConsultationStatusBadge } from '@/components/consultations/ConsultationStatusBadge';
import type { ConsultationStatus } from '@/services/consultation.service';

/**
 * Clinician Consultations Page
 * 
 * Lists all consultations for the current clinician.
 * Allows navigation to consultation editor.
 */
export default function ClinicianConsultationsPage() {
  const { user } = useAuth();
  const { data: consultationsData, isLoading, error } = useConsultations(0, 50, {
    doctorId: user?.id,
  });

  const consultations = consultationsData?.data || [];

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
          <p className="text-rose-800 font-medium">Error loading consultations</p>
          <p className="text-rose-600 text-sm mt-2">
            {(error as any)?.message || 'Failed to load consultations'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">My Consultations</h1>
        <p className="text-slate-600 mt-1">View and manage your clinical consultations</p>
      </div>

      {/* Consultations List */}
      {consultations.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-200">
            {consultations.map((consultation) => (
              <Link
                key={consultation.id}
                href={`/doctor/appointments/${consultation.appointmentId}/consultation`}
                className="block p-6 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="h-12 w-12 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-semibold text-slate-900">
                          Consultation #{consultation.consultationNumber}
                        </p>
                        <ConsultationStatusBadge status={consultation.status} />
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(consultation.consultationDate), 'MMMM d, yyyy')}
                        </div>
                        {consultation.patient && (
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {getFullName(consultation.patient.firstName || '', consultation.patient.lastName || '')}
                          </div>
                        )}
                      </div>
                      {consultation.chiefComplaint && (
                        <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                          {consultation.chiefComplaint}
                        </p>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Consultations</h3>
          <p className="text-slate-600">
            You haven't created any consultations yet. Consultations are created when you complete appointments.
          </p>
        </div>
      )}
    </div>
  );
}
