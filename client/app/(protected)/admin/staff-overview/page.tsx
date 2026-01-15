'use client';

import { RoleGuard } from '@/components/auth/RoleGuard';
import { useAdminUsers, useAdminTheaters } from '@/hooks/useAdminQuery';

export default function StaffOverviewPage() {
    return (
        <RoleGuard roles={['ADMIN']}>
            <StaffOverviewContent />
        </RoleGuard>
    );
}

// Visual Matrix of Staff vs Locatons
// In a real app this would allow drag-and-drop or select assignment
function StaffOverviewContent() {
    const { data: usersData, isLoading: usersLoading } = useAdminUsers();
    const { data: theatersData, isLoading: theatersLoading } = useAdminTheaters();

    if (usersLoading || theatersLoading) return <div className="p-8">Loading Overview...</div>;

    const theaters = theatersData?.data || [];
    const staff = usersData?.users || [];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-xl font-semibold text-gray-900 mb-6">Staff & Theater Assignment Overview</h1>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
                <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Current Assignments</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">Visual mapping of staff to operating theaters.</p>
                </div>
                <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                    <dl className="sm:divide-y sm:divide-gray-200">
                        {theaters.map((theater: any) => (
                            <div key={theater.id} className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                <dt className="text-sm font-medium text-gray-500 flex items-center">
                                    <span className="w-2 h-2 rounded-full bg-green-400 mr-2"></span>
                                    {theater.name} ({theater.code})
                                </dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                    <ul className="border border-gray-200 rounded-md divide-y divide-gray-200">
                                        {/* Mocking Assigned Staff - In real app, we filter assignments */}
                                        <li className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                                            <div className="w-0 flex-1 flex items-center">
                                                <span className="ml-2 flex-1 w-0 truncate">Assigned Staff Placeholder (Pending Backend Relation)</span>
                                            </div>
                                            <div className="ml-4 flex-shrink-0">
                                                <button className="font-medium text-indigo-600 hover:text-indigo-500">Edit</button>
                                            </div>
                                        </li>
                                    </ul>
                                </dd>
                            </div>
                        ))}
                        {theaters.length === 0 && <div className="p-4 text-center text-gray-500">No theaters configured.</div>}
                    </dl>
                </div>
            </div>
        </div>
    );
}
