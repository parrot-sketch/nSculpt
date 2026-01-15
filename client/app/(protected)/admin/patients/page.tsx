'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { patientService, type Patient } from '@/services/patient.service';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import Link from 'next/link';

// Age is now calculated server-side, no need for client-side calculation

/**
 * Format date for display
 */
function formatDate(date: string | Date | undefined): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Admin Patients Management Page
 * 
 * List patients showing only specified attributes (no patient IDs for security).
 * Display order: File No., Patient Name, Age, DOB, Email, Tel, WhatsApp, Occupation, Drug Allergies, Residence, Next of Kin, Relation, Next of Kin Contact, Doctor in Charge
 */
export default function AdminPatientsPage() {
  const [search, setSearch] = useState('');
  const [skip, setSkip] = useState(0);
  const [take] = useState(20);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'patients', skip, take, search],
    queryFn: () => patientService.getPatients(skip, take, search),
  });

  const patients = data?.data || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Failed to load patients.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Patient Management</h1>
          <p className="mt-2 text-neutral-600">
            Manage patient records and view patient information
          </p>
        </div>
        <Link
          href="/admin/patients/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <span>+</span>
          <span>Create Patient</span>
        </Link>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400">🔍</span>
            <input
              type="text"
              placeholder="Search by name, file number, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Patients Table - Only showing specified attributes, NO patient IDs */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
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
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Tel
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  WhatsApp
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Occupation
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Residence
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {patients.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-neutral-500">
                    {search ? 'No patients found matching your search.' : 'No patients found.'}
                  </td>
                </tr>
              ) : (
                patients.map((patient: Patient) => (
                  <tr key={patient.id} className="hover:bg-neutral-50">
                    {/* File No. */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-neutral-900">
                        {patient.fileNumber || patient.patientNumber || 'N/A'}
                      </div>
                    </td>

                    {/* Patient Name */}
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-neutral-900">
                        {patient.firstName} {patient.middleName ? `${patient.middleName} ` : ''}{patient.lastName}
                      </div>
                    </td>

                    {/* Age - calculated server-side */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-neutral-900">
                        {patient.age !== undefined ? `${patient.age} years` : 'N/A'}
                      </div>
                    </td>

                    {/* DOB */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-neutral-900">
                        {patient.dateOfBirth ? formatDate(patient.dateOfBirth) : 'N/A'}
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-neutral-900">
                        {patient.email || 'N/A'}
                      </div>
                    </td>

                    {/* Tel */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-neutral-900">
                        {patient.phone || 'N/A'}
                      </div>
                    </td>

                    {/* WhatsApp */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-neutral-900">
                        {patient.whatsapp || 'N/A'}
                      </div>
                    </td>

                    {/* Occupation */}
                    <td className="px-4 py-4">
                      <div className="text-sm text-neutral-900">
                        {patient.occupation || 'N/A'}
                      </div>
                    </td>

                    {/* Residence */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-neutral-900">
                        {patient.city || patient.address?.city || 'N/A'}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/admin/patients/${patient.id}`}
                          className="text-primary hover:text-primary/80"
                        >
                          View
                        </Link>
                        <Link
                          href={`/admin/patients/${patient.id}/consents/new`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Consent
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.total && data.total > take && (
          <div className="px-6 py-4 border-t border-neutral-200 flex items-center justify-between">
            <div className="text-sm text-neutral-700">
              Showing {skip + 1} to {Math.min(skip + take, data.total)} of {data.total} patients
            </div>
            <div className="flex gap-2">
              <button
                disabled={skip === 0}
                onClick={() => setSkip(Math.max(0, skip - take))}
                className="px-4 py-2 border border-neutral-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50"
              >
                Previous
              </button>
              <button
                disabled={skip + take >= (data.total || 0)}
                onClick={() => setSkip(skip + take)}
                className="px-4 py-2 border border-neutral-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
