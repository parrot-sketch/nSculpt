'use client';

import { useState, useEffect } from 'react';
import { useConsultationMutations, useConsultation } from '@/hooks/useConsultations';
import type { Consultation, UpdateConsultationRequest } from '@/services/consultation.service';
import { PrescriptionEditor } from '@/components/prescriptions/PrescriptionEditor';
import { Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ConsultationEditorProps {
  consultationId: string | null;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  onSave?: (consultation: Consultation) => void;
  onFinalize?: (consultation: Consultation) => void;
  readOnly?: boolean;
}

/**
 * Consultation Editor Component
 * 
 * Structured form for clinical documentation:
 * - Chief Complaint
 * - History of Present Illness (HPI)
 * - Examination
 * - Diagnosis
 * - Plan
 * - Notes
 * 
 * Supports draft saving and finalization.
 */
export function ConsultationEditor({
  consultationId,
  appointmentId,
  patientId,
  doctorId,
  onSave,
  onFinalize,
  readOnly = false,
}: ConsultationEditorProps) {
  const { data: existingConsultation, isLoading: isLoadingConsultation } = useConsultation(consultationId);
  const { updateConsultation, finalizePlan } = useConsultationMutations();

  const [formData, setFormData] = useState({
    chiefComplaint: '',
    historyOfPresentIllness: '',
    examination: '',
    diagnosis: '',
    plan: '',
    notes: '',
    consultationOutcome: '' as '' | 'NO_ACTION' | 'FOLLOW_UP' | 'PROCEDURE_PLANNED' | 'CONSERVATIVE' | 'REFERRED',
  });

  // Procedure Plan form data (shown when outcome is PROCEDURE_PLANNED)
  const [procedurePlanData, setProcedurePlanData] = useState({
    procedureName: '',
    procedureCode: '',
    procedureDescription: '',
    planType: 'SURGICAL' as 'SURGICAL' | 'NON_SURGICAL' | 'CONSERVATIVE' | 'SERIES',
    sessionCount: 1,
    sessionIntervalDays: undefined as number | undefined,
    sessionDetails: '',
    followUpRequired: false,
    followUpIntervalDays: undefined as number | undefined,
    notes: '',
  });

  // Follow-Up Plan form data (shown when outcome is FOLLOW_UP)
  const [followUpPlanData, setFollowUpPlanData] = useState({
    followUpType: 'REVIEW',
    intervalDays: undefined as number | undefined,
    reason: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDraft, setIsDraft] = useState(true);

  // Load existing consultation data
  useEffect(() => {
    if (existingConsultation) {
      setFormData({
        chiefComplaint: existingConsultation.chiefComplaint || '',
        historyOfPresentIllness: '', // Will be extracted from clinicalSummary if available
        examination: '', // Will be extracted from clinicalSummary if available
        diagnosis: existingConsultation.diagnosis || '',
        plan: '', // Will be extracted from notes if available
        notes: existingConsultation.notes || '',
        consultationOutcome: (existingConsultation.consultationOutcome as any) || '',
      });

      // Parse clinicalSummary if it contains structured data
      // For now, we'll store HPI + Examination in clinicalSummary
      // and Plan in notes, but display them separately in the form
      setIsDraft(existingConsultation.status !== 'CLOSED' && existingConsultation.status !== 'PLAN_CREATED');
    }
  }, [existingConsultation]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (forFinalize: boolean = false): boolean => {
    const newErrors: Record<string, string> = {};

    if (forFinalize) {
      if (!formData.chiefComplaint.trim()) {
        newErrors.chiefComplaint = 'Chief complaint is required';
      }
      if (!formData.diagnosis.trim()) {
        newErrors.diagnosis = 'Diagnosis is required';
      }
      if (!formData.consultationOutcome) {
        newErrors.consultationOutcome = 'Consultation outcome is required';
      }
      
      // Validate procedure plan if outcome is PROCEDURE_PLANNED
      if (formData.consultationOutcome === 'PROCEDURE_PLANNED') {
        if (!procedurePlanData.procedureName.trim()) {
          newErrors.procedureName = 'Procedure name is required';
        }
        if (procedurePlanData.planType === 'SERIES') {
          if (!procedurePlanData.sessionCount || procedurePlanData.sessionCount < 2) {
            newErrors.sessionCount = 'SERIES plans must have at least 2 sessions';
          }
          if (!procedurePlanData.sessionIntervalDays || procedurePlanData.sessionIntervalDays < 1) {
            newErrors.sessionIntervalDays = 'Session interval (days) is required for SERIES plans';
          }
        }
      }
      
      // Validate follow-up plan if outcome is FOLLOW_UP
      if (formData.consultationOutcome === 'FOLLOW_UP') {
        if (!followUpPlanData.followUpType.trim()) {
          newErrors.followUpType = 'Follow-up type is required';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveDraft = async () => {
    if (!consultationId) {
      toast.error('Consultation not found. Please create consultation first.');
      return;
    }

    try {
      // Combine HPI + Examination into clinicalSummary
      const clinicalSummary = [
        formData.historyOfPresentIllness && `HPI: ${formData.historyOfPresentIllness}`,
        formData.examination && `Examination: ${formData.examination}`,
      ]
        .filter(Boolean)
        .join('\n\n');

      // Combine Plan + Notes
      const notes = [
        formData.plan && `Plan: ${formData.plan}`,
        formData.notes && formData.notes,
      ]
        .filter(Boolean)
        .join('\n\n');

      const updateDto: UpdateConsultationRequest = {
        chiefComplaint: formData.chiefComplaint || undefined,
        clinicalSummary: clinicalSummary || undefined,
        diagnoses: formData.diagnosis ? { primary: formData.diagnosis } : undefined,
        notes: notes || undefined,
        version: existingConsultation?.version,
      };

      const updated = await updateConsultation.mutateAsync({
        id: consultationId,
        dto: updateDto,
      });

      toast.success('Consultation draft saved');
      onSave?.(updated);
    } catch (error: any) {
      console.error('Failed to save draft:', error);
      toast.error(error?.message || 'Failed to save consultation draft');
    }
  };

  const handleFinalize = async () => {
    if (!validateForm(true)) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!consultationId) {
      toast.error('Consultation not found. Please create consultation first.');
      return;
    }

    try {
      // First, save the draft
      await handleSaveDraft();

      // Then finalize the plan
      const diagnoses = formData.diagnosis ? { primary: formData.diagnosis } : undefined;
      const clinicalSummary = [
        formData.historyOfPresentIllness && `HPI: ${formData.historyOfPresentIllness}`,
        formData.examination && `Examination: ${formData.examination}`,
      ]
        .filter(Boolean)
        .join('\n\n');
      const notes = [
        formData.plan && `Plan: ${formData.plan}`,
        formData.notes && formData.notes,
      ]
        .filter(Boolean)
        .join('\n\n');

      // Build finalize DTO with outcome and nested plans
      const finalizeDto: any = {
        outcome: formData.consultationOutcome,
        clinicalSummary: clinicalSummary || undefined,
        diagnoses,
        notes: notes || undefined,
      };

      // Add procedure plan if outcome is PROCEDURE_PLANNED
      if (formData.consultationOutcome === 'PROCEDURE_PLANNED') {
        finalizeDto.procedurePlan = {
          procedureName: procedurePlanData.procedureName,
          procedureCode: procedurePlanData.procedureCode || undefined,
          procedureDescription: procedurePlanData.procedureDescription || undefined,
          planType: procedurePlanData.planType,
          sessionCount: procedurePlanData.planType === 'SERIES' ? procedurePlanData.sessionCount : 1,
          sessionIntervalDays: procedurePlanData.sessionIntervalDays || undefined,
          sessionDetails: procedurePlanData.sessionDetails || undefined,
          followUpRequired: procedurePlanData.followUpRequired || false,
          followUpIntervalDays: procedurePlanData.followUpIntervalDays || undefined,
          notes: procedurePlanData.notes || undefined,
        };
      }

      // Add follow-up plan if outcome is FOLLOW_UP
      if (formData.consultationOutcome === 'FOLLOW_UP') {
        finalizeDto.followUpPlan = {
          followUpType: followUpPlanData.followUpType,
          intervalDays: followUpPlanData.intervalDays || undefined,
          reason: followUpPlanData.reason || undefined,
        };
      }

      const finalized = await finalizePlan.mutateAsync({
        id: consultationId,
        dto: finalizeDto,
      });

      setIsDraft(false);
      toast.success('Consultation finalized');
      onFinalize?.(finalized);
    } catch (error: any) {
      console.error('Failed to finalize consultation:', error);
      toast.error(error?.message || 'Failed to finalize consultation');
    }
  };

  if (isLoadingConsultation) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const isFinalized = existingConsultation && 
    (existingConsultation.status === 'CLOSED' || existingConsultation.status === 'PLAN_CREATED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Clinical Consultation</h2>
          <p className="text-sm text-slate-600 mt-1">
            {isFinalized ? 'Finalized consultation (read-only)' : 'Draft consultation'}
          </p>
        </div>
        {!readOnly && !isFinalized && (
          <div className="flex gap-3">
            <button
              onClick={handleSaveDraft}
              disabled={updateConsultation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateConsultation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Draft
                </>
              )}
            </button>
            <button
              onClick={handleFinalize}
              disabled={finalizePlan.isPending || updateConsultation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {finalizePlan.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Finalizing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Finalize Consultation
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Form Sections */}
      <div className="space-y-6">
        {/* Chief Complaint */}
        <SectionCard title="Chief Complaint" required>
          <textarea
            value={formData.chiefComplaint}
            onChange={(e) => handleChange('chiefComplaint', e.target.value)}
            disabled={readOnly || isFinalized}
            rows={3}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none ${
              errors.chiefComplaint ? 'border-rose-300' : 'border-slate-300'
            } ${readOnly || isFinalized ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
            placeholder="Patient's primary reason for visit..."
          />
          {errors.chiefComplaint && (
            <p className="mt-1 text-sm text-rose-600">{errors.chiefComplaint}</p>
          )}
        </SectionCard>

        {/* History of Present Illness */}
        <SectionCard title="History of Present Illness (HPI)">
          <textarea
            value={formData.historyOfPresentIllness}
            onChange={(e) => handleChange('historyOfPresentIllness', e.target.value)}
            disabled={readOnly || isFinalized}
            rows={5}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none ${
              readOnly || isFinalized ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'border-slate-300'
            }`}
            placeholder="Detailed history of the present illness, including onset, duration, severity, associated symptoms..."
          />
        </SectionCard>

        {/* Examination */}
        <SectionCard title="Examination">
          <textarea
            value={formData.examination}
            onChange={(e) => handleChange('examination', e.target.value)}
            disabled={readOnly || isFinalized}
            rows={5}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none ${
              readOnly || isFinalized ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'border-slate-300'
            }`}
            placeholder="Physical examination findings, vital signs, observations..."
          />
        </SectionCard>

        {/* Diagnosis */}
        <SectionCard title="Diagnosis" required>
          <textarea
            value={formData.diagnosis}
            onChange={(e) => handleChange('diagnosis', e.target.value)}
            disabled={readOnly || isFinalized}
            rows={4}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none ${
              errors.diagnosis ? 'border-rose-300' : 'border-slate-300'
            } ${readOnly || isFinalized ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
            placeholder="Primary diagnosis and any secondary diagnoses..."
          />
          {errors.diagnosis && (
            <p className="mt-1 text-sm text-rose-600">{errors.diagnosis}</p>
          )}
        </SectionCard>

        {/* Plan */}
        <SectionCard title="Plan">
          <textarea
            value={formData.plan}
            onChange={(e) => handleChange('plan', e.target.value)}
            disabled={readOnly || isFinalized}
            rows={4}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none ${
              readOnly || isFinalized ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'border-slate-300'
            }`}
            placeholder="Treatment plan, medications, follow-up instructions..."
          />
        </SectionCard>

        {/* Additional Notes */}
        <SectionCard title="Additional Notes">
          <textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            disabled={readOnly || isFinalized}
            rows={3}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none ${
              readOnly || isFinalized ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'border-slate-300'
            }`}
            placeholder="Any additional clinical notes or observations..."
          />
        </SectionCard>

        {/* Consultation Outcome - Required for Finalization */}
        {!isFinalized && (
          <SectionCard title="Consultation Outcome" required>
            <select
              value={formData.consultationOutcome}
              onChange={(e) => handleChange('consultationOutcome', e.target.value)}
              disabled={readOnly || isFinalized}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.consultationOutcome ? 'border-rose-300' : 'border-slate-300'
              } ${readOnly || isFinalized ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
            >
              <option value="">Select outcome...</option>
              <option value="NO_ACTION">No Action Required - Consult Only</option>
              <option value="PROCEDURE_PLANNED">Procedure/Treatment Planned</option>
              <option value="FOLLOW_UP">Follow-Up Required</option>
              <option value="CONSERVATIVE">Conservative Management</option>
              <option value="REFERRED">Referred to Another Provider</option>
            </select>
            {errors.consultationOutcome && (
              <p className="mt-1 text-sm text-rose-600">{errors.consultationOutcome}</p>
            )}
            <p className="mt-2 text-sm text-slate-600">
              Select the clinical decision made during this consultation. This determines next steps.
            </p>
          </SectionCard>
        )}

        {/* Procedure Plan Section - Shown when outcome is PROCEDURE_PLANNED */}
        {!isFinalized && formData.consultationOutcome === 'PROCEDURE_PLANNED' && (
          <SectionCard title="Procedure Plan">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Procedure Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={procedurePlanData.procedureName}
                  onChange={(e) => setProcedurePlanData(prev => ({ ...prev, procedureName: e.target.value }))}
                  disabled={readOnly}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.procedureName ? 'border-rose-300' : 'border-slate-300'
                  }`}
                  placeholder="e.g., Rhinoplasty, Botox Injection, PRP Series"
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
                    value={procedurePlanData.procedureCode}
                    onChange={(e) => setProcedurePlanData(prev => ({ ...prev, procedureCode: e.target.value }))}
                    disabled={readOnly}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., 30400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Plan Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={procedurePlanData.planType}
                    onChange={(e) => setProcedurePlanData(prev => ({ ...prev, planType: e.target.value as any }))}
                    disabled={readOnly}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="SURGICAL">Surgical Procedure</option>
                    <option value="NON_SURGICAL">Non-Surgical Treatment</option>
                    <option value="SERIES">Multi-Session Series</option>
                    <option value="CONSERVATIVE">Conservative Management</option>
                  </select>
                </div>
              </div>

              {procedurePlanData.planType === 'SERIES' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Number of Sessions <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="2"
                      value={procedurePlanData.sessionCount}
                      onChange={(e) => setProcedurePlanData(prev => ({ ...prev, sessionCount: parseInt(e.target.value) || 1 }))}
                      disabled={readOnly}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.sessionCount ? 'border-rose-300' : 'border-slate-300'
                      }`}
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
                      value={procedurePlanData.sessionIntervalDays || ''}
                      onChange={(e) => setProcedurePlanData(prev => ({ ...prev, sessionIntervalDays: parseInt(e.target.value) || undefined }))}
                      disabled={readOnly}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.sessionIntervalDays ? 'border-rose-300' : 'border-slate-300'
                      }`}
                      placeholder="e.g., 14"
                    />
                    {errors.sessionIntervalDays && (
                      <p className="mt-1 text-sm text-rose-600">{errors.sessionIntervalDays}</p>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Procedure Description
                </label>
                <textarea
                  value={procedurePlanData.procedureDescription}
                  onChange={(e) => setProcedurePlanData(prev => ({ ...prev, procedureDescription: e.target.value }))}
                  disabled={readOnly}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Detailed description of the procedure..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="followUpRequired"
                  checked={procedurePlanData.followUpRequired}
                  onChange={(e) => setProcedurePlanData(prev => ({ ...prev, followUpRequired: e.target.checked }))}
                  disabled={readOnly}
                  className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="followUpRequired" className="text-sm font-medium text-slate-700">
                  Follow-up required after procedure completion
                </label>
              </div>

              {procedurePlanData.followUpRequired && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Follow-Up Interval (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={procedurePlanData.followUpIntervalDays || ''}
                    onChange={(e) => setProcedurePlanData(prev => ({ ...prev, followUpIntervalDays: parseInt(e.target.value) || undefined }))}
                    disabled={readOnly}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., 30"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Procedure Notes
                </label>
                <textarea
                  value={procedurePlanData.notes}
                  onChange={(e) => setProcedurePlanData(prev => ({ ...prev, notes: e.target.value }))}
                  disabled={readOnly}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Additional notes about the procedure plan..."
                />
              </div>
            </div>
          </SectionCard>
        )}

        {/* Follow-Up Plan Section - Shown when outcome is FOLLOW_UP */}
        {!isFinalized && formData.consultationOutcome === 'FOLLOW_UP' && (
          <SectionCard title="Follow-Up Plan">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Follow-Up Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={followUpPlanData.followUpType}
                  onChange={(e) => setFollowUpPlanData(prev => ({ ...prev, followUpType: e.target.value }))}
                  disabled={readOnly}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.followUpType ? 'border-rose-300' : 'border-slate-300'
                  }`}
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
                  value={followUpPlanData.intervalDays || ''}
                  onChange={(e) => setFollowUpPlanData(prev => ({ ...prev, intervalDays: parseInt(e.target.value) || undefined }))}
                  disabled={readOnly}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  value={followUpPlanData.reason}
                  onChange={(e) => setFollowUpPlanData(prev => ({ ...prev, reason: e.target.value }))}
                  disabled={readOnly}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Clinical reason for follow-up..."
                />
              </div>
            </div>
          </SectionCard>
        )}
      </div>

      {/* Prescriptions Section */}
      {consultationId && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <PrescriptionEditor
            consultationId={consultationId}
            patientId={patientId}
            readOnly={readOnly || isFinalized}
          />
        </div>
      )}

      {/* Finalized Notice */}
      {isFinalized && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-emerald-800 font-medium">Consultation Finalized</p>
            <p className="text-emerald-700 text-sm mt-1">
              This consultation has been finalized and is now read-only. No further edits can be made.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Section Card Component
 */
function SectionCard({
  title,
  required = false,
  children,
}: {
  title: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        {title}
        {required && <span className="text-rose-500 ml-1">*</span>}
      </h3>
      {children}
    </div>
  );
}
