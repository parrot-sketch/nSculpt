'use client';

import { RoleGuard } from '@/components/auth/RoleGuard';
import { UserForm } from '@/components/admin/UserForm';
import { useAdminUserMutations } from '@/hooks/useAdminQuery';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { useState } from 'react';
import { CredentialSuccessModal } from '@/components/admin/CredentialSuccessModal';

export default function CreateUserPage() {
    return (
        <RoleGuard roles={['ADMIN']}>
            <CreateUserContent />
        </RoleGuard>
    );
}

function CreateUserContent() {
    const router = useRouter();
    const { createUser } = useAdminUserMutations();
    const [successData, setSuccessData] = useState<{ email: string; temporaryPassword?: string } | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleSubmit = async (data: any) => {
        try {
            const result = await createUser.mutateAsync(data);
            setSuccessData({
                email: result.email,
                temporaryPassword: result.temporaryPassword,
            });
            setIsModalOpen(true);
        } catch (error: any) {
            console.error('Failed to create user:', error);
            alert(error?.response?.data?.message || 'Failed to create user');
        }
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        router.push('/admin/users');
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="md:flex md:items-center md:justify-between mb-8">
                <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                        Create New User
                    </h2>
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
                    onSubmit={handleSubmit}
                    isLoading={createUser.isPending}
                />
            </div>

            <CredentialSuccessModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                email={successData?.email || ''}
                temporaryPassword={successData?.temporaryPassword}
            />
        </div>
    );
}
