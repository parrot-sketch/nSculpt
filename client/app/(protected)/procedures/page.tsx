'use client';

import { useQuery } from '@tanstack/react-query';
import { theaterService } from '@/services/theater.service';
import { DataTable } from '@/components/tables/DataTable';
import { PermissionsGuard } from '@/components/layout/PermissionsGuard';
import { PERMISSION_DOMAINS, PERMISSION_ACTIONS } from '@/lib/constants';
import { buildPermission } from '@/lib/permissions';
import { SurgicalCase } from '@/types/domain';
import { formatDateTime } from '@/lib/utils';
import Link from 'next/link';

/**
 * Procedures page - For Surgeons/Doctors
 * Lists all surgical cases with ability to view details and manage
 */
export default function ProceduresPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['surgical-cases'],
    queryFn: () => theaterService.getCases(0, 50),
  });

  const columns = [
    {
      key: 'caseNumber',
      header: 'Case #',
      render: (case_: SurgicalCase) => (
        <Link
          href={`/procedures/${case_.id}`}
          className="text-primary hover:underline font-medium"
        >
          {case_.caseNumber}
        </Link>
      ),
    },
    {
      key: 'procedureName',
      header: 'Procedure',
      render: (case_: SurgicalCase) => (
        <div>
          <p className="font-medium text-neutral-900">{case_.procedureName}</p>
          {case_.procedureCode && (
            <p className="text-xs text-neutral-500">{case_.procedureCode}</p>
          )}
        </div>
      ),
    },
    {
      key: 'scheduledStartAt',
      header: 'Scheduled',
      render: (case_: SurgicalCase) => formatDateTime(case_.scheduledStartAt),
    },
    {
      key: 'status',
      header: 'Status',
      render: (case_: SurgicalCase) => {
        const statusColors = {
          SCHEDULED: 'bg-blue-100 text-blue-800',
          IN_PROGRESS: 'bg-green-100 text-green-800',
          COMPLETED: 'bg-neutral-100 text-neutral-800',
          CANCELLED: 'bg-red-100 text-red-800',
          POSTPONED: 'bg-yellow-100 text-yellow-800',
        };
        return (
          <span
            className={`px-2 py-1 text-xs font-medium rounded ${
              statusColors[case_.status as keyof typeof statusColors] || 'bg-neutral-100'
            }`}
          >
            {case_.status}
          </span>
        );
      },
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (case_: SurgicalCase) => (
        <span className="text-sm text-neutral-600">{case_.priority}/10</span>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-neutral-500">Loading procedures...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading procedures. Please try again.</p>
      </div>
    );
  }

  return (
    <PermissionsGuard
      requiredPermission={buildPermission(
        PERMISSION_DOMAINS.THEATER,
        '*',
        PERMISSION_ACTIONS.READ
      )}
    >
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-semibold text-neutral-900">Surgical Procedures</h1>
          <Link
            href="/procedures/new"
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
          >
            New Procedure
          </Link>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 shadow-soft">
          <DataTable
            data={data?.data || []}
            columns={columns}
            keyExtractor={(item) => item.id}
            emptyMessage="No procedures found"
            onRowClick={(case_) => {
              window.location.href = `/procedures/${case_.id}`;
            }}
          />
        </div>
      </div>
    </PermissionsGuard>
  );
}












