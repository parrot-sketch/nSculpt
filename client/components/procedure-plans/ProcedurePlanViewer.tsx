'use client';

import { useProcedurePlan } from '@/hooks/useProcedurePlans';
import { ProcedurePlanStatus, ProcedurePlanType } from '@/services/procedure-plan.service';
import { format } from 'date-fns';
import { Calendar, Clock, Loader2, User } from 'lucide-react';
import { getFullName } from '@/lib/utils';
import Link from 'next/link';

interface ProcedurePlanViewerProps {
  planId: string;
}

/**
 * Procedure Plan Viewer Component
 * 
 * Read-only view of a procedure plan with all details.
 */
export function ProcedurePlanViewer({ planId }: ProcedurePlanViewerProps) {
  const { data: plan, isLoading } = useProcedurePlan(planId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-lg p-6">
        <p className="text-rose-800 font-medium">Procedure plan not found</p>
      </div>
    );
  }

  const isSeries = plan.planType === ProcedurePlanType.SERIES;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{plan.procedureName}</h2>
            <p className="text-sm text-slate-600 mt-1">Plan #{plan.planNumber}</p>
          </div>
          <StatusBadge status={plan.status} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {plan.plannedDate && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(plan.plannedDate), 'MMMM d, yyyy')}</span>
            </div>
          )}
          {plan.surgeon && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <User className="h-4 w-4" />
              <span>
                Dr. {getFullName(plan.surgeon.firstName || '', plan.surgeon.lastName || '')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Plan Type */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Plan Type</h3>
        <PlanTypeBadge planType={plan.planType} />
      </div>

      {/* Session Progress (for SERIES) */}
      {isSeries && plan.sessionCount && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Session Progress</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-700">Sessions</p>
                <span className="text-sm text-slate-600">
                  {plan.currentSession || 0} of {plan.sessionCount}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div
                  className="bg-indigo-600 h-3 rounded-full transition-all"
                  style={{
                    width: `${((plan.currentSession || 0) / plan.sessionCount) * 100}%`,
                  }}
                />
              </div>
            </div>
            {plan.sessionIntervalDays && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Clock className="h-4 w-4" />
                <span>{plan.sessionIntervalDays} days between sessions</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Procedure Details */}
      {plan.procedureDescription && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Procedure Description</h3>
          <p className="text-slate-700 whitespace-pre-wrap">{plan.procedureDescription}</p>
        </div>
      )}

      {/* Notes */}
      {plan.notes && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Notes</h3>
          <p className="text-slate-700 whitespace-pre-wrap">{plan.notes}</p>
        </div>
      )}

      {/* Linked Consultation */}
      {plan.consultation && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Related Consultation</h3>
          <Link
            href={`/patient/consultations/${plan.consultation.id}`}
            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
          >
            Consultation #{plan.consultation.consultationNumber} →
          </Link>
        </div>
      )}
    </div>
  );
}

/**
 * Status Badge Component
 */
function StatusBadge({ status }: { status: ProcedurePlanStatus }) {
  const statusConfig: Record<ProcedurePlanStatus, { label: string; className: string }> = {
    DRAFT: { label: 'Draft', className: 'bg-slate-100 text-slate-800' },
    APPROVED: { label: 'Approved', className: 'bg-blue-100 text-blue-800' },
    SCHEDULED: { label: 'Scheduled', className: 'bg-indigo-100 text-indigo-800' },
    IN_PROGRESS: { label: 'In Progress', className: 'bg-yellow-100 text-yellow-800' },
    COMPLETED: { label: 'Completed', className: 'bg-emerald-100 text-emerald-800' },
    CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-800' },
    ON_HOLD: { label: 'On Hold', className: 'bg-orange-100 text-orange-800' },
  };

  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

/**
 * Plan Type Badge Component
 */
function PlanTypeBadge({ planType }: { planType: ProcedurePlanType }) {
  const typeConfig: Record<ProcedurePlanType, { label: string; className: string }> = {
    SURGICAL: { label: 'Surgical Procedure', className: 'bg-red-100 text-red-800' },
    NON_SURGICAL: { label: 'Non-Surgical Treatment', className: 'bg-blue-100 text-blue-800' },
    SERIES: { label: 'Multi-Session Series', className: 'bg-purple-100 text-purple-800' },
    CONSERVATIVE: { label: 'Conservative Management', className: 'bg-green-100 text-green-800' },
  };

  const config = typeConfig[planType] || { label: planType, className: 'bg-gray-100 text-gray-800' };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
