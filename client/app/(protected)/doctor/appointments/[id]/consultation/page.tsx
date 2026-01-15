'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppointmentMutations } from '@/hooks/useAppointments';
import { useConsultationByAppointment, useConsultationMutations } from '@/hooks/useConsultations';
import { useQuery } from '@tanstack/react-query';
import { appointmentService } from '@/services/appointment.service';
import { ConsultationEditor } from '@/components/consultations/ConsultationEditor';
import { ConsultationViewer } from '@/components/consultations/ConsultationViewer';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

/**
 * Consultation Page for Appointment
 * 
 * This page is accessed when a clinician completes an appointment.
 * It allows creating/editing a consultation linked to the appointment.
 */
export default function AppointmentConsultationPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params.id as string;

  // Get appointment details
  const { data: appointment, isLoading: isLoadingAppointment } = useQuery({
    queryKey: ['appointments', appointmentId],
    queryFn: () => appointmentService.getAppointment(appointmentId),
    enabled: !!appointmentId,
  });

  // Get existing consultation for this appointment
  const { data: existingConsultation, isLoading: isLoadingConsultation } = useConsultationByAppointment(appointmentId);

  // Mutations
  const { createConsultation } = useConsultationMutations();
  const { completeAppointment } = useAppointmentMutations();

  const isLoading = isLoadingAppointment || isLoadingConsultation;

  // Check if consultation can be created/edited
  const canEdit = appointment?.status === 'IN_PROGRESS' || appointment?.status === 'CHECKED_IN';
  const isCompleted = appointment?.status === 'COMPLETED';
  const isFinalized = existingConsultation && 
    (existingConsultation.status === 'CLOSED' || existingConsultation.status === 'PLAN_CREATED');

  // Create consultation if it doesn't exist and appointment is IN_PROGRESS
  const handleCreateConsultation = async () => {
    if (!appointment || !canEdit) {
      toast.error('Cannot create consultation for this appointment');
      return;
    }

    if (existingConsultation) {
      // Consultation already exists, just navigate to editor
      return;
    }

    try {
      const consultation = await createConsultation.mutateAsync({
        patientId: appointment.patientId,
        appointmentId: appointment.id,
        doctorId: appointment.doctorId,
        visitType: 'INITIAL', // Default, can be updated
        chiefComplaint: appointment.reason || undefined,
      });

      toast.success('Consultation created');
    } catch (error: any) {
      console.error('Failed to create consultation:', error);
      toast.error(error?.message || 'Failed to create consultation');
    }
  };

  // Auto-create consultation if needed
  useEffect(() => {
    if (!isLoading && appointment && canEdit && !existingConsultation) {
      handleCreateConsultation();
    }
  }, [isLoading, appointment, canEdit, existingConsultation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-8">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-rose-800 font-medium">Appointment not found</p>
              <p className="text-rose-700 text-sm mt-1">
                The appointment you're looking for doesn't exist or you don't have access to it.
              </p>
              <Link
                href="/doctor/consultations"
                className="inline-block mt-4 text-sm text-rose-600 hover:text-rose-800 underline"
              >
                Back to Consultations
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show viewer if consultation is finalized
  if (isFinalized && existingConsultation) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-8">
        <Link
          href="/doctor/consultations"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Consultations
        </Link>
        <ConsultationViewer consultationId={existingConsultation.id} />
      </div>
    );
  }

  // Show editor if consultation exists or can be created
  if (existingConsultation || canEdit) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-8">
        <Link
          href="/doctor/consultations"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Consultations
        </Link>
        <ConsultationEditor
          consultationId={existingConsultation?.id || null}
          appointmentId={appointment.id}
          patientId={appointment.patientId}
          doctorId={appointment.doctorId}
          onFinalize={async (consultation) => {
            // When consultation is finalized, complete the appointment
            try {
              await completeAppointment.mutateAsync({
                id: appointment.id,
                consultationId: consultation.id,
              });
              toast.success('Appointment completed and consultation finalized');
              router.push('/doctor/consultations');
            } catch (error: any) {
              console.error('Failed to complete appointment:', error);
              toast.error(error?.message || 'Failed to complete appointment');
            }
          }}
        />
      </div>
    );
  }

  // Appointment is not in a state that allows consultation creation
  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <Link
        href="/doctor/consultations"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Consultations
      </Link>
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-800 font-medium">Consultation not available</p>
            <p className="text-yellow-700 text-sm mt-1">
              Consultations can only be created when an appointment is IN_PROGRESS or CHECKED_IN.
              Current appointment status: {appointment.status}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
