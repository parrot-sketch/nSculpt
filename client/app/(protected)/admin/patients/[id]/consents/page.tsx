'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { patientService, type Patient } from '@/services/patient.service';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import Link from 'next/link';

/**
 * Consent interface
 */
interface Consent {
  id: string;
  status: string;
  templateId?: string;
  template?: {
    name: string;
    version: string;
  };
  createdAt: string;
  signedAt?: string;
  revokedAt?: string;
  presentedBy?: string;
  signedBy?: string;
}

/**
 * Admin Patient Consents Page
 * 
 * View all consents for a specific patient.
 */
export default function AdminPatientConsentsPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  // Fetch patient data
  const { data: patient, isLoading: isLoadingPatient } = useQuery({
    queryKey: ['admin', 'patients', patientId],
    queryFn: () => patientService.getPatient(patientId),
    enabled: !!patientId,
  });

  // Fetch all consents for the patient
  const { data: consents, isLoading: isLoadingConsents, error } = useQuery({
    queryKey: ['admin', 'patients', patientId, 'consents'],
    queryFn: () => patientService.getPatientConsents(patientId),
    enabled: !!patientId,
  });

  if (isLoadingPatient || isLoadingConsents) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to load consents.</p>
          <Link
            href={`/admin/patients/${patientId}`}
            className="mt-4 inline-block text-sm text-red-600 hover:text-red-800 underline"
          >
            Back to patient details
          </Link>
        </div>
      </div>
    );
  }

  const patientName = patient
    ? `${patient.firstName} ${patient.middleName ? patient.middleName + ' ' : ''}${patient.lastName}`
    : 'Patient';

  const consentList: Consent[] = Array.isArray(consents) ? consents : [];

  // Group consents by status
  const activeConsents = consentList.filter((c) => c.status === 'SIGNED' || c.status === 'ACTIVE');
  const draftConsents = consentList.filter((c) => c.status === 'DRAFT' || c.status === 'PENDING');
  const revokedConsents = consentList.filter((c) => c.status === 'REVOKED' || c.status === 'CANCELLED');

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SIGNED':
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'DRAFT':
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'REVOKED':
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Patient Consents</h1>
          <p className="mt-2 text-neutral-600">
            View all consents for {patientName}
          </p>
        </div>
        <Link
          href={`/admin/patients/${patientId}`}
          className="px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
        >
          Back to Patient
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Active Consents</p>
              <p className="text-2xl font-bold text-neutral-900 mt-1">{activeConsents.length}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 text-xl">✓</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Draft/Pending</p>
              <p className="text-2xl font-bold text-neutral-900 mt-1">{draftConsents.length}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-yellow-600 text-xl">⏳</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Revoked</p>
              <p className="text-2xl font-bold text-neutral-900 mt-1">{revokedConsents.length}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 text-xl">✗</span>
            </div>
          </div>
        </div>
      </div>

      {/* Consents List */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
        {consentList.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-neutral-500">No consents found for this patient.</p>
            <p className="text-sm text-neutral-400 mt-2">
              Consents will appear here once they are created.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-200">
            {consentList.map((consent) => (
              <div key={consent.id} className="p-6 hover:bg-neutral-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-neutral-900">
                        {consent.template?.name || 'Consent Form'}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          consent.status
                        )}`}
                      >
                        {consent.status}
                      </span>
                    </div>

                    {consent.template?.version && (
                      <p className="text-sm text-neutral-600 mb-2">
                        Version: {consent.template.version}
                      </p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-neutral-500">Created</p>
                        <p className="text-sm text-neutral-900">{formatDate(consent.createdAt)}</p>
                      </div>

                      {consent.signedAt && (
                        <div>
                          <p className="text-xs text-neutral-500">Signed</p>
                          <p className="text-sm text-neutral-900">{formatDate(consent.signedAt)}</p>
                        </div>
                      )}

                      {consent.revokedAt && (
                        <div>
                          <p className="text-xs text-neutral-500">Revoked</p>
                          <p className="text-sm text-neutral-900">{formatDate(consent.revokedAt)}</p>
                        </div>
                      )}

                      {consent.presentedBy && (
                        <div>
                          <p className="text-xs text-neutral-500">Presented By</p>
                          <p className="text-sm text-neutral-900">{consent.presentedBy}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="ml-4">
                    <Link
                      href={`/admin/consents/${consent.id}`}
                      className="px-4 py-2 text-sm border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
        <h2 className="text-xl font-semibold text-neutral-900 mb-4">Actions</h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/consents/new?patientId=${patientId}`}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Create New Consent
          </Link>
          <Link
            href={`/admin/patients/${patientId}`}
            className="px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Back to Patient Details
          </Link>
        </div>
      </div>
    </div>
  );
}
