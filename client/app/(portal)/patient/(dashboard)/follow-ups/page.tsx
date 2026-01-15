'use client';

import { usePatientProfile } from '@/hooks/usePatientSelf';
import { useFollowUpPlansByPatient } from '@/hooks/useFollowUpPlans';
import { format } from 'date-fns';
import Link from 'next/link';
import { Calendar, Clock, CheckCircle2, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { FollowUpPlanStatus } from '@/services/follow-up-plan.service';
import { getFullName } from '@/lib/utils';

/**
 * Patient Follow-Ups Page
 * 
 * Displays pending and completed follow-ups with reason and scheduled dates.
 */
export default function PatientFollowUpsPage() {
  const { data: patient } = usePatientProfile();
  const { data: followUps, isLoading, error } = useFollowUpPlansByPatient(patient?.id || null);

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
          <p className="text-rose-800 font-medium">Error loading follow-ups</p>
          <p className="text-rose-600 text-sm mt-2">
            {(error as any)?.message || 'Failed to load follow-ups'}
          </p>
        </div>
      </div>
    );
  }

  const pendingFollowUps = (followUps || []).filter(
    (f) => f.status === FollowUpPlanStatus.PENDING || f.status === FollowUpPlanStatus.SCHEDULED
  );
  const completedFollowUps = (followUps || []).filter(
    (f) => f.status === FollowUpPlanStatus.COMPLETED
  );

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
        <h1 className="text-3xl font-bold text-slate-900">My Follow-Ups</h1>
        <p className="text-slate-600 mt-1">View your scheduled and completed follow-ups</p>
      </div>

      {/* Pending Follow-Ups */}
      {pendingFollowUps.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Upcoming Follow-Ups</h2>
          <div className="space-y-4">
            {pendingFollowUps.map((followUp) => (
              <FollowUpCard key={followUp.id} followUp={followUp} />
            ))}
          </div>
        </div>
      )}

      {/* Completed Follow-Ups */}
      {completedFollowUps.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Completed Follow-Ups</h2>
          <div className="space-y-4">
            {completedFollowUps.map((followUp) => (
              <FollowUpCard key={followUp.id} followUp={followUp} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!followUps || followUps.length === 0) && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <Calendar className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Follow-Ups</h3>
          <p className="text-slate-600">
            You don't have any follow-up plans yet. Follow-ups are created after consultations.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Follow-Up Card Component
 */
function FollowUpCard({ followUp }: { followUp: any }) {
  const isPending = followUp.status === FollowUpPlanStatus.PENDING;
  const isScheduled = followUp.status === FollowUpPlanStatus.SCHEDULED;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900 mb-1">
            {followUp.followUpType.replace('_', ' ')}
          </h3>
          {followUp.consultation && (
            <p className="text-sm text-slate-600">
              From consultation on {format(new Date(followUp.consultation.consultationDate), 'MMM d, yyyy')}
            </p>
          )}
        </div>
        <StatusBadge status={followUp.status} />
      </div>

      {followUp.reason && (
        <div className="mb-4">
          <p className="text-sm font-medium text-slate-700 mb-1">Reason</p>
          <p className="text-sm text-slate-600">{followUp.reason}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {followUp.scheduledDate && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="h-4 w-4" />
            <span>Scheduled: {format(new Date(followUp.scheduledDate), 'MMMM d, yyyy')}</span>
          </div>
        )}
        {followUp.intervalDays && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Clock className="h-4 w-4" />
            <span>{followUp.intervalDays} days after consultation</span>
          </div>
        )}
      </div>

      {followUp.appointment && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">Linked Appointment</p>
              <p className="text-sm text-slate-600">
                {format(new Date(followUp.appointment.scheduledStartTime), 'MMMM d, yyyy h:mm a')}
              </p>
            </div>
            <Link
              href={`/patient/appointments`}
              className="text-sm text-indigo-600 hover:text-indigo-700"
            >
              View →
            </Link>
          </div>
        </div>
      )}

      {isPending && (
        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <p className="text-sm text-slate-700">
              This follow-up is pending scheduling. Please contact the clinic to schedule your appointment.
            </p>
          </div>
        </div>
      )}

      {followUp.consultation && (
        <Link
          href={`/patient/consultations/${followUp.consultation.id}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 mt-4"
        >
          View Original Consultation
          <ArrowLeft className="h-4 w-4 rotate-180" />
        </Link>
      )}
    </div>
  );
}

/**
 * Status Badge Component
 */
function StatusBadge({ status }: { status: FollowUpPlanStatus }) {
  const statusConfig: Record<FollowUpPlanStatus, { label: string; className: string }> = {
    PENDING: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
    SCHEDULED: { label: 'Scheduled', className: 'bg-blue-100 text-blue-800' },
    COMPLETED: { label: 'Completed', className: 'bg-emerald-100 text-emerald-800' },
    CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-800' },
  };

  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
