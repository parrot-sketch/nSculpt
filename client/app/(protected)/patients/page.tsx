'use client';

import { AuthGuard } from '@/components/layout/AuthGuard';
import { PermissionsGuard } from '@/components/layout/PermissionsGuard';
import { buildPermission } from '@/lib/permissions';
import { PERMISSION_DOMAINS, PERMISSION_ACTIONS, ROLES } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useEffect, useState } from 'react';
import { patientService, type Patient } from '@/services/patient.service';

/**
 * Patients List Page
 * 
 * Security:
 * - Requires authentication (AuthGuard)
 * - Requires patients:*:read permission (PermissionsGuard)
 * - Backend filters results by user access (surgical case assignments, department)
 * - Multi-role users see combined accessible patients
 */
export default function PatientsPage() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canWrite = hasPermission(buildPermission(PERMISSION_DOMAINS.PATIENTS, '*', PERMISSION_ACTIONS.WRITE));
  const canDelete = hasPermission(buildPermission(PERMISSION_DOMAINS.PATIENTS, '*', PERMISSION_ACTIONS.DELETE));

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        // Backend automatically filters by user access
        // Multi-role users get combined results from all their roles
        const response = await patientService.getPatients(0, 100);
        setPatients(response.data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load patients');
        // If 403, user doesn't have access (shouldn't happen due to guards, but defensive)
        if (err.statusCode === 403) {
          setError('Access denied. You do not have permission to view patients.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  return (
    <AuthGuard
      requiredRoles={[ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.FRONT_DESK]}
      requiredPermission={buildPermission(PERMISSION_DOMAINS.PATIENTS, '*', PERMISSION_ACTIONS.READ)}
    >
      <PermissionsGuard
        requiredPermission={buildPermission(PERMISSION_DOMAINS.PATIENTS, '*', PERMISSION_ACTIONS.READ)}
      >
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-neutral-900">Patients</h1>
            {canWrite && (
              <a 
                href="/admin/patients/new"
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
              >
                Add Patient
              </a>
            )}
          </div>

          {loading && <div className="text-neutral-500">Loading patients...</div>}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && (
            <>
              {patients.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                  No patients found. {user?.roles.includes(ROLES.ADMIN) 
                    ? 'Patients will appear here once created.' 
                    : 'You do not have access to any patients.'}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-200">
                      <thead className="bg-neutral-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            File No.
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Patient Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Age
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            DOB
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Phone
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            City
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Next of Kin
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Next of Kin Contact
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-neutral-200">
                        {patients.map((patient) => {
                          // Calculate age from date of birth
                          const calculateAge = (dob: string | Date | undefined): number | null => {
                            if (!dob) return null;
                            const birthDate = new Date(dob);
                            const today = new Date();
                            let age = today.getFullYear() - birthDate.getFullYear();
                            const monthDiff = today.getMonth() - birthDate.getMonth();
                            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                              age--;
                            }
                            return age;
                          };

                          const age = patient.age ?? calculateAge(patient.dateOfBirth);
                          const fullName = [
                            patient.firstName,
                            patient.middleName,
                            patient.lastName
                          ].filter(Boolean).join(' ');

                          // Format date of birth
                          const formatDOB = (dob: string | Date | undefined): string => {
                            if (!dob) return 'N/A';
                            const date = new Date(dob);
                            return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
                          };

                          return (
                            <tr key={patient.id} className="hover:bg-neutral-50">
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                                {patient.fileNumber || 'N/A'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-900">
                                {fullName}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-500">
                                {age !== null ? age : 'N/A'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-500">
                                {formatDOB(patient.dateOfBirth)}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-500">
                                {patient.phone || 'N/A'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-500">
                                {patient.city || 'N/A'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-500">
                                {patient.nextOfKinRelationship || 'N/A'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-500">
                                {patient.nextOfKinContact || 'N/A'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm">
                                <div className="flex space-x-2">
                                  <button 
                                    onClick={() => window.location.href = `/admin/patients/${patient.id}`}
                                    className="text-primary hover:text-primary-dark transition-colors"
                                  >
                                    View
                                  </button>
                                  {canWrite && (
                                    <button 
                                      onClick={() => window.location.href = `/admin/patients/${patient.id}/edit`}
                                      className="text-neutral-600 hover:text-neutral-900 transition-colors"
                                    >
                                      Edit
                                    </button>
                                  )}
                                  {canDelete && (
                                    <button className="text-red-600 hover:text-red-800 transition-colors">
                                      Delete
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </PermissionsGuard>
    </AuthGuard>
  );
}
