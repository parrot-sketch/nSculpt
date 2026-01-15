'use client';

import { useFollowUpPlan } from '@/hooks/useFollowUpPlans';
import { FollowUpPlanStatus } from '@/services/follow-up-plan.service';
import { format } from 'date-fns';
import { Calendar, Clock, Loader2, User, FileText } from 'lucide-react';
import { getFullName } from '@/lib/utils';
import Link from 'next/link';

interface FollowUpPlanViewerProps {
  followUpId: string;
}

/**
 * Follow-Up Plan Viewer Component
 * 
 * Read-only view of a follow-up plan with all details.
 */
export function FollowUpPlanViewer({ followUpId }: FollowUpPlanViewerProps) {
  const { data: followUp, isLoading } = useFollowUpPlan(followUpId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!followUp) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-lg p-6">
        <p className="text-rose-800 font-medium">Follow-up plan not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {followUp.followUpType.replace('_', ' ')}
            </h2>
            <p className="text-sm text-slate-600 mt-1">Follow-Up Plan</p>
          </div>
          <StatusBadge status={followUp.status} />
        </div>
      </div>

      {/* Follow-Up Details */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Follow-Up Details</h3>
        <div className="space-y-4">
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
          {followUp.reason && (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-1">Reason</p>
              <p className="text-slate-700 whitespace-pre-wrap">{followUp.reason}</p>
            </div>
          )}
        </div>
      </div>

      {/* Linked Appointment */}
      {followUp.appointment && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Scheduled Appointment</h3>
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {format(new Date(followUp.appointment.scheduledStartTime), 'MMMM d, yyyy')}
                </p>
                <p className="text-sm text-slate-600">
                  {format(new Date(followUp.appointment.scheduledStartTime), 'h:mm a')} -{' '}
                  {format(new Date(followUp.appointment.scheduledEndTime), 'h:mm a')}
                </p>
              </div>
              <Link
                href={`/patient/appointments`}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                View Appointment →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Linked Consultation */}
      {followUp.consultation && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Original Consultation</h3>
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Consultation #{followUp.consultation.consultationNumber}
                </p>
                <p className="text-sm text-slate-600">
                  {format(new Date(followUp.consultation.consultationDate), 'MMMM d, yyyy')}
                </p>
              </div>
              <Link
                href={`/patient/consultations/${followUp.consultation.id}`}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                View Consultation →
              </Link>
            </div>
          </div>
        </div>
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
