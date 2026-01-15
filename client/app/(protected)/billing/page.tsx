'use client';

import { useQuery } from '@tanstack/react-query';
import { billingService } from '@/services/billing.service';
import { DataTable } from '@/components/tables/DataTable';
import { StatCard } from '@/components/cards/StatCard';
import { PermissionsGuard } from '@/components/layout/PermissionsGuard';
import { PERMISSION_DOMAINS, PERMISSION_ACTIONS } from '@/lib/constants';
import { buildPermission } from '@/lib/permissions';
import { Bill, Payment } from '@/types/domain';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

/**
 * Billing page - For Billing staff and Front Desk
 * Manage invoices, payments, and insurance claims
 */
export default function BillingPage() {
  const { data: billsData, isLoading: billsLoading } = useQuery({
    queryKey: ['bills'],
    queryFn: () => billingService.getBills(0, 50),
  });

  const { data: paymentsData } = useQuery({
    queryKey: ['payments'],
    queryFn: () => billingService.getPayments(undefined, 0, 10),
  });

  // Calculate stats
  const totalBills = billsData?.total || 0;
  const pendingBills =
    billsData?.data.filter((b) => b.status === 'PENDING' || b.status === 'SENT').length || 0;
  const totalRevenue =
    paymentsData?.data
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;

  const billColumns = [
    {
      key: 'billNumber',
      header: 'Bill #',
      render: (bill: Bill) => (
        <Link
          href={`/billing/bills/${bill.id}`}
          className="text-primary hover:underline font-medium"
        >
          {bill.billNumber}
        </Link>
      ),
    },
    {
      key: 'patientId',
      header: 'Patient',
      render: (bill: Bill) => (
        <Link
          href={`/patients/${bill.patientId}`}
          className="text-neutral-600 hover:text-primary"
        >
          View Patient
        </Link>
      ),
    },
    {
      key: 'billDate',
      header: 'Date',
      render: (bill: Bill) => formatDate(bill.billDate),
    },
    {
      key: 'totalAmount',
      header: 'Amount',
      render: (bill: Bill) => `$${parseFloat(bill.totalAmount).toFixed(2)}`,
    },
    {
      key: 'balance',
      header: 'Balance',
      render: (bill: Bill) => {
        const balance = parseFloat(bill.balance);
        return (
          <span className={balance > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
            ${balance.toFixed(2)}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (bill: Bill) => {
        const statusColors = {
          DRAFT: 'bg-neutral-100 text-neutral-800',
          PENDING: 'bg-yellow-100 text-yellow-800',
          SENT: 'bg-blue-100 text-blue-800',
          PARTIALLY_PAID: 'bg-orange-100 text-orange-800',
          PAID: 'bg-green-100 text-green-800',
          OVERDUE: 'bg-red-100 text-red-800',
          CANCELLED: 'bg-gray-100 text-gray-800',
        };
        return (
          <span
            className={`px-2 py-1 text-xs font-medium rounded ${
              statusColors[bill.status as keyof typeof statusColors] || 'bg-neutral-100'
            }`}
          >
            {bill.status}
          </span>
        );
      },
    },
  ];

  return (
    <PermissionsGuard
      requiredPermission={buildPermission(
        PERMISSION_DOMAINS.BILLING,
        '*',
        PERMISSION_ACTIONS.READ
      )}
    >
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-semibold text-neutral-900">Billing</h1>
          <Link
            href="/billing/bills/new"
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
          >
            Create Bill
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard title="Total Bills" value={totalBills} />
          <StatCard title="Pending Bills" value={pendingBills} />
          <StatCard title="Total Revenue" value={`$${totalRevenue.toFixed(2)}`} />
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 shadow-soft">
          {billsLoading ? (
            <div className="p-8 text-center text-neutral-500">Loading bills...</div>
          ) : (
            <DataTable
              data={billsData?.data || []}
              columns={billColumns}
              keyExtractor={(item) => item.id}
              emptyMessage="No bills found"
              onRowClick={(bill) => {
                window.location.href = `/billing/bills/${bill.id}`;
              }}
            />
          )}
        </div>
      </div>
    </PermissionsGuard>
  );
}
