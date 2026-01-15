'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/admin.service';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import type { AdminPermission, PermissionQueryParams } from '@/types/admin';
// Simple icons

/**
 * Permissions Management Page
 * 
 * View and filter system permissions.
 */
export default function AdminPermissionsPage() {
  const [filters, setFilters] = useState<PermissionQueryParams>({});
  const [selectedDomain, setSelectedDomain] = useState<string>('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'permissions', filters],
    queryFn: () => adminService.listPermissions(filters),
  });

  const { data: stats } = useQuery({
    queryKey: ['admin', 'permissions', 'stats'],
    queryFn: () => adminService.getPermissionStats(),
  });

  const domains = [
    'MEDICAL_RECORDS',
    'THEATER',
    'BILLING',
    'INVENTORY',
    'CONSENT',
    'RBAC',
    'AUDIT',
  ];

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
        <p className="text-red-800">Failed to load permissions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">Permission Management</h1>
        <p className="mt-2 text-neutral-600">
          View and filter system permissions
        </p>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
            <div className="text-2xl font-bold text-neutral-900">{stats.total}</div>
            <div className="text-sm text-neutral-600">Total Permissions</div>
          </div>
          {Object.entries(stats.byDomain).slice(0, 3).map(([domain, count]) => (
            <div key={domain} className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
              <div className="text-2xl font-bold text-neutral-900">{count}</div>
              <div className="text-sm text-neutral-600">{domain}</div>
            </div>
          ))}
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400">🔍</span>
            <input
              type="text"
              placeholder="Search permissions..."
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={selectedDomain}
            onChange={(e) => {
              setSelectedDomain(e.target.value);
              setFilters({ ...filters, domain: e.target.value || undefined });
            }}
            className="px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Domains</option>
            {domains.map((domain) => (
              <option key={domain} value={domain}>
                {domain}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Permissions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Permission
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Domain
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Resource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Roles
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {data?.permissions.map((permission) => (
                <tr key={permission.id} className="hover:bg-neutral-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-neutral-900">
                        {permission.name}
                      </div>
                      <div className="text-sm text-neutral-500 font-mono">
                        {permission.code}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                      {permission.domain}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                    {permission.resource || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                    {permission.action}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {permission.rolePermissions?.map((rp, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-neutral-100 text-neutral-700"
                        >
                          {rp.role.code}
                        </span>
                      ))}
                      {(!permission.rolePermissions || permission.rolePermissions.length === 0) && (
                        <span className="text-xs text-neutral-400">None</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Info */}
        {data && (
          <div className="px-6 py-4 border-t border-neutral-200 text-sm text-neutral-700">
            Showing {data.permissions.length} of {data.total} permissions
          </div>
        )}
      </div>
    </div>
  );
}

