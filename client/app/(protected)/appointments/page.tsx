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
 * Appointments page - For Front Desk and Billing
 * View and manage patient appointments (surgical cases)
 */
export default function AppointmentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => theaterService.getCases(0, 100),
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
      key: 'patientId',
      header: 'Patient',
      render: (case_: SurgicalCase) => (
        <Link
          href={`/patients/${case_.patientId}`}
          className="text-neutral-600 hover:text-primary"
        >
          View Patient
        </Link>
      ),
    },
    {
      key: 'scheduledStartAt',
      header: 'Appointment Time',
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
  ];

  return (
    <PermissionsGuard
      requiredPermission={buildPermission(
        PERMISSION_DOMAINS.PATIENTS,
        '*',
        PERMISSION_ACTIONS.READ
      )}
    >
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-neutral-900">Appointments</h1>
          <p className="text-neutral-600 mt-1">View and manage patient appointments</p>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 shadow-soft">
          {isLoading ? (
            <div className="p-8 text-center text-neutral-500">Loading appointments...</div>
          ) : (
            <DataTable
              data={data?.data || []}
              columns={columns}
              keyExtractor={(item) => item.id}
              emptyMessage="No appointments found"
              onRowClick={(case_) => {
                window.location.href = `/procedures/${case_.id}`;
              }}
            />
          )}
        </div>
      </div>
    </PermissionsGuard>
  );
}












