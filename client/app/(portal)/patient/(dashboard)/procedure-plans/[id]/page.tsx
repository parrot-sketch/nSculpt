'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useProcedurePlan } from '@/hooks/useProcedurePlans';
import { ProcedurePlanViewer } from '@/components/procedure-plans/ProcedurePlanViewer';

/**
 * Patient Procedure Plan Detail Page
 * 
 * Read-only view of a procedure plan for the patient.
 */
export default function PatientProcedurePlanDetailPage() {
  const params = useParams();
  const planId = params.id as string;
  const { data: plan, isLoading } = useProcedurePlan(planId);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <Link
        href="/patient/procedure-plans"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Procedure Plans
      </Link>
      {plan && <ProcedurePlanViewer planId={planId} />}
    </div>
  );
}
