'use client';

import { useQuery } from '@tanstack/react-query';
import { theaterService } from '@/services/theater.service';
import { medicalRecordsService } from '@/services/medicalRecords.service';
import { DataTable } from '@/components/tables/DataTable';
import { PermissionsGuard } from '@/components/layout/PermissionsGuard';
import { PERMISSION_DOMAINS, PERMISSION_ACTIONS } from '@/lib/constants';
import { buildPermission } from '@/lib/permissions';
import { SurgicalCase, ClinicalNote } from '@/types/domain';
import { formatDateTime } from '@/lib/utils';
import Link from 'next/link';

/**
 * Post-Op Notes page - For Surgeons/Doctors/Nurses
 * Manage post-operative documentation
 */
export default function PostOpPage() {
  const { data: casesData, isLoading } = useQuery({
    queryKey: ['post-op-cases'],
    queryFn: () => theaterService.getCases(0, 50),
  });

  // Filter to completed cases that may need post-op notes
  const completedCases = casesData?.data.filter(
    (c) => c.status === 'COMPLETED' || c.status === 'IN_PROGRESS'
  ) || [];

  const columns = [
    {
      key: 'caseNumber',
      header: 'Case #',
      render: (case_: SurgicalCase) => (
        <Link
          href={`/post-op/${case_.id}`}
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
      key: 'actualEndAt',
      header: 'Completed',
      render: (case_: SurgicalCase) =>
        case_.actualEndAt ? formatDateTime(case_.actualEndAt) : 'In Progress',
    },
    {
      key: 'status',
      header: 'Status',
      render: (case_: SurgicalCase) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded ${
            case_.status === 'COMPLETED'
              ? 'bg-green-100 text-green-800'
              : 'bg-blue-100 text-blue-800'
          }`}
        >
          {case_.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (case_: SurgicalCase) => (
        <Link
          href={`/post-op/${case_.id}/notes`}
          className="text-primary hover:underline text-sm"
        >
          Add Note
        </Link>
      ),
    },
  ];

  return (
    <PermissionsGuard
      requiredPermission={buildPermission(
        PERMISSION_DOMAINS.MEDICAL_RECORDS,
        '*',
        PERMISSION_ACTIONS.WRITE
      )}
    >
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-neutral-900">Post-Operative Notes</h1>
          <p className="text-neutral-600 mt-1">
            Document post-operative care and follow-up notes
          </p>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 shadow-soft">
          {isLoading ? (
            <div className="p-8 text-center text-neutral-500">Loading cases...</div>
          ) : (
            <DataTable
              data={completedCases}
              columns={columns}
              keyExtractor={(item) => item.id}
              emptyMessage="No completed cases found"
            />
          )}
        </div>
      </div>
    </PermissionsGuard>
  );
}












