'use client';

import { usePatientProfile } from '@/hooks/usePatientSelf';
import { useProcedurePlansByPatient } from '@/hooks/useProcedurePlans';
import { format } from 'date-fns';
import Link from 'next/link';
import { Calendar, Clock, CheckCircle2, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { ProcedurePlanStatus, ProcedurePlanType } from '@/services/procedure-plan.service';
import { getFullName } from '@/lib/utils';

/**
 * Patient Procedure Plans Page
 * 
 * Shows active plans with session progress and completed plans.
 */
export default function PatientProcedurePlansPage() {
  const { data: patient } = usePatientProfile();
  const { data: plans, isLoading, error } = useProcedurePlansByPatient(patient?.id || null);

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
          <p className="text-rose-800 font-medium">Error loading procedure plans</p>
          <p className="text-rose-600 text-sm mt-2">
            {(error as any)?.message || 'Failed to load procedure plans'}
          </p>
        </div>
      </div>
    );
  }

  const activePlans = (plans || []).filter(
    (p) => p.status !== ProcedurePlanStatus.COMPLETED && p.status !== ProcedurePlanStatus.CANCELLED
  );
  const completedPlans = (plans || []).filter(
    (p) => p.status === ProcedurePlanStatus.COMPLETED
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
        <h1 className="text-3xl font-bold text-slate-900">My Procedure Plans</h1>
        <p className="text-slate-600 mt-1">View your treatment plans and progress</p>
      </div>

      {/* Active Plans */}
      {activePlans.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Active Plans</h2>
          <div className="space-y-4">
            {activePlans.map((plan) => (
              <ProcedurePlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </div>
      )}

      {/* Completed Plans */}
      {completedPlans.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Completed Plans</h2>
          <div className="space-y-4">
            {completedPlans.map((plan) => (
              <ProcedurePlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!plans || plans.length === 0) && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <Calendar className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Procedure Plans</h3>
          <p className="text-slate-600">
            You don't have any procedure plans yet. Plans are created after consultations.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Procedure Plan Card Component
 */
function ProcedurePlanCard({ plan }: { plan: any }) {
  const isSeries = plan.planType === ProcedurePlanType.SERIES;
  const isActive = plan.status !== ProcedurePlanStatus.COMPLETED && plan.status !== ProcedurePlanStatus.CANCELLED;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900 mb-1">{plan.procedureName}</h3>
          <p className="text-sm text-slate-600">
            Plan #{plan.planNumber}
          </p>
        </div>
        <StatusBadge status={plan.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Calendar className="h-4 w-4" />
          <span>
            {plan.plannedDate
              ? format(new Date(plan.plannedDate), 'MMMM d, yyyy')
              : 'Not scheduled'}
          </span>
        </div>
        {plan.surgeon && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>
              Dr. {getFullName(plan.surgeon.firstName || '', plan.surgeon.lastName || '')}
            </span>
          </div>
        )}
      </div>

      {/* Plan Type Badge */}
      <div className="mb-4">
        <PlanTypeBadge planType={plan.planType} />
      </div>

      {/* Session Progress (for SERIES plans) */}
      {isSeries && plan.sessionCount && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-900">Session Progress</p>
            <span className="text-sm text-slate-600">
              {plan.currentSession || 0} of {plan.sessionCount}
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all"
              style={{
                width: `${((plan.currentSession || 0) / plan.sessionCount) * 100}%`,
              }}
            />
          </div>
          {plan.sessionIntervalDays && (
            <p className="text-xs text-slate-500 mt-2">
              {plan.sessionIntervalDays} days between sessions
            </p>
          )}
        </div>
      )}

      {/* Status-specific information */}
      {isActive && plan.status === ProcedurePlanStatus.SCHEDULED && plan.plannedDate && (
        <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-600" />
            <p className="text-sm font-medium text-slate-900">
              Scheduled for {format(new Date(plan.plannedDate), 'MMMM d, yyyy')}
            </p>
          </div>
        </div>
      )}

      {isActive && plan.status === ProcedurePlanStatus.IN_PROGRESS && isSeries && (
        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <p className="text-sm font-medium text-slate-900">
              Treatment in progress - {plan.sessionCount - (plan.currentSession || 0)} session(s) remaining
            </p>
          </div>
        </div>
      )}

      <Link
        href={`/patient/procedure-plans/${plan.id}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
      >
        View Details
        <ArrowLeft className="h-4 w-4 rotate-180" />
      </Link>
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
    SURGICAL: { label: 'Surgical', className: 'bg-red-100 text-red-800' },
    NON_SURGICAL: { label: 'Non-Surgical', className: 'bg-blue-100 text-blue-800' },
    SERIES: { label: 'Multi-Session Series', className: 'bg-purple-100 text-purple-800' },
    CONSERVATIVE: { label: 'Conservative', className: 'bg-green-100 text-green-800' },
  };

  const config = typeConfig[planType] || { label: planType, className: 'bg-gray-100 text-gray-800' };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
