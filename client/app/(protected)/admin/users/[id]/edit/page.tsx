'use client';

import { RoleGuard } from '@/components/auth/RoleGuard';
import { UserForm } from '@/components/admin/UserForm';
import { useAdminUser, useAdminUserMutations } from '@/hooks/useAdminQuery';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import type { UpdateUserRequest } from '@/types/admin';

export default function EditUserPage({ params }: { params: { id: string } }) {
    return (
        <RoleGuard roles={['ADMIN']}>
            <EditUserContent id={params.id} />
        </RoleGuard>
    );
}

function EditUserContent({ id }: { id: string }) {
    const router = useRouter();
    const { data: user, isLoading: isUserLoading, error } = useAdminUser(id);
    const { updateUser } = useAdminUserMutations();

    const handleSubmit = async (data: UpdateUserRequest) => {
        try {
            await updateUser.mutateAsync({ id, data });
            router.push('/admin/users');
        } catch (error: any) {
            console.error('Failed to update user:', error);
            alert(error?.response?.data?.message || 'Failed to update user');
        }
    };

    if (isUserLoading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex items-center justify-center min-h-[400px]">
                    <LoadingSpinner />
                </div>
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <h3 className="text-lg font-medium text-red-900">User not found</h3>
                    <p className="mt-2 text-red-600">
                        {(error as any)?.message || 'The user you are looking for does not exist.'}
                    </p>
                    <div className="mt-6">
                        <Link
                            href="/admin/users"
                            className="text-base font-medium text-indigo-600 hover:text-indigo-500"
                        >
                            Go back to users
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Extract departmentId from nested department object or direct field
    // Backend returns user with department relation included (Prisma includes department relation)
    const departmentId = user.department?.id || user.departmentId || undefined;

    // Extract roleId from active roleAssignments
    // Users can have multiple role assignments, but we use the first active one
    // Backend filters roleAssignments to only include active ones (isActive: true)
    const activeRoleAssignment = user.roleAssignments?.find(
        ra => (ra.active !== false && ra.isActive !== false)
    );
    const roleId = activeRoleAssignment?.roleId || activeRoleAssignment?.role?.id || undefined;

    // Handle active status - backend may return isActive (Prisma field) or active (transformed)
    // Check both to ensure compatibility
    const isActive = user.active !== undefined ? user.active : (user.isActive ?? true);

    // Map backend user response to form data structure
    // Ensure all fields match UpdateUserRequest type
    const initialData: UpdateUserRequest & { id?: string } = {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone || undefined,
        title: user.title || undefined,
        employeeId: user.employeeId || undefined,
        departmentId,
        roleId,
        active: isActive,
        isTheaterEligible: user.isTheaterEligible ?? false,
        id: user.id, // Include id for reference
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="md:flex md:items-center md:justify-between mb-8">
                <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                        Edit User: {user.firstName} {user.lastName}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        {user.email}
                    </p>
                </div>
                <div className="mt-4 flex md:ml-4 md:mt-0">
                    <Link
                        href="/admin/users"
                        className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                    >
                        Back to Users
                    </Link>
                </div>
            </div>

            <div className="max-w-2xl">
                <UserForm
                    initialData={initialData}
                    onSubmit={handleSubmit}
                    isLoading={updateUser.isPending}
                    isEditMode={true}
                />
            </div>
        </div>
    );
}
