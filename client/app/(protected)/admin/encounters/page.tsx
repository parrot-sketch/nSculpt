'use client';

import { RoleGuard } from '@/components/auth/RoleGuard';
import { EncounterStatusBadge } from '@/components/clinical/EncounterStatusBadge';
import Link from 'next/link';
import { useEncounters } from '@/hooks/useClinicalQuery';
import { format } from 'date-fns';

export default function AdminEncountersPage() {
    return (
        <RoleGuard roles={['ADMIN']}>
            <EncountersContent />
        </RoleGuard>
    );
}

function EncountersContent() {
    const { data: encounters, isLoading } = useEncounters();

    if (isLoading) return <div className="p-8">Loading encounters...</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="sm:flex sm:items-center sm:justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 font-roboto-serif">Encounters Management</h1>
                    <p className="mt-2 text-sm text-gray-700">
                        A centralized view of all clinical encounters across the clinic.
                    </p>
                </div>
            </div>

            <div className="mt-8 flex flex-col">
                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg bg-white">
                            <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                                            Date
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Patient
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Type
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Status
                                        </th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                            <span className="sr-only">View</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {encounters && encounters.length > 0 ? (
                                        encounters.map((encounter) => (
                                            <tr key={encounter.id}>
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-6">
                                                    {format(new Date(encounter.periodStart), 'MMM d, yyyy HH:mm')}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    {(encounter as any).patient?.firstName} {(encounter as any).patient?.lastName}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 capitalize">
                                                    {encounter.class.toLowerCase()} - {encounter.type}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    <EncounterStatusBadge status={encounter.status} locked={encounter.locked} />
                                                </td>
                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                    <Link
                                                        href={`/encounters/${encounter.id}`}
                                                        className="text-indigo-600 hover:text-indigo-900"
                                                    >
                                                        Review<span className="sr-only">, {encounter.id}</span>
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="py-12 text-center text-sm text-gray-500 italic">
                                                No encounters found.
                                            </td>
                                        </tr>
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
