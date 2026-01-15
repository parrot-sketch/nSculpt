'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { FileText, Plus, Eye } from 'lucide-react';
import { consentService } from '@/services/consent.service';
import { Card } from '@/components/layout/Card';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { EmptyState } from '@/components/admin/EmptyState';
import type { PatientConsentInstance } from '@/types/consent';

/**
 * Consent Management Page
 * 
 * Lists all consent instances for the current user's patients
 */
export default function ConsentPage() {
  const { data: instances, isLoading, error } = useQuery<PatientConsentInstance[]>({
    queryKey: ['consent', 'instances'],
    queryFn: () => consentService.getInstancesByPatient(''), // TODO: Filter by user's patients
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-neutral-900">Consent Management</h1>
        </div>
        <Card padding="md">
          <LoadingSpinner />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-neutral-900">Consent Management</h1>
        </div>
        <Card padding="md" className="bg-red-50 border-red-200">
          <p className="text-red-800">Error loading consents. Please try again.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Consent Management</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Manage patient consent forms
          </p>
        </div>
        <Link
          href="/consent/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Consent
        </Link>
      </div>

      {!instances || instances.length === 0 ? (
        <Card padding="md">
          <EmptyState
            icon={<FileText className="h-12 w-12 text-neutral-400" />}
            title="No consents yet"
            description="Create a new consent instance for a patient"
            action={
              <Link
                href="/consent/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create Consent
              </Link>
            }
          />
        </Card>
      ) : (
        <Card padding="md">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-3 px-4 font-semibold text-neutral-900">
                    Instance Number
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-neutral-900">
                    Template
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-neutral-900">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-neutral-900">
                    Created
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-neutral-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {instances.map((instance) => (
                  <tr
                    key={instance.id}
                    className="border-b border-neutral-100 hover:bg-neutral-50"
                  >
                    <td className="py-3 px-4">
                      <code className="text-sm text-neutral-600">
                        {instance.instanceNumber}
                      </code>
                    </td>
                    <td className="py-3 px-4 font-medium text-neutral-900">
                      {instance.template?.name || 'Unknown Template'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-sm px-2 py-1 rounded ${
                          instance.status === 'SIGNED'
                            ? 'bg-green-100 text-green-700'
                            : instance.status === 'DRAFT'
                            ? 'bg-neutral-100 text-neutral-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {instance.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-neutral-600">
                      {new Date(instance.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Link
                          href={`/consent/${instance.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          View
                        </Link>
                        {instance.status !== 'SIGNED' && (
                          <Link
                            href={`/consent/${instance.id}/sign`}
                            className="text-sm text-green-600 hover:underline"
                          >
                            Sign
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}




