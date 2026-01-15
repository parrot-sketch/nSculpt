'use client';

import { usePatientProfile } from '@/hooks/usePatientSelf';
import { useConsultationOutcomes } from '@/hooks/useConsultations';
import { format } from 'date-fns';
import Link from 'next/link';
import { FileText, Calendar, Stethoscope, ArrowLeft, Loader2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { getFullName } from '@/lib/utils';
import { ConsultationViewer } from '@/components/consultations/ConsultationViewer';
import { ConsultationStatusBadge } from '@/components/consultations/ConsultationStatusBadge';

/**
 * Patient Consultations Page
 * 
 * Allows patients to view their finalized consultations.
 * Read-only view of clinical documentation.
 */
export default function PatientConsultationsPage() {
  const { data: patient } = usePatientProfile();
  const { data: consultations, isLoading, error } = useConsultationOutcomes(patient?.id || null);

  // Group consultations by outcome
  const consultationsByOutcome = {
    NO_ACTION: consultations?.filter(c => c.consultationOutcome === 'NO_ACTION') || [],
    PROCEDURE_PLANNED: consultations?.filter(c => c.consultationOutcome === 'PROCEDURE_PLANNED') || [],
    FOLLOW_UP: consultations?.filter(c => c.consultationOutcome === 'FOLLOW_UP') || [],
    CONSERVATIVE: consultations?.filter(c => c.consultationOutcome === 'CONSERVATIVE') || [],
    REFERRED: consultations?.filter(c => c.consultationOutcome === 'REFERRED') || [],
  };

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
        <Link
          href="/patient/dashboard"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-slate-900">My Consultations</h1>
        <p className="text-slate-600 mt-1">View your medical consultation reports</p>
      </div>

      {/* Consultations List with Outcomes */}
      {consultations && consultations.length > 0 ? (
        <div className="space-y-6">
          {consultations.map((consultation) => {
            const outcome = consultation.consultationOutcome;
            const procedurePlans = (consultation as any).procedurePlans || [];
            const followUpPlans = (consultation as any).followUpPlans || [];

            return (
              <div
                key={consultation.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      Consultation #{consultation.consultationNumber}
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {format(new Date(consultation.consultationDate), 'MMMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <ConsultationStatusBadge status={consultation.status} />
                    {outcome && (
                      <OutcomeBadge outcome={outcome} />
                    )}
                  </div>
                </div>

                {consultation.doctor && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
                    <Stethoscope className="h-4 w-4" />
                    <span>
                      Dr. {getFullName(consultation.doctor.firstName || '', consultation.doctor.lastName || '')}
                    </span>
                  </div>
                )}

                {consultation.chiefComplaint && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-slate-700 mb-1">Chief Complaint</p>
                    <p className="text-sm text-slate-600 line-clamp-2">{consultation.chiefComplaint}</p>
                  </div>
                )}

                {/* Procedure Plans Summary */}
                {procedurePlans.length > 0 && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-medium text-slate-900 mb-2">Procedure Plans</p>
                    <div className="space-y-2">
                      {procedurePlans.map((plan: any) => (
                        <div key={plan.id} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-700">{plan.procedureName}</p>
                            <p className="text-xs text-slate-500">
                              {plan.planType} • {plan.status}
                              {plan.planType === 'SERIES' && (
                                <span> • Session {plan.currentSession} of {plan.sessionCount}</span>
                              )}
                            </p>
                          </div>
                          <Link
                            href={`/patient/procedure-plans/${plan.id}`}
                            className="text-xs text-indigo-600 hover:text-indigo-700"
                          >
                            View →
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Follow-Up Plans Summary */}
                {followUpPlans.length > 0 && (
                  <div className="mb-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <p className="text-sm font-medium text-slate-900 mb-2">Follow-Up Plans</p>
                    <div className="space-y-2">
                      {followUpPlans.map((plan: any) => (
                        <div key={plan.id} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-700">{plan.followUpType}</p>
                            <p className="text-xs text-slate-500">
                              {plan.status}
                              {plan.scheduledDate && (
                                <span> • {format(new Date(plan.scheduledDate), 'MMM d, yyyy')}</span>
                              )}
                            </p>
                          </div>
                          <Link
                            href={`/patient/follow-ups/${plan.id}`}
                            className="text-xs text-indigo-600 hover:text-indigo-700"
                          >
                            View →
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Link
                  href={`/patient/consultations/${consultation.id}`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  View Full Report
                  <ArrowLeft className="h-4 w-4 rotate-180" />
                </Link>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Consultations Available</h3>
          <p className="text-slate-600">
            You don't have any finalized consultations yet. Consultations become available after your appointments are completed.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Outcome Badge Component
 */
function OutcomeBadge({ outcome }: { outcome: string }) {
  const outcomeConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    NO_ACTION: {
      label: 'Consult Only',
      className: 'bg-slate-100 text-slate-800',
      icon: CheckCircle2,
    },
    PROCEDURE_PLANNED: {
      label: 'Procedure Planned',
      className: 'bg-blue-100 text-blue-800',
      icon: Calendar,
    },
    FOLLOW_UP: {
      label: 'Follow-Up Required',
      className: 'bg-emerald-100 text-emerald-800',
      icon: Clock,
    },
    CONSERVATIVE: {
      label: 'Conservative Management',
      className: 'bg-yellow-100 text-yellow-800',
      icon: AlertCircle,
    },
    REFERRED: {
      label: 'Referred',
      className: 'bg-orange-100 text-orange-800',
      icon: AlertCircle,
    },
  };

  const config = outcomeConfig[outcome] || {
    label: outcome,
    className: 'bg-gray-100 text-gray-800',
    icon: FileText,
  };

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}
