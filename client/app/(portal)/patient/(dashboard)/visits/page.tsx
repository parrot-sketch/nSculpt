'use client';

import { usePatientVisits } from '@/hooks/usePatientSelf';
import Link from 'next/link';
import { ArrowLeft, FileText, Calendar, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

/**
 * Patient Visit History Page
 * 
 * Read-only view of patient's visit history.
 * Patients can see their past visits but cannot edit clinical information.
 */
export default function PatientVisitsPage() {
  const { data: visits, isLoading, error } = usePatientVisits();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Loading your visit history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-8">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center">
          <AlertCircle className="h-12 w-12 text-rose-600 mx-auto mb-4" />
          <p className="text-rose-800 font-medium">Unable to load visit history</p>
          <p className="text-rose-600 text-sm mt-2">
            {(error as any)?.message || 'There was a problem loading your visits. Please try again.'}
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
        <h1 className="text-3xl font-bold text-slate-900">Visit History</h1>
        <p className="text-slate-600 mt-1">View your past visits and consultations</p>
      </div>

      {/* Visits List */}
      {visits && visits.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-200">
            {visits.map((visit: any) => {
              const visitDate = visit.periodStart || visit.createdAt || visit.date;
              return (
                <div
                  key={visit.id}
                  className="p-6 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-semibold text-slate-900">
                          {visitDate ? format(new Date(visitDate), 'MMMM d, yyyy') : 'Visit'}
                        </p>
                        {visit.status && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200 capitalize">
                            {visit.status.replace('_', ' ')}
                          </span>
                        )}
                        {visit.class && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 capitalize">
                            {visit.class}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                        {visit.type && (
                          <div className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            {visit.type}
                          </div>
                        )}
                        {visitDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(visitDate), 'h:mm a')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Visit History</h3>
          <p className="text-slate-600">Your visit history will appear here once you have appointments.</p>
        </div>
      )}
    </div>
  );
}
