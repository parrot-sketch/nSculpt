'use client';

import { AuthGuard } from '@/components/layout/AuthGuard';
import { PermissionsGuard } from '@/components/layout/PermissionsGuard';
import { buildPermission } from '@/lib/permissions';
import { PERMISSION_DOMAINS, PERMISSION_ACTIONS, ROLES } from '@/lib/constants';
import { usePermissions } from '@/hooks/usePermissions';
import { useEffect, useState } from 'react';
import { theaterService } from '@/services/theater.service';
import type { SurgicalCase } from '@/types/domain';

/**
 * Surgical Cases List Page
 * 
 * Security:
 * - Requires authentication (AuthGuard)
 * - Requires theater:*:read permission (PermissionsGuard)
 * - Requires ADMIN, SURGEON, NURSE, or DOCTOR role
 * - Backend filters results by primarySurgeonId, ResourceAllocation, or department
 * - Multi-role users see combined accessible cases
 */
export default function TheaterCasesPage() {
  const { hasPermission } = usePermissions();
  const [cases, setCases] = useState<SurgicalCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canWrite = hasPermission(buildPermission(PERMISSION_DOMAINS.THEATER, '*', PERMISSION_ACTIONS.WRITE));

  useEffect(() => {
    const fetchCases = async () => {
      try {
        setLoading(true);
        // Backend automatically filters by user access
        // Only cases where user is primary surgeon, allocated staff, or in same department
        const response = await theaterService.getCases(0, 100);
        setCases(response.data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load surgical cases');
        if (err.statusCode === 403) {
          setError('Access denied. You do not have permission to view surgical cases.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCases();
  }, []);

  return (
    <AuthGuard
      requiredRoles={[ROLES.ADMIN, ROLES.SURGEON, ROLES.NURSE, ROLES.DOCTOR]}
      requiredPermission={buildPermission(PERMISSION_DOMAINS.THEATER, '*', PERMISSION_ACTIONS.READ)}
    >
      <PermissionsGuard
        requiredPermission={buildPermission(PERMISSION_DOMAINS.THEATER, '*', PERMISSION_ACTIONS.READ)}
      >
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-neutral-900">Surgical Cases</h1>
            {canWrite && (
              <button className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primaryDark">
                Create Case
              </button>
            )}
          </div>

          {loading && <div className="text-neutral-500">Loading surgical cases...</div>}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && (
            <>
              {cases.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                  No surgical cases found. Cases will appear here once created for cases you are assigned to.
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-neutral-200">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          Case Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          Procedure
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          Scheduled Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-neutral-200">
                      {cases.map((case_) => (
                        <tr key={case_.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                            {case_.caseNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                            {case_.procedureName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                            {case_.scheduledStartAt ? new Date(case_.scheduledStartAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                            {case_.status}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex space-x-2">
                              <button className="text-primary hover:text-primaryDark">View</button>
                              {canWrite && (
                                <button className="text-neutral-600 hover:text-neutral-900">Edit</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </PermissionsGuard>
    </AuthGuard>
  );
}

