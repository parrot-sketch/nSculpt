'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/services/admin.service';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { Shield } from 'lucide-react';
import type { AdminRole } from '@/types/admin';
// Simple icons

/**
 * Roles Management Page
 * 
 * List, create, update, and manage system roles.
 */
export default function AdminRolesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  const { data: roles, isLoading, error } = useQuery<AdminRole[]>({
    queryKey: ['admin', 'roles', includeInactive],
    queryFn: () => adminService.listRoles(includeInactive),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => adminService.deactivateRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
    },
  });

  const filteredRoles = roles?.filter((role) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      role.code.toLowerCase().includes(searchLower) ||
      role.name.toLowerCase().includes(searchLower) ||
      role.description?.toLowerCase().includes(searchLower)
    );
  });

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
        <p className="text-red-800">Failed to load roles.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Role Management</h1>
          <p className="mt-2 text-neutral-600">
            Manage roles and their permissions
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
          <span>+</span>
          <span>Create Role</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400">🔍</span>
            <input
              type="text"
              placeholder="Search roles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <label className="flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg cursor-pointer hover:bg-neutral-50">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Include inactive</span>
          </label>
        </div>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRoles?.map((role) => (
          <div
            key={role.id}
            className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900">{role.name}</h3>
                  <p className="text-sm text-neutral-500 font-mono">{role.code}</p>
                </div>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  role.active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {role.active ? 'Active' : 'Inactive'}
              </span>
            </div>

            {role.description && (
              <p className="text-sm text-neutral-600 mb-4">{role.description}</p>
            )}

            <div className="flex items-center justify-between text-sm text-neutral-500 mb-4">
              <span>
                {role._count?.userAssignments ?? 0} user{role._count?.userAssignments !== 1 ? 's' : ''}
              </span>
              <span>
                {role.permissions?.length ?? 0} permission{role.permissions?.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 px-4 py-2 text-sm border border-neutral-300 rounded-lg hover:bg-neutral-50">
                Edit
              </button>
              {role.active && (
                <button
                  onClick={() => deactivateMutation.mutate(role.id)}
                  className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                >
                  Deactivate
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredRoles?.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-12 text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-neutral-400" />
          </div>
          <p className="text-neutral-600">No roles found</p>
        </div>
      )}
    </div>
  );
}

