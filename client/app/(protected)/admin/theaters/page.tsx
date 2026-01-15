'use client';

import { RoleGuard } from '@/components/auth/RoleGuard';
import { useAdminTheaters } from '@/hooks/useAdminQuery';
import Link from 'next/link';

export default function AdminTheatersPage() {
    return (
        <RoleGuard roles={['ADMIN']}>
            <TheatersContent />
        </RoleGuard>
    );
}

function TheatersContent() {
    const { data, isLoading } = useAdminTheaters();

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-xl font-semibold text-gray-900">Operating Theaters</h1>
                    <p className="mt-2 text-sm text-gray-700">Manage surgical suites and room configurations.</p>
                </div>
                <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
                    <Link
                        href="/admin/theaters/new" // Simple page flow preferred for type safety over complex modals
                        className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                    >
                        Add Theater
                    </Link>
                </div>
            </div>

            <div className="mt-8 flow-root">
                <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Name</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Code</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Department</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                                        <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                            <span className="sr-only">Edit</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {isLoading ? (
                                        <tr><td colSpan={5} className="p-4 text-center">Loading...</td></tr>
                                    ) : data?.data.map((theater: any) => (
                                        <tr key={theater.id}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                                {theater.name}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{theater.code}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                {theater.department?.name || '-'}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${theater.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {theater.active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                <button className="text-indigo-600 hover:text-indigo-900">
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {!isLoading && (!data?.data || data.data.length === 0) && (
                                        <tr><td colSpan={5} className="p-4 text-center text-gray-500 italic">No theaters found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
