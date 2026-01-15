'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { adminService } from '@/services/admin.service';
import type { Vendor, VendorQueryParams, CreateVendorRequest, UpdateVendorRequest } from '@/types/admin-system-config';
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
import { Building2 } from 'lucide-react';

/**
 * Vendors Management Page
 * 
 * List, create, update, and deactivate vendors.
 */
export default function VendorsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const itemsPerPage = 50;
  const skip = (page - 1) * itemsPerPage;

  // Query parameters
  const queryParams: VendorQueryParams = {
    skip,
    take: itemsPerPage,
    ...(search && { search }),
    ...(activeFilter !== undefined && { active: activeFilter }),
  };

  // Fetch vendors
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'vendors', queryParams],
    queryFn: () => adminService.listVendors(queryParams),
    retry: 2,
    retryDelay: 1000,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminService.deactivateVendor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'vendors'] });
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
    },
  });

  const handleDelete = (vendor: Vendor) => {
    setDeleteTarget(vendor);
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
      render: (vendor: Vendor) => (
        <div className="font-medium text-neutral-900 font-mono">{vendor.code}</div>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      render: (vendor: Vendor) => (
        <div className="text-neutral-900">{vendor.name}</div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (vendor: Vendor) => (
        <div className="text-sm text-neutral-600">
          {vendor.contactName && <div>{vendor.contactName}</div>}
          {vendor.email && <div className="text-neutral-500">{vendor.email}</div>}
          {vendor.phone && <div className="text-neutral-500">{vendor.phone}</div>}
        </div>
      ),
    },
    {
      key: 'active',
      header: 'Status',
      render: (vendor: Vendor) => <StatusBadge status={vendor.active} />,
    },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      render: (vendor: Vendor) => (
        <div className="text-sm text-neutral-500">{formatDateTime(vendor.updatedAt)}</div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (vendor: Vendor) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/system-config/vendors/${vendor.id}`}
            className="text-primary hover:text-primary/80 text-sm font-medium"
          >
            Edit
          </Link>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(vendor);
            }}
            className="text-red-600 hover:text-red-700 text-sm font-medium"
            disabled={!vendor.active}
          >
            Deactivate
          </button>
        </div>
      ),
    },
  ];

  const vendors = data?.data || [];
  const totalPages = data ? Math.ceil(data.total / itemsPerPage) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendors"
        description="Manage inventory vendors and suppliers"
        breadcrumbs={[
          { label: 'Admin', href: ROUTES.ADMIN_DASHBOARD },
          { label: 'System Configuration', href: ROUTES.ADMIN_DEPARTMENTS },
          { label: 'Vendors' },
        ]}
        actions={
          <Link
            href="/admin/system-config/vendors/new"
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium text-sm transition-colors"
          >
            Create Vendor
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
                  Unable to load vendors
                </p>
                <p className="text-sm text-red-700 mt-1">
                  You can still create new vendors. The list will refresh automatically.
                </p>
              </div>
            </div>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['admin', 'vendors'] })}
              className="text-sm font-medium text-red-800 hover:text-red-900 underline"
            >
              Retry
            </button>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card padding="sm">
        <ResponsiveGrid columns={{ mobile: 1, tablet: 3 }} gap="sm">
          <div className="md:col-span-2">
            <SearchFilter
              placeholder="Search vendors by code, name, or contact..."
              value={search}
              onChange={setSearch}
            />
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
        ) : vendors.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-12 w-12 text-neutral-400" />}
            title="No vendors found"
            description={search || activeFilter !== undefined
              ? 'Try adjusting your search or filter criteria'
              : error
                ? 'Unable to load vendors. You can still create a new vendor.'
                : 'Get started by creating a new vendor'}
            action={
              <Link
                href="/admin/system-config/vendors/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90"
              >
                Create Vendor
              </Link>
            }
          />
        ) : (
          <>
            <DataTable
              data={vendors}
              columns={columns}
              keyExtractor={(vendor) => vendor.id}
              emptyMessage="No vendors found"
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
        title="Deactivate Vendor"
        message={`Are you sure you want to deactivate "${deleteTarget?.name}"? This action can be reversed later.`}
        confirmText="Deactivate"
        cancelText="Cancel"
        variant="warning"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

