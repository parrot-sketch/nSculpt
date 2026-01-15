'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { adminService } from '@/services/admin.service';
import type { BillingCode, BillingCodeQueryParams, CreateBillingCodeRequest, UpdateBillingCodeRequest } from '@/types/admin-system-config';
import { DataTable } from '@/components/tables/DataTable';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { ConfirmModal } from '@/components/admin/ConfirmModal';
import { Pagination } from '@/components/admin/Pagination';
import { SearchFilter } from '@/components/admin/SearchFilter';
import { EmptyState } from '@/components/admin/EmptyState';
import { ErrorState } from '@/components/admin/ErrorState';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { Card } from '@/components/layout/Card';
import { ResponsiveGrid } from '@/components/layout/ResponsiveGrid';
import { ROUTES } from '@/lib/constants';
import { formatDateTime } from '@/lib/utils';
import Link from 'next/link';
import { FileText } from 'lucide-react';

/**
 * Billing Codes Management Page
 * 
 * List, create, update, and deactivate billing codes (CPT, ICD-10, HCPCS).
 */
export default function BillingCodesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [codeTypeFilter, setCodeTypeFilter] = useState<'CPT' | 'ICD10' | 'HCPCS' | undefined>(undefined);
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<BillingCode | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const itemsPerPage = 50;
  const skip = (page - 1) * itemsPerPage;

  // Query parameters
  const queryParams: BillingCodeQueryParams = {
    skip,
    take: itemsPerPage,
    ...(search && { search }),
    ...(codeTypeFilter && { codeType: codeTypeFilter }),
    ...(activeFilter !== undefined && { active: activeFilter }),
  };

  // Fetch billing codes
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'billing-codes', queryParams],
    queryFn: () => adminService.listBillingCodes(queryParams),
    retry: 2,
    retryDelay: 1000,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminService.deactivateBillingCode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'billing-codes'] });
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
    },
  });

  const handleDelete = (billingCode: BillingCode) => {
    setDeleteTarget(billingCode);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id);
    }
  };

  const columns = [
    {
      key: 'code',
      header: 'Code',
      render: (bc: BillingCode) => (
        <div className="font-medium text-neutral-900 font-mono">{bc.code}</div>
      ),
    },
    {
      key: 'codeType',
      header: 'Type',
      render: (bc: BillingCode) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {bc.codeType}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (bc: BillingCode) => (
        <div className="text-neutral-900 truncate max-w-md">{bc.description}</div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (bc: BillingCode) => (
        <div className="text-sm text-neutral-600">{bc.category || '-'}</div>
      ),
    },
    {
      key: 'active',
      header: 'Status',
      render: (bc: BillingCode) => <StatusBadge status={bc.active} />,
    },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      render: (bc: BillingCode) => (
        <div className="text-sm text-neutral-500">{formatDateTime(bc.updatedAt)}</div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (bc: BillingCode) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/system-config/billing-codes/${bc.id}`}
            className="text-primary hover:text-primary/80 text-sm font-medium"
          >
            Edit
          </Link>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(bc);
            }}
            className="text-red-600 hover:text-red-700 text-sm font-medium"
            disabled={!bc.active}
          >
            Deactivate
          </button>
        </div>
      ),
    },
  ];

  const billingCodes = data?.data || [];
  const totalPages = data ? Math.ceil(data.total / itemsPerPage) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing Codes"
        description="Manage billing codes (CPT, ICD-10, HCPCS)"
        breadcrumbs={[
          { label: 'Admin', href: ROUTES.ADMIN_DASHBOARD },
          { label: 'System Configuration', href: ROUTES.ADMIN_DEPARTMENTS },
          { label: 'Billing Codes' },
        ]}
        actions={
          <Link
            href="/admin/system-config/billing-codes/new"
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium text-sm transition-colors"
          >
            Create Billing Code
          </Link>
        }
      />

      {/* Error Banner (non-blocking) */}
      {error && (
        <Card padding="sm" className="bg-red-50 border-red-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-red-800">
                  Unable to load billing codes
                </p>
                <p className="text-sm text-red-700 mt-1">
                  You can still create new billing codes. The list will refresh automatically.
                </p>
              </div>
            </div>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['admin', 'billing-codes'] })}
              className="text-sm font-medium text-red-800 hover:text-red-900 underline"
            >
              Retry
            </button>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card padding="sm">
        <ResponsiveGrid columns={{ mobile: 1, tablet: 4 }} gap="sm">
          <div className="md:col-span-2">
            <SearchFilter
              placeholder="Search by code or description..."
              value={search}
              onChange={setSearch}
            />
          </div>
          <div>
            <select
              value={codeTypeFilter || 'all'}
              onChange={(e) => {
                const value = e.target.value;
                setCodeTypeFilter(value === 'all' ? undefined : value as 'CPT' | 'ICD10' | 'HCPCS');
                setPage(1);
              }}
              className="block w-full py-2 px-3 border border-neutral-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            >
              <option value="all">All Types</option>
              <option value="CPT">CPT</option>
              <option value="ICD10">ICD-10</option>
              <option value="HCPCS">HCPCS</option>
            </select>
          </div>
          <div>
            <select
              value={activeFilter === undefined ? 'all' : activeFilter ? 'active' : 'inactive'}
              onChange={(e) => {
                const value = e.target.value;
                setActiveFilter(
                  value === 'all' ? undefined : value === 'active'
                );
                setPage(1);
              }}
              className="block w-full py-2 px-3 border border-neutral-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </ResponsiveGrid>
      </Card>

      {/* Table */}
      <Card shadow="none" padding="none">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : billingCodes.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-12 w-12 text-neutral-400" />}
            title="No billing codes found"
            description={search || codeTypeFilter || activeFilter !== undefined
              ? 'Try adjusting your search or filter criteria'
              : error
                ? 'Unable to load billing codes. You can still create a new billing code.'
                : 'Get started by creating a new billing code'}
            action={
              <Link
                href="/admin/system-config/billing-codes/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90"
              >
                Create Billing Code
              </Link>
            }
          />
        ) : (
          <>
            <DataTable
              data={billingCodes}
              columns={columns}
              keyExtractor={(bc) => bc.id}
              emptyMessage="No billing codes found"
            />
            {totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={data?.total || 0}
                itemsPerPage={itemsPerPage}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        title="Deactivate Billing Code"
        message={`Are you sure you want to deactivate "${deleteTarget?.code}"? This action can be reversed later.`}
        confirmText="Deactivate"
        cancelText="Cancel"
        variant="warning"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

