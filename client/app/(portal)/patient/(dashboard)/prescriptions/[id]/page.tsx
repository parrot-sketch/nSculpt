'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PrescriptionViewer } from '@/components/prescriptions/PrescriptionViewer';

/**
 * Patient Prescription Detail Page
 * 
 * Read-only view of a prescription for the patient.
 */
export default function PatientPrescriptionDetailPage() {
  const params = useParams();
  const prescriptionId = params.id as string;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <Link
        href="/patient/prescriptions"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Prescriptions
      </Link>
      <PrescriptionViewer prescriptionId={prescriptionId} />
    </div>
  );
}
