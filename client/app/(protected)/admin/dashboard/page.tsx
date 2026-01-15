'use client';

import { RoleGuard } from '@/components/auth/RoleGuard';
import { useAdminDashboardStats, useAdminAuditLogs } from '@/hooks/useAdminQuery';
import { Users, FileText, AlertTriangle, Activity } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
    return (
        <RoleGuard roles={['ADMIN']} fallback={<div className="p-8 text-red-600">Unauthorized Access</div>}>
            <AdminDashboardContent />
        </RoleGuard>
    );
}

function AdminDashboardContent() {
    const { data: stats, isLoading: statsLoading } = useAdminDashboardStats();
    const { data: auditLogs, isLoading: auditLoading } = useAdminAuditLogs();

    if (statsLoading) return <div className="p-8">Loading dashboard...</div>;

    const cards = [
        {
            name: 'Total Users',
            value: stats?.activeUsers || 0,
            icon: Users,
            color: 'bg-blue-500',
            href: '/admin/users'
        },
        {
            name: 'Active Encounters',
            value: 0, // Placeholder if stats missing
            icon: FileText,
            color: 'bg-green-500',
            href: '/admin/encounters'
        },
        {
            name: 'Locked Encounters',
            value: 0, // Placeholder
            icon: Activity,
            color: 'bg-purple-500',
            href: '/admin/encounters?status=LOCKED'
        },
        {
            name: 'Security Alerts',
            value: 0, // Placeholder
            icon: AlertTriangle,
            color: 'bg-red-500',
            href: '/admin/audit'
        },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

            {/* 1. Summary Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                {cards.map((card) => (
                    <Link key={card.name} href={card.href} className="block group">
                        <div className="overflow-hidden rounded-lg bg-white shadow transition hover:shadow-md">
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className={`rounded-md p-3 ${card.color} text-white`}>
                                            <card.icon className="h-6 w-6" aria-hidden="true" />
                                        </div>
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="truncate text-sm font-medium text-gray-500">{card.name}</dt>
                                            <dd>
                                                <div className="text-lg font-medium text-gray-900">{card.value}</div>
                                            </dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* 2. Recent Audit Activity */}
            <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                    <h3 className="text-base font-semibold leading-6 text-gray-900">Recent Security Events</h3>
                </div>
                <ul role="list" className="divide-y divide-gray-200">
                    {auditLoading ? (
                        <li className="px-4 py-4 text-gray-500">Loading events...</li>
                    ) : auditLogs?.data?.map((event: any) => (
                        <li key={event.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                                <p className="truncate text-sm font-medium text-indigo-600">{event.action}</p>
                                <div className="ml-2 flex flex-shrink-0">
                                    <p className="inline-flex rounded-full bg-gray-100 px-2 text-xs font-semibold leading-5 text-gray-800">
                                        {event.status}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-2 sm:flex sm:justify-between">
                                <div className="sm:flex">
                                    <p className="flex items-center text-sm text-gray-500">
                                        {event.actorName} ({event.clientIp})
                                    </p>
                                </div>
                                <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                    <p>{new Date(event.timestamp).toLocaleString()}</p>
                                </div>
                            </div>
                        </li>
                    ))}
                    {!auditLoading && (!auditLogs?.data || auditLogs.data.length === 0) && (
                        <li className="px-4 py-4 text-gray-500">No recent events found.</li>
                    )}
                </ul>
            </div>
        </div>
    );
}
