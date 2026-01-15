'use client';

import { RoleGuard } from '@/components/auth/RoleGuard';
import { useAdminUser } from '@/hooks/useAdminQuery';
import Link from 'next/link';
import { ArrowLeft, Edit, Mail, Shield, User as UserIcon, Calendar, Activity } from 'lucide-react';
import { UserAuditTimeline } from '@/components/admin/users/UserAuditTimeline';
import { format } from 'date-fns';

export default function UserDetailPage({ params }: { params: { id: string } }) {
    return (
        <RoleGuard roles={['ADMIN']}>
            <UserDetailContent id={params.id} />
        </RoleGuard>
    );
}

function UserDetailContent({ id }: { id: string }) {
    const { data: user, isLoading, error } = useAdminUser(id);

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="rounded-lg bg-rose-50 p-6 text-center">
                    <Shield className="mx-auto h-12 w-12 text-rose-600 mb-4" />
                    <h3 className="text-lg font-medium text-rose-900">User not found</h3>
                    <p className="mt-2 text-rose-600">
                        {(error as any)?.message || "The user you are looking for does not exist or you don't have permission to view them."}
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

    // Determine status (robust check matching list page)
    const isActive = user.active || user.isActive || false;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Navigation */}
            <nav className="mb-8">
                <Link
                    href="/admin/users"
                    className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Users
                </Link>
            </nav>

            {/* Header Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                <div className="px-6 py-6 sm:px-8 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-2xl ring-4 ring-white shadow-sm">
                            {user.firstName?.[0]}{user.lastName?.[0]}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                                {user.firstName} {user.lastName}
                            </h1>
                            <div className="flex items-center gap-2 mt-1 text-slate-500">
                                <span className="inline-flex items-center gap-1 text-sm">
                                    <UserIcon className="h-3.5 w-3.5" />
                                    {user.title || 'No Title'}
                                </span>
                                <span className="text-slate-300">•</span>
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium border ${isActive
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                    }`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                    {isActive ? 'Active' : 'Suspended'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href={`/admin/users/${id}/edit`}
                            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 transition-all"
                        >
                            <Edit className="h-4 w-4 text-slate-500" />
                            Edit Profile
                        </Link>
                    </div>
                </div>

                <div className="px-6 py-6 sm:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Detail Items */}
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Contact Email</span>
                        <div className="flex items-center gap-2 text-slate-700 font-medium">
                            <Mail className="h-4 w-4 text-slate-400" />
                            {user.email}
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">System Role</span>
                        <div className="flex items-center gap-2 text-slate-700 font-medium">
                            <Shield className="h-4 w-4 text-slate-400" />
                            {user.roleAssignments?.[0]?.role?.name || 'No Role Assigned'}
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Joined Date</span>
                        <div className="flex items-center gap-2 text-slate-700 font-medium">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            {user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : 'Unknown'}
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Last Active</span>
                        <div className="flex items-center gap-2 text-slate-700 font-medium">
                            <Activity className="h-4 w-4 text-slate-400" />
                            {user.lastLogin ? format(new Date(user.lastLogin), 'MMM d, HH:mm') : 'Never'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Audit Trail Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                                <Shield className="h-4 w-4 text-indigo-600" />
                                Governance & Audit Trail
                            </h2>
                            <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                                Read-only
                            </span>
                        </div>
                        <div className="p-6">
                            <UserAuditTimeline userId={id} />
                        </div>
                    </div>
                </div>

                {/* Side Panel (Future expansion or instructions) */}
                <div className="space-y-6">
                    <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100">
                        <h3 className="text-sm font-semibold text-indigo-900 mb-2">Governance Note</h3>
                        <p className="text-xs text-indigo-700 leading-relaxed">
                            This audit trail records all security and administrative events related to this user account.
                            It is immutable and maintained for compliance purposes.
                        </p>
                    </div>
                </div>
            </div>

        </div>
    );
}
