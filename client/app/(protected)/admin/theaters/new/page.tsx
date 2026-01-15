'use client';

import { RoleGuard } from '@/components/auth/RoleGuard';
import { useAdminTheaterMutations } from '@/hooks/useAdminQuery';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function NewTheaterPage() {
    return (
        <RoleGuard roles={['ADMIN']}>
            <NewTheaterContent />
        </RoleGuard>
    );
}

function NewTheaterContent() {
    const router = useRouter();
    const { createTheater } = useAdminTheaterMutations();
    // In a real app, strict Type from prisma would be used here
    const [formData, setFormData] = useState({ name: '', code: '', departmentId: '' });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createTheater.mutateAsync({
                ...formData,
                active: true,
                // Hardcoding Dept ID for MVP as user asked for robust 2-room proof first
                // In production this would come from a dropdown of departments
                departmentId: formData.departmentId || '00000000-0000-0000-0000-000000000000'
            });
            router.push('/admin/theaters');
        } catch (error) {
            alert('Failed to create theater: ' + (error as any).message);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
            <h1 className="text-2xl font-bold mb-6">Add Operating Theater</h1>
            <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow sm:rounded-lg p-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Code</label>
                    <input
                        type="text"
                        required
                        value={formData.code}
                        onChange={e => setFormData({ ...formData, code: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="OR-01"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="Main Theater 1"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Department ID (UUID)</label>
                    <input
                        type="text"
                        required
                        value={formData.departmentId}
                        onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="UUID"
                    />
                    <p className="mt-1 text-xs text-gray-500">For MVP, paste existing Surgical Dept UUID.</p>
                </div>

                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
                    >
                        Create Theater
                    </button>
                </div>
            </form>
        </div>
    );
}
