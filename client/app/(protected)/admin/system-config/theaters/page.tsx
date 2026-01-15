'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { adminService } from '@/services/admin.service';
import type { OperatingTheater, TheaterQueryParams } from '@/types/admin-system-config';
import { DataTable } from '@/components/tables/DataTable';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { ConfirmModal } from '@/components/admin/ConfirmModal';
import { Pagination } from '@/components/admin/Pagination';
import { SearchFilter } from '@/components/admin/SearchFilter';
import { EmptyState } from '@/components/admin/EmptyState';
import { Stethoscope, Search } from 'lucide-react';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { Card } from '@/components/layout/Card';
import { ResponsiveGrid } from '@/components/layout/ResponsiveGrid';
import { ROUTES } from '@/lib/constants';
import { formatDateTime } from '@/lib/utils';
import Link from 'next/link';
import { useAdminUsers, useAdminUserMutations } from '@/hooks/useAdminQuery';

/**
 * Operating Theaters Management Page
 * 
 * List, create, update, and deactivate operating theaters.
 * Now includes Staff Eligibility management.
 */
export default function TheatersPage() {
  const [activeTab, setActiveTab] = useState<'theaters' | 'staff'>('theaters');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operating Theaters</h1>
          <p className="mt-1 text-sm text-gray-500">Manage theaters and staff eligibility.</p>
        </div>

        {/* Tabs */}
        <nav className="flex space-x-4" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('theaters')}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'theaters'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
          >
            Theaters
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'staff'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
          >
            Staff Eligibility
          </button>
        </nav>
      </div>

      {activeTab === 'theaters' ? <TheatersPanel /> : <StaffEligibilityPanel />}
    </div>
  );
}

function TheatersPanel() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<OperatingTheater | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const itemsPerPage = 50;
  const skip = (page - 1) * itemsPerPage;

  // Fetch departments for filter
  const { data: departmentsData } = useQuery({
    queryKey: ['admin', 'departments', { active: true }],
    queryFn: () => adminService.listDepartments({ active: true, take: 1000 }),
  });

  // Query parameters
  const queryParams: TheaterQueryParams = {
    skip,
    take: itemsPerPage,
    ...(search && { search }),
    ...(departmentFilter && { departmentId: departmentFilter }),
    ...(activeFilter !== undefined && { active: activeFilter }),
  };

  // Fetch theaters
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'theaters', queryParams],
    queryFn: () => adminService.listTheaters(queryParams),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminService.deactivateTheater(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'theaters'] });
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
    },
  });

  const handleDelete = (theater: OperatingTheater) => {
    setDeleteTarget(theater);
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
      render: (theater: OperatingTheater) => (
        <div className="font-medium text-neutral-900">{theater.code}</div>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      render: (theater: OperatingTheater) => (
        <div className="text-neutral-900">{theater.name}</div>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      render: (theater: OperatingTheater) => (
        <div className="text-neutral-600">{theater.department?.name || '-'}</div>
      ),
    },
    {
      key: 'active',
      header: 'Status',
      render: (theater: OperatingTheater) => <StatusBadge status={theater.active} />,
    },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      render: (theater: OperatingTheater) => (
        <div className="text-sm text-neutral-500">{formatDateTime(theater.updatedAt)}</div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (theater: OperatingTheater) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/system-config/theaters/${theater.id}`}
            className="text-primary hover:text-primary/80 text-sm font-medium"
          >
            Edit
          </Link>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(theater);
            }}
            className="text-red-600 hover:text-red-700 text-sm font-medium"
            disabled={!theater.active}
          >
            Deactivate
          </button>
        </div>
      ),
    },
  ];

  const theaters = data?.data || [];
  const totalPages = data ? Math.ceil(data.total / itemsPerPage) : 0;
  const departments = departmentsData?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link
          href="/admin/system-config/theaters/new"
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium text-sm transition-colors"
        >
          Create Theater
        </Link>
      </div>

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
                  Unable to load theaters
                </p>
                <p className="text-sm text-red-700 mt-1">
                  You can still create new theaters. The list will refresh automatically.
                </p>
              </div>
            </div>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['admin', 'theaters'] })}
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
              placeholder="Search theaters by code or name..."
              value={search}
              onChange={setSearch}
            />
          </div>
          <div>
            <select
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setPage(1);
              }}
              className="block w-full py-2 px-3 border border-neutral-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={activeFilter === undefined ? 'all' : activeFilter ? 'active' : 'inactive'}
              onChange={(e) => {
                const value = e.target.value;
                setActiveFilter(value === 'all' ? undefined : value === 'active');
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
        ) : theaters.length === 0 ? (
          <EmptyState
            icon={<Stethoscope className="h-12 w-12 text-neutral-400" />}
            title="No theaters found"
            description={search || departmentFilter || activeFilter !== undefined
              ? 'Try adjusting your search or filter criteria'
              : error
                ? 'Unable to load theaters. You can still create a new theater.'
                : 'Get started by creating a new operating theater'}
            action={
              <Link
                href="/admin/system-config/theaters/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90"
              >
                Create Theater
              </Link>
            }
          />
        ) : (
          <>
            <DataTable
              data={theaters}
              columns={columns}
              keyExtractor={(theater) => theater.id}
              emptyMessage="No theaters found"
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
        title="Deactivate Theater"
        message={`Are you sure you want to deactivate "${deleteTarget?.name}"? This action can be reversed later.`}
        confirmText="Deactivate"
        cancelText="Cancel"
        variant="warning"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

function StaffEligibilityPanel() {
  const [search, setSearch] = useState('');
  const { data: usersData, isLoading } = useAdminUsers({ search, take: 50 }); // Fetch more for config
  const { updateUser } = useAdminUserMutations();

  const handleToggleEligibility = async (user: any) => {
    try {
      await updateUser.mutateAsync({
        id: user.id,
        data: { isTheaterEligible: !user.isTheaterEligible }
      });
    } catch (e) {
      console.error('Failed to toggle eligibility', e);
    }
  };

  const users = usersData?.users || [];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card padding="sm">
        <div className="max-w-md">
          <SearchFilter
            placeholder="Search staff by name or email..."
            value={search}
            onChange={setSearch}
          />
        </div>
      </Card>

      {/* Table */}
      <Card shadow="none" padding="none">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Staff Member</th>
              <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Role</th>
              <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Theater Work Eligibility</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {isLoading ? (
              <tr><td colSpan={3} className="py-12"><div className="flex justify-center"><LoadingSpinner /></div></td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={3} className="py-12 text-center text-slate-500">No staff found matching criteria.</td></tr>
            ) : (
              users.map((user: any) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                    <div className="font-medium text-slate-900">{user.firstName} {user.lastName}</div>
                    <div className="text-slate-500 text-xs">{user.email}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                    {user.title || user.roleAssignments?.[0]?.role?.name || 'No Role'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <label className="inline-flex items-center cursor-pointer group">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer disabled:opacity-50"
                        checked={!!user.isTheaterEligible}
                        disabled={updateUser.isPending}
                        onChange={() => handleToggleEligibility(user)}
                      />
                      <span className={`ml-2 text-sm ${user.isTheaterEligible ? 'text-indigo-700 font-medium' : 'text-slate-500'} group-hover:text-indigo-900`}>
                        {user.isTheaterEligible ? 'Eligible' : 'Not Eligible'}
                      </span>
                    </label>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">About Staff Eligibility</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>Staff marked as "Eligible" will appear in theater scheduling and booking workflows. This does not grant them improved system permissions (RBAC), but simply filters them into the clinical workflow lists.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
