'use client';

import { useState, useEffect } from 'react';
import { useFollowUpPlan, useFollowUpPlanMutations } from '@/hooks/useFollowUpPlans';
import type { FollowUpPlan, FollowUpPlanStatus } from '@/services/follow-up-plan.service';
import { Save, CheckCircle2, Loader2, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import Link from 'next/link';

interface FollowUpPlanEditorProps {
  planId: string | null;
  consultationId: string;
  patientId: string;
  doctorId: string;
  onSave?: (plan: FollowUpPlan) => void;
  readOnly?: boolean;
}

/**
 * Follow-Up Plan Editor Component
 * 
 * Manages follow-up plan creation and editing:
 * - Create/edit follow-ups
 * - Link to original consultation and scheduled appointment
 * - Interval and status tracking
 */
export function FollowUpPlanEditor({
  planId,
  consultationId,
  patientId,
  doctorId,
  onSave,
  readOnly = false,
}: FollowUpPlanEditorProps) {
  const { data: existingPlan, isLoading: isLoadingPlan } = useFollowUpPlan(planId);
  const {
    createFollowUpPlan,
    updateFollowUpPlan,
    scheduleFollowUpPlan,
    completeFollowUpPlan,
  } = useFollowUpPlanMutations();

  const [formData, setFormData] = useState({
    followUpType: 'REVIEW',
    intervalDays: undefined as number | undefined,
    reason: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(!planId);

  // Load existing plan data
  useEffect(() => {
    if (existingPlan) {
      setFormData({
        followUpType: existingPlan.followUpType || 'REVIEW',
        intervalDays: existingPlan.intervalDays,
        reason: existingPlan.reason || '',
      });
      setIsEditing(existingPlan.status === 'PENDING');
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

    if (!formData.followUpType.trim()) {
      newErrors.followUpType = 'Follow-up type is required';
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
        const updated = await updateFollowUpPlan.mutateAsync({
          id: planId,
          dto: formData,
        });
        toast.success('Follow-up plan updated');
        setIsEditing(false);
        onSave?.(updated);
      } else {
        // Create new plan
        const created = await createFollowUpPlan.mutateAsync({
          consultationId,
          doctorId,
          ...formData,
        });
        toast.success('Follow-up plan created');
        setIsEditing(false);
        onSave?.(created);
      }
    } catch (error: any) {
      console.error('Failed to save follow-up plan:', error);
      toast.error(error?.message || 'Failed to save follow-up plan');
    }
  };

  const handleSchedule = async (appointmentId: string) => {
    if (!planId) return;

    try {
      await scheduleFollowUpPlan.mutateAsync({ id: planId, appointmentId });
      toast.success('Follow-up plan scheduled');
    } catch (error: any) {
      console.error('Failed to schedule follow-up plan:', error);
      toast.error(error?.message || 'Failed to schedule follow-up plan');
    }
  };

  const handleComplete = async () => {
    if (!planId) return;

    try {
      await completeFollowUpPlan.mutateAsync(planId);
      toast.success('Follow-up plan completed');
    } catch (error: any) {
      console.error('Failed to complete follow-up plan:', error);
      toast.error(error?.message || 'Failed to complete follow-up plan');
    }
  };

  if (isLoadingPlan && planId) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const canEdit = existingPlan?.status === 'PENDING' || !planId;
  const canSchedule = existingPlan?.status === 'PENDING';
  const canComplete = existingPlan?.status === 'SCHEDULED';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Follow-Up Plan</h2>
          <p className="text-sm text-slate-600 mt-1">
            {existingPlan ? `Follow-up from consultation` : 'Create new follow-up plan'}
          </p>
        </div>
        {!readOnly && canEdit && (
          <button
            onClick={handleSave}
            disabled={updateFollowUpPlan.isPending || createFollowUpPlan.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {(updateFollowUpPlan.isPending || createFollowUpPlan.isPending) ? (
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
        )}
      </div>

      {/* Status Badge */}
      {existingPlan && (
        <StatusBadge status={existingPlan.status} />
      )}

      {/* Form Sections */}
      <div className="space-y-6">
        {/* Follow-Up Details */}
        <SectionCard title="Follow-Up Details">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Follow-Up Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.followUpType}
                onChange={(e) => handleChange('followUpType', e.target.value)}
                disabled={readOnly || !canEdit}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.followUpType ? 'border-rose-300' : 'border-slate-300'
                } ${readOnly || !canEdit ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
              >
                <option value="REVIEW">Review</option>
                <option value="POST_OP">Post-Operative</option>
                <option value="SERIES_SESSION">Series Session</option>
                <option value="GENERAL">General Follow-Up</option>
              </select>
              {errors.followUpType && (
                <p className="mt-1 text-sm text-rose-600">{errors.followUpType}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Interval (Days from Consultation)
              </label>
              <input
                type="number"
                min="1"
                value={formData.intervalDays || ''}
                onChange={(e) => handleChange('intervalDays', parseInt(e.target.value) || undefined)}
                disabled={readOnly || !canEdit}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="e.g., 30"
              />
              <p className="mt-1 text-sm text-slate-500">
                Recommended days after consultation for follow-up
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Reason for Follow-Up
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => handleChange('reason', e.target.value)}
                disabled={readOnly || !canEdit}
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="Clinical reason for follow-up..."
              />
            </div>
          </div>
        </SectionCard>

        {/* Linked Information */}
        {existingPlan && (
          <SectionCard title="Linked Information">
            <div className="space-y-4">
              {existingPlan.consultation && (
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium text-slate-700 mb-1">Original Consultation</p>
                  <p className="text-sm text-slate-600">
                    {existingPlan.consultation.consultationNumber} -{' '}
                    {format(new Date(existingPlan.consultation.consultationDate), 'MMM d, yyyy')}
                  </p>
                </div>
              )}

              {existingPlan.appointment && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900 mb-1">Scheduled Appointment</p>
                      <p className="text-sm text-slate-600">
                        {format(new Date(existingPlan.appointment.scheduledStartTime), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    <Link
                      href={`/frontdesk/appointments/${existingPlan.appointment.id}`}
                      className="text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      View Appointment →
                    </Link>
                  </div>
                </div>
              )}

              {existingPlan.scheduledDate && (
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-emerald-600" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">Scheduled Date</p>
                      <p className="text-sm text-slate-600">
                        {format(new Date(existingPlan.scheduledDate), 'MMMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
        )}
      </div>

      {/* Workflow Actions */}
      {existingPlan && !readOnly && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Workflow Actions</h3>
          <div className="flex flex-wrap gap-3">
            {canSchedule && (
              <button
                onClick={() => {
                  const appointmentId = prompt('Enter appointment ID to link:');
                  if (appointmentId) handleSchedule(appointmentId);
                }}
                disabled={scheduleFollowUpPlan.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {scheduleFollowUpPlan.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 inline mr-2" />
                    Schedule Follow-Up
                  </>
                )}
              </button>
            )}

            {canComplete && (
              <button
                onClick={handleComplete}
                disabled={completeFollowUpPlan.isPending}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {completeFollowUpPlan.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                    Completing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 inline mr-2" />
                    Complete Follow-Up
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
function StatusBadge({ status }: { status: FollowUpPlanStatus }) {
  const statusConfig: Record<FollowUpPlanStatus, { label: string; className: string }> = {
    PENDING: { label: 'Pending', className: 'bg-slate-100 text-slate-800' },
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
