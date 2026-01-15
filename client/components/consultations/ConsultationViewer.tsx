'use client';

import { useConsultation } from '@/hooks/useConsultations';
import { format } from 'date-fns';
import { FileText, Calendar, User, Stethoscope, Loader2, AlertCircle } from 'lucide-react';
import { getFullName } from '@/lib/utils';

interface ConsultationViewerProps {
  consultationId: string;
}

/**
 * Consultation Viewer Component
 * 
 * Read-only view of a finalized consultation.
 * Used by patients, FrontDesk, and other non-clinician roles.
 */
export function ConsultationViewer({ consultationId }: ConsultationViewerProps) {
  const { data: consultation, isLoading, error } = useConsultation(consultationId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-rose-800 font-medium">Error loading consultation</p>
            <p className="text-rose-700 text-sm mt-1">
              {(error as any)?.message || 'Failed to load consultation details'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center">
        <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-600 font-medium">Consultation not found</p>
      </div>
    );
  }

  // Parse clinicalSummary to extract HPI and Examination if available
  const clinicalSummary = (consultation as any).clinicalSummary || '';
  const hpiMatch = clinicalSummary.match(/HPI:\s*(.+?)(?:\n\n|$)/s);
  const examinationMatch = clinicalSummary.match(/Examination:\s*(.+?)(?:\n\n|$)/s);
  const hpi = hpiMatch ? hpiMatch[1].trim() : '';
  const examination = examinationMatch ? examinationMatch[1].trim() : '';

  // Parse notes to extract Plan if available
  const notes = consultation.notes || '';
  const planMatch = notes.match(/Plan:\s*(.+?)(?:\n\n|$)/s);
  const plan = planMatch ? planMatch[1].trim() : '';
  const additionalNotes = notes.replace(/Plan:.*?(\n\n|$)/s, '').trim();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Consultation Report</h2>
            <p className="text-sm text-slate-600 mt-1">
              Consultation #{consultation.consultationNumber}
            </p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
            Finalized
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">Consultation Date</p>
              <p className="text-sm font-medium text-slate-900">
                {format(new Date(consultation.consultationDate), 'MMMM d, yyyy')}
              </p>
            </div>
          </div>
          {consultation.doctor && (
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Consulting Doctor</p>
                <p className="text-sm font-medium text-slate-900">
                  Dr. {getFullName(consultation.doctor.firstName || '', consultation.doctor.lastName || '')}
                </p>
              </div>
            </div>
          )}
          {consultation.patient && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Patient</p>
                <p className="text-sm font-medium text-slate-900">
                  {getFullName(consultation.patient.firstName || '', consultation.patient.lastName || '')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Clinical Sections */}
      <div className="space-y-6">
        {/* Chief Complaint */}
        {consultation.chiefComplaint && (
          <SectionCard title="Chief Complaint">
            <p className="text-slate-700 whitespace-pre-wrap">{consultation.chiefComplaint}</p>
          </SectionCard>
        )}

        {/* History of Present Illness */}
        {hpi && (
          <SectionCard title="History of Present Illness">
            <p className="text-slate-700 whitespace-pre-wrap">{hpi}</p>
          </SectionCard>
        )}

        {/* Examination */}
        {examination && (
          <SectionCard title="Examination">
            <p className="text-slate-700 whitespace-pre-wrap">{examination}</p>
          </SectionCard>
        )}

        {/* Diagnosis */}
        {consultation.diagnosis && (
          <SectionCard title="Diagnosis">
            <p className="text-slate-700 whitespace-pre-wrap">{consultation.diagnosis}</p>
          </SectionCard>
        )}

        {/* Plan */}
        {plan && (
          <SectionCard title="Plan">
            <p className="text-slate-700 whitespace-pre-wrap">{plan}</p>
          </SectionCard>
        )}

        {/* Additional Notes */}
        {additionalNotes && (
          <SectionCard title="Additional Notes">
            <p className="text-slate-700 whitespace-pre-wrap">{additionalNotes}</p>
          </SectionCard>
        )}
      </div>
    </div>
  );
}

/**
 * Section Card Component
 */
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>
      <div className="text-slate-600">{children}</div>
    </div>
  );
}
