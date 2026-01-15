'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ConsultationViewer } from '@/components/consultations/ConsultationViewer';

/**
 * Patient Consultation Detail Page
 * 
 * Read-only view of a finalized consultation for the patient.
 */
export default function PatientConsultationDetailPage() {
  const params = useParams();
  const consultationId = params.id as string;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <Link
        href="/patient/consultations"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Consultations
      </Link>
      <ConsultationViewer consultationId={consultationId} />
    </div>
  );
}
