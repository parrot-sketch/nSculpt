'use client';

import { useState, useEffect } from 'react';
import { useProcedurePlan, useProcedurePlanMutations } from '@/hooks/useProcedurePlans';
import type { ProcedurePlan, ProcedurePlanType, ProcedurePlanStatus } from '@/services/procedure-plan.service';
import { Save, CheckCircle2, AlertCircle, Loader2, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import Link from 'next/link';

interface ProcedurePlanEditorProps {
  planId: string | null;
  consultationId: string;
  patientId: string;
  surgeonId: string;
  onSave?: (plan: ProcedurePlan) => void;
  readOnly?: boolean;
}

/**
 * Procedure Plan Editor Component
 * 
 * Manages procedure plan creation and editing:
 * - Create/update procedure plans
 * - Support planType: SURGICAL, NON_SURGICAL, SERIES, CONSERVATIVE
 * - Multi-session series support
 * - Approve → Schedule → Complete workflow UI
 */
export function ProcedurePlanEditor({
  planId,
  consultationId,
  patientId,
  surgeonId,
  onSave,
  readOnly = false,
}: ProcedurePlanEditorProps) {
  const { data: existingPlan, isLoading: isLoadingPlan } = useProcedurePlan(planId);
  const {
    createProcedurePlan,
    updateProcedurePlan,
    approveProcedurePlan,
    scheduleProcedurePlan,
    completeSession,
    completeProcedurePlan,
  } = useProcedurePlanMutations();

  const [formData, setFormData] = useState({
    procedureName: '',
    procedureCode: '',
    procedureDescription: '',
    planType: 'SURGICAL' as ProcedurePlanType,
    sessionCount: 1,
    currentSession: 1,
    sessionIntervalDays: undefined as number | undefined,
    sessionDetails: '',
    followUpRequired: false,
    followUpIntervalDays: undefined as number | undefined,
    notes: '',
    preoperativeNotes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(!planId);

  // Load existing plan data
  useEffect(() => {
    if (existingPlan) {
      setFormData({
        procedureName: existingPlan.procedureName || '',
        procedureCode: existingPlan.procedureCode || '',
        procedureDescription: existingPlan.procedureDescription || '',
        planType: existingPlan.planType,
        sessionCount: existingPlan.sessionCount || 1,
        currentSession: existingPlan.currentSession || 1,
        sessionIntervalDays: existingPlan.sessionIntervalDays,
        sessionDetails: existingPlan.sessionDetails || '',
        followUpRequired: existingPlan.followUpRequired || false,
        followUpIntervalDays: existingPlan.followUpIntervalDays,
        notes: existingPlan.notes || '',
        preoperativeNotes: existingPlan.preoperativeNotes || '',
      });
      setIsEditing(existingPlan.status === 'DRAFT');
    }
  }, [existingPlan]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.procedureName.trim()) {
      newErrors.procedureName = 'Procedure name is required';
    }

    if (formData.planType === 'SERIES') {
      if (!formData.sessionCount || formData.sessionCount < 2) {
        newErrors.sessionCount = 'SERIES plans must have at least 2 sessions';
      }
      if (!formData.sessionIntervalDays || formData.sessionIntervalDays < 1) {
        newErrors.sessionIntervalDays = 'Session interval (days) is required for SERIES plans';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fix validation errors');
      return;
    }

    try {
      if (planId) {
        // Update existing plan
        const updated = await updateProcedurePlan.mutateAsync({
          id: planId,
          dto: formData,
        });
        toast.success('Procedure plan updated');
        setIsEditing(false);
        onSave?.(updated);
      } else {
        // Create new plan
        const created = await createProcedurePlan.mutateAsync({
          consultationId,
          surgeonId,
          ...formData,
        });
        toast.success('Procedure plan created');
        setIsEditing(false);
        onSave?.(created);
      }
    } catch (error: any) {
      console.error('Failed to save procedure plan:', error);
      toast.error(error?.message || 'Failed to save procedure plan');
    }
  };

  const handleApprove = async () => {
    if (!planId) return;

    try {
      await approveProcedurePlan.mutateAsync(planId);
      toast.success('Procedure plan approved');
    } catch (error: any) {
      console.error('Failed to approve procedure plan:', error);
      toast.error(error?.message || 'Failed to approve procedure plan');
    }
  };

  const handleSchedule = async (appointmentId: string) => {
    if (!planId) return;

    try {
      await scheduleProcedurePlan.mutateAsync({ id: planId, appointmentId });
      toast.success('Procedure plan scheduled');
    } catch (error: any) {
      console.error('Failed to schedule procedure plan:', error);
      toast.error(error?.message || 'Failed to schedule procedure plan');
    }
  };

  const handleCompleteSession = async (sessionNumber: number) => {
    if (!planId) return;

    try {
      await completeSession.mutateAsync({ id: planId, sessionNumber });
      toast.success(`Session ${sessionNumber} completed`);
    } catch (error: any) {
      console.error('Failed to complete session:', error);
      toast.error(error?.message || 'Failed to complete session');
    }
  };

  const handleComplete = async () => {
    if (!planId) return;

    try {
      await completeProcedurePlan.mutateAsync(planId);
      toast.success('Procedure plan completed');
    } catch (error: any) {
      console.error('Failed to complete procedure plan:', error);
      toast.error(error?.message || 'Failed to complete procedure plan');
    }
  };

  if (isLoadingPlan && planId) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const canEdit = existingPlan?.status === 'DRAFT' || !planId;
  const canApprove = existingPlan?.status === 'DRAFT';
  const canSchedule = existingPlan?.status === 'APPROVED';
  const canCompleteSession = existingPlan?.planType === 'SERIES' &&
    (existingPlan.status === 'SCHEDULED' || existingPlan.status === 'IN_PROGRESS');
  const canComplete = existingPlan?.status === 'IN_PROGRESS' ||
    (existingPlan?.planType !== 'SERIES' && existingPlan?.status === 'SCHEDULED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Procedure Plan</h2>
          <p className="text-sm text-slate-600 mt-1">
            {existingPlan ? `Plan ${existingPlan.planNumber}` : 'Create new procedure plan'}
          </p>
        </div>
        {!readOnly && canEdit && (
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={updateProcedurePlan.isPending || createProcedurePlan.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(updateProcedurePlan.isPending || createProcedurePlan.isPending) ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Plan
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Status Badge */}
      {existingPlan && (
        <div className="flex items-center gap-4">
          <StatusBadge status={existingPlan.status} />
          {existingPlan.planType === 'SERIES' && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Clock className="h-4 w-4" />
              <span>
                Session {existingPlan.currentSession} of {existingPlan.sessionCount}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Form Sections */}
      <div className="space-y-6">
        {/* Basic Information */}
        <SectionCard title="Procedure Information">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Procedure Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.procedureName}
                onChange={(e) => handleChange('procedureName', e.target.value)}
                disabled={readOnly || !canEdit}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.procedureName ? 'border-rose-300' : 'border-slate-300'
                } ${readOnly || !canEdit ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                placeholder="e.g., Rhinoplasty, Botox Injection"
              />
              {errors.procedureName && (
                <p className="mt-1 text-sm text-rose-600">{errors.procedureName}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Procedure Code (CPT)
                </label>
                <input
                  type="text"
                  value={formData.procedureCode}
                  onChange={(e) => handleChange('procedureCode', e.target.value)}
                  disabled={readOnly || !canEdit}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
                  placeholder="e.g., 30400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Plan Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.planType}
                  onChange={(e) => handleChange('planType', e.target.value)}
                  disabled={readOnly || !canEdit}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
                >
                  <option value="SURGICAL">Surgical Procedure</option>
                  <option value="NON_SURGICAL">Non-Surgical Treatment</option>
                  <option value="SERIES">Multi-Session Series</option>
                  <option value="CONSERVATIVE">Conservative Management</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Procedure Description
              </label>
              <textarea
                value={formData.procedureDescription}
                onChange={(e) => handleChange('procedureDescription', e.target.value)}
                disabled={readOnly || !canEdit}
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="Detailed description of the procedure..."
              />
            </div>
          </div>
        </SectionCard>

        {/* Multi-Session Configuration */}
        {formData.planType === 'SERIES' && (
          <SectionCard title="Multi-Session Configuration">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Number of Sessions <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="2"
                    value={formData.sessionCount}
                    onChange={(e) => handleChange('sessionCount', parseInt(e.target.value) || 1)}
                    disabled={readOnly || !canEdit}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.sessionCount ? 'border-rose-300' : 'border-slate-300'
                    } disabled:bg-slate-50 disabled:text-slate-500`}
                  />
                  {errors.sessionCount && (
                    <p className="mt-1 text-sm text-rose-600">{errors.sessionCount}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Days Between Sessions <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.sessionIntervalDays || ''}
                    onChange={(e) => handleChange('sessionIntervalDays', parseInt(e.target.value) || undefined)}
                    disabled={readOnly || !canEdit}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.sessionIntervalDays ? 'border-rose-300' : 'border-slate-300'
                    } disabled:bg-slate-50 disabled:text-slate-500`}
                    placeholder="e.g., 14"
                  />
                  {errors.sessionIntervalDays && (
                    <p className="mt-1 text-sm text-rose-600">{errors.sessionIntervalDays}</p>
                  )}
                </div>
              </div>

              {existingPlan && existingPlan.status !== 'DRAFT' && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        Current Session: {existingPlan.currentSession} of {existingPlan.sessionCount}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        {existingPlan.currentSession < existingPlan.sessionCount
                          ? `${existingPlan.sessionCount - existingPlan.currentSession} session(s) remaining`
                          : 'All sessions completed'}
                      </p>
                    </div>
                    {canCompleteSession && (
                      <button
                        onClick={() => handleCompleteSession(existingPlan.currentSession! + 1)}
                        disabled={completeSession.isPending}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                      >
                        Complete Session {existingPlan.currentSession! + 1}
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Session Details
                </label>
                <textarea
                  value={formData.sessionDetails}
                  onChange={(e) => handleChange('sessionDetails', e.target.value)}
                  disabled={readOnly || !canEdit}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none disabled:bg-slate-50 disabled:text-slate-500"
                  placeholder="Session-specific notes or instructions..."
                />
              </div>
            </div>
          </SectionCard>
        )}

        {/* Follow-Up Configuration */}
        <SectionCard title="Follow-Up Configuration">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="followUpRequired"
                checked={formData.followUpRequired}
                onChange={(e) => handleChange('followUpRequired', e.target.checked)}
                disabled={readOnly || !canEdit}
                className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="followUpRequired" className="text-sm font-medium text-slate-700">
                Follow-up required after procedure completion
              </label>
            </div>

            {formData.followUpRequired && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Follow-Up Interval (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.followUpIntervalDays || ''}
                  onChange={(e) => handleChange('followUpIntervalDays', parseInt(e.target.value) || undefined)}
                  disabled={readOnly || !canEdit}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
                  placeholder="e.g., 30"
                />
              </div>
            )}
          </div>
        </SectionCard>

        {/* Notes */}
        <SectionCard title="Notes">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Procedure Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                disabled={readOnly || !canEdit}
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="Additional notes about the procedure plan..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Pre-Operative Notes
              </label>
              <textarea
                value={formData.preoperativeNotes}
                onChange={(e) => handleChange('preoperativeNotes', e.target.value)}
                disabled={readOnly || !canEdit}
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="Pre-operative instructions, preparation requirements..."
              />
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Workflow Actions */}
      {existingPlan && !readOnly && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Workflow Actions</h3>
          <div className="flex flex-wrap gap-3">
            {canApprove && (
              <button
                onClick={handleApprove}
                disabled={approveProcedurePlan.isPending}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {approveProcedurePlan.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                    Approving...
                  </>
                ) : (
                  'Approve Plan'
                )}
              </button>
            )}

            {canSchedule && (
              <button
                onClick={() => {
                  const appointmentId = prompt('Enter appointment ID to link:');
                  if (appointmentId) handleSchedule(appointmentId);
                }}
                disabled={scheduleProcedurePlan.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {scheduleProcedurePlan.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 inline mr-2" />
                    Schedule
                  </>
                )}
              </button>
            )}

            {canComplete && (
              <button
                onClick={handleComplete}
                disabled={completeProcedurePlan.isPending}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {completeProcedurePlan.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                    Completing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 inline mr-2" />
                    Complete Plan
                  </>
                )}
              </button>
            )}
          </div>
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
 * Section Card Component
 */
function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>
      {children}
    </div>
  );
}
