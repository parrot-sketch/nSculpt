'use client';

import { RoleGuard } from '@/components/auth/RoleGuard';
import { useAdminUsers, useAdminUserMutations, useAdminRoles } from '@/hooks/useAdminQuery';
import Link from 'next/link';
import { useState } from 'react';
import { Plus, Search, User, Shield, Mail, Eye, Edit2, UserX, UserCheck, Trash2 } from 'lucide-react';
import { ActionsDropdown } from '@/components/ui/ActionsDropdown';



export default function AdminUsersPage() {
  return (
    <RoleGuard roles={['ADMIN']}>
      <UsersContent />
    </RoleGuard>
  );
}

function UsersContent() {
  const [search, setSearch] = useState('');
  const { data, isLoading, error } = useAdminUsers({ search });
  const { updateUserStatus, updateUserRole, deactivateUser, activateUser, deleteUser } = useAdminUserMutations();
  const { data: roles } = useAdminRoles(); // Fetch roles for the dropdown

  // State for confirmation modals
  const [confirmStatus, setConfirmStatus] = useState<{ userId: string; active: boolean; name: string } | null>(null);
  const [confirmRole, setConfirmRole] = useState<{ userId: string; roleCode: string; name: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ userId: string; name: string } | null>(null);

  // Safe access to users array
  const users = data?.users || [];

  const handleStatusToggle = (user: any) => {
    // If user is active, we are suspending (active=false), and vice versa
    // Backend might return active OR isActive depending on transformation
    const currentStatus = user.active !== undefined ? user.active : user.isActive;
    const newStatus = !currentStatus;

    setConfirmStatus({
      userId: user.id,
      active: newStatus,
      name: `${user.firstName} ${user.lastName}`
    });
  };

  const executeStatusChange = async () => {
    if (!confirmStatus) return;
    try {
      if (confirmStatus.active) {
        // Activate user
        await activateUser.mutateAsync(confirmStatus.userId);
      } else {
        // Deactivate user
        await deactivateUser.mutateAsync(confirmStatus.userId);
      }
      setConfirmStatus(null);
    } catch (e) {
      console.error('Failed to update status', e);
      // Error will be shown by React Query
    }
  };

  const handleRoleChange = (userId: string, currentRoleCode: string, newRoleCode: string, name: string) => {
    if (currentRoleCode === newRoleCode) return;
    setConfirmRole({
      userId,
      roleCode: newRoleCode,
      name
    });
  };

  const executeRoleChange = async () => {
    if (!confirmRole) return;
    try {
      await updateUserRole.mutateAsync({
        userId: confirmRole.userId,
        roleCode: confirmRole.roleCode
      });
      setConfirmRole(null);
    } catch (e) {
      console.error('Failed to update role', e);
    }
  };


  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center min-h-[400px]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        <p className="mt-4 text-slate-500 font-medium">Loading users...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 mb-4">
            <Shield className="h-6 w-6 text-rose-600" />
          </div>
          <h3 className="text-rose-800 font-semibold text-lg">Unable to load users</h3>
          <p className="text-rose-600 mt-2">{(error as any)?.message || 'There was a problem connecting to the server.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Users</h1>
          <p className="mt-2 text-sm text-slate-500 max-w-2xl">
            Manage access control, assign roles, and update staff information across the organization.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            href="/admin/users/new"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all duration-200"
          >
            <Plus className="h-4 w-4" />
            Add New User
          </Link>
        </div>
      </div>

      {/* Filters (Placeholder for future implementation) */}
      <div className="mb-6">
        <div className="relative max-w-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            className="block w-full rounded-lg border-0 py-2.5 pl-10 pr-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 shadow-sm"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:pl-6">
                  User Identity
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Contact
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Role & Access
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="bg-slate-50 rounded-full p-4 mb-3">
                        <User className="h-8 w-8 text-slate-300" />
                      </div>
                      <p className="text-base font-semibold text-slate-900">No users found</p>
                      <p className="mt-1 text-sm">Try adjusting your search terms or add a new user.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user: any) => {
                  // Determine primary role code (simplified for this view)
                  const primaryRole = user.roleAssignments?.[0]?.role || { code: 'NONE', name: 'No Role' };

                  return (
                    <tr key={user.id} className="hover:bg-neutral-50/80 transition-colors duration-150 group">
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                        <Link href={`/admin/users/${user.id}`} className="group/link flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-neutral-100 flex items-center justify-center text-spaceCadet font-bold text-sm group-hover/link:ring-2 group-hover/link:ring-lion group-hover/link:ring-offset-2 transition-all">
                            {user.firstName[0]}{user.lastName[0]}
                          </div>
                          <div className="ml-4">
                            <div className="font-medium text-spaceCadet group-hover/link:text-lion transition-colors">{user.firstName} {user.lastName}</div>
                            <div className="text-sm text-slate-500">{user.title || 'No Title'}</div>
                          </div>
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          {user.email}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                        <select
                          value={primaryRole.code}
                          onChange={(e) => handleRoleChange(user.id, primaryRole.code, e.target.value, `${user.firstName} ${user.lastName}`)}
                          className="block w-full max-w-[140px] rounded-md border-0 py-1.5 pl-3 pr-8 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-indigo-600 sm:text-xs sm:leading-6 cursor-pointer hover:bg-slate-50"
                          disabled={updateUserRole.isPending}
                        >
                          {roles?.map((role) => (
                            <option key={role.id} value={role.code}>{role.name}</option>
                          ))}
                          {!roles?.find(r => r.code === primaryRole.code) && primaryRole.code !== 'NONE' && (
                            <option value={primaryRole.code}>{primaryRole.name}</option>
                          )}
                        </select>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <button
                          onClick={() => handleStatusToggle(user)}
                          disabled={updateUserStatus.isPending}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors ${(user.active || user.isActive)
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20 hover:bg-rose-100'
                            }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${(user.active || user.isActive) ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {(user.active || user.isActive) ? 'Active' : 'Suspended'}
                        </button>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <ActionsDropdown
                          actions={[
                            {
                              label: 'View Details & Audit',
                              href: `/admin/users/${user.id}`,
                              icon: <Eye className="h-4 w-4" />
                            },
                            {
                              label: 'Edit User Profile',
                              href: `/admin/users/${user.id}/edit`,
                              icon: <Edit2 className="h-4 w-4" />
                            },
                            // Conditional actions based on user status
                            ...(user.active !== false && user.isActive !== false ? [
                              {
                                label: 'Deactivate User',
                                onClick: () => {
                                  setConfirmStatus({
                                    userId: user.id,
                                    active: false,
                                    name: `${user.firstName} ${user.lastName}`
                                  });
                                },
                                icon: <UserX className="h-4 w-4" />,
                                danger: true
                              }
                            ] : [
                              {
                                label: 'Activate User',
                                onClick: () => {
                                  setConfirmStatus({
                                    userId: user.id,
                                    active: true,
                                    name: `${user.firstName} ${user.lastName}`
                                  });
                                },
                                icon: <UserCheck className="h-4 w-4" />
                              }
                            ]),
                            {
                              label: 'Delete User Account',
                              onClick: () => {
                                setConfirmDelete({
                                  userId: user.id,
                                  name: `${user.firstName} ${user.lastName}`
                                });
                              },
                              icon: <Trash2 className="h-4 w-4" />,
                              danger: true
                            }
                          ]}
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Status Change Modal */}
      {confirmStatus && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setConfirmStatus(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${confirmStatus.active ? 'bg-emerald-100' : 'bg-rose-100'} sm:mx-0 sm:h-10 sm:w-10`}>
                  {confirmStatus.active ? (
                    <Shield className="h-6 w-6 text-emerald-600" />
                  ) : (
                    <Shield className="h-6 w-6 text-rose-600" />
                  )}
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-slate-900" id="modal-title">
                    {confirmStatus.active ? 'Activate User' : 'Suspend User'}
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-slate-500">
                      Are you sure you want to <strong>{confirmStatus.active ? 'activate' : 'suspend'}</strong> {confirmStatus.name}?
                      {!confirmStatus.active && " This user will immediately lose access to the system."}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  disabled={(confirmStatus.active ? activateUser.isPending : deactivateUser.isPending)}
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${confirmStatus.active
                    ? 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500'
                    }`}
                  onClick={executeStatusChange}
                >
                  {(confirmStatus.active ? activateUser.isPending : deactivateUser.isPending) ? 'Updating...' : (confirmStatus.active ? 'Activate' : 'Suspend')}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                  onClick={() => setConfirmStatus(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Role Change Modal */}
      {confirmRole && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setConfirmRole(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
                  <Shield className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-slate-900" id="modal-title">
                    Change User Role
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-slate-500">
                      Are you sure you want to change the role for <strong>{confirmRole.name}</strong> to <strong>{confirmRole.roleCode}</strong>?
                      This will change their permissions and access level.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  disabled={updateUserRole.isPending}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={executeRoleChange}
                >
                  {updateUserRole.isPending ? 'Updating...' : 'Change Role'}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                  onClick={() => setConfirmRole(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setConfirmDelete(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-rose-100 sm:mx-0 sm:h-10 sm:w-10">
                  <Trash2 className="h-6 w-6 text-rose-600" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-slate-900" id="modal-title">
                    Permanently Delete User Account
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-slate-500">
                      Are you absolutely sure you want to <strong className="text-rose-600">permanently delete</strong> the account for <strong>{confirmDelete.name}</strong>?
                    </p>
                    <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-md">
                      <p className="text-xs text-rose-800 font-semibold mb-1">⚠️ This action cannot be undone</p>
                      <ul className="text-xs text-rose-700 list-disc list-inside space-y-1">
                        <li>All user data will be permanently removed</li>
                        <li>All active sessions will be revoked</li>
                        <li>Role assignments will be deleted</li>
                        <li>This action is logged for audit purposes</li>
                      </ul>
                    </div>
                    <p className="mt-3 text-xs text-slate-600">
                      <strong>Note:</strong> If the user has created patient records or other critical data, deletion will be blocked. Consider deactivating instead.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  disabled={deleteUser.isPending}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-rose-600 text-base font-medium text-white hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={async () => {
                    try {
                      await deleteUser.mutateAsync(confirmDelete.userId);
                      setConfirmDelete(null);
                    } catch (e) {
                      console.error('Failed to delete user', e);
                      // Error will be shown by React Query
                    }
                  }}
                >
                  {deleteUser.isPending ? 'Deleting...' : 'Yes, Delete Permanently'}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                  onClick={() => setConfirmDelete(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
