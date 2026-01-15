'use client';

import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { PERMISSION_DOMAINS, PERMISSION_ACTIONS } from '@/lib/constants';
import { buildPermission } from '@/lib/permissions';

export default function TheaterPage() {
  const access = useFeatureAccess();

  return (
    <AuthGuard
      requiredPermission={buildPermission(
        PERMISSION_DOMAINS.THEATER,
        '*',
        PERMISSION_ACTIONS.READ
      )}
    >
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-semibold text-neutral-900">Theater Scheduling</h1>
          {access.canBookTheater() && (
            <button className="btn-primary">Book Theater</button>
          )}
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 shadow-soft p-6">
          <p className="text-neutral-600">
            Theater scheduling interface coming soon.
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}












