'use client';

import { AuthGuard } from '@/components/layout/AuthGuard';
import { PermissionsGuard } from '@/components/layout/PermissionsGuard';
import { buildPermission } from '@/lib/permissions';
import { PERMISSION_DOMAINS, PERMISSION_ACTIONS, ROLES } from '@/lib/constants';
import { usePermissions } from '@/hooks/usePermissions';
import { useEffect, useState } from 'react';
import { medicalRecordsService } from '@/services/medicalRecords.service';
import type { MedicalRecord } from '@/types/domain';

/**
 * Medical Records List Page
 * 
 * Security:
 * - Requires authentication (AuthGuard)
 * - Requires medical_records:*:read permission (PermissionsGuard)
 * - Requires ADMIN, DOCTOR, or NURSE role
 * - Backend filters results by patient relationships
 * - Multi-role users see combined accessible records
 */
export default function MedicalRecordsPage() {
  const { hasPermission } = usePermissions();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canWrite = hasPermission(buildPermission(PERMISSION_DOMAINS.MEDICAL_RECORDS, '*', PERMISSION_ACTIONS.WRITE));
  const canManage = hasPermission(buildPermission(PERMISSION_DOMAINS.MEDICAL_RECORDS, '*', PERMISSION_ACTIONS.MANAGE));

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        setLoading(true);
        // Backend automatically filters by user access
        // Only records for patients user has relationship with are returned
        const response = await medicalRecordsService.getRecords(undefined, 0, 100);
        setRecords(response.data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load medical records');
        if (err.statusCode === 403) {
          setError('Access denied. You do not have permission to view medical records.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, []);

  return (
    <AuthGuard
      requiredRoles={[ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE]}
      requiredPermission={buildPermission(PERMISSION_DOMAINS.MEDICAL_RECORDS, '*', PERMISSION_ACTIONS.READ)}
    >
      <PermissionsGuard
        requiredPermission={buildPermission(PERMISSION_DOMAINS.MEDICAL_RECORDS, '*', PERMISSION_ACTIONS.READ)}
      >
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-neutral-900">Medical Records</h1>
            {canWrite && (
              <button className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primaryDark">
                Create Record
              </button>
            )}
          </div>

          {loading && <div className="text-neutral-500">Loading medical records...</div>}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && (
            <>
              {records.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                  No medical records found. Records will appear here once created for patients you have access to.
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-neutral-200">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          Record Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          Patient ID
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
                      {records.map((record) => (
                        <tr key={record.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                            {record.recordNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                            {record.patientId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                            {record.status}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex space-x-2">
                              <button className="text-primary hover:text-primaryDark">View</button>
                              {canWrite && (
                                <button className="text-neutral-600 hover:text-neutral-900">Edit</button>
                              )}
                              {canManage && (
                                <button className="text-neutral-600 hover:text-neutral-900">Merge</button>
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

