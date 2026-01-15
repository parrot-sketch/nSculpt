'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useFollowUpPlan } from '@/hooks/useFollowUpPlans';
import { FollowUpPlanViewer } from '@/components/follow-up-plans/FollowUpPlanViewer';

/**
 * Patient Follow-Up Detail Page
 * 
 * Read-only view of a follow-up plan for the patient.
 */
export default function PatientFollowUpDetailPage() {
  const params = useParams();
  const followUpId = params.id as string;
  const { data: followUp, isLoading } = useFollowUpPlan(followUpId);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <Link
        href="/patient/follow-ups"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Follow-Ups
      </Link>
      {followUp && <FollowUpPlanViewer followUpId={followUpId} />}
    </div>
  );
}
