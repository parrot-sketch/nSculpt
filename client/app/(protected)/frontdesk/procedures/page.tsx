'use client';

import { useState } from 'react';
import { Search, Filter, Calendar, User } from 'lucide-react';

export default function ProceduresPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');

    // Placeholder data - will be replaced with actual API call
    const procedures: any[] = [];

    return (
        <div className="min-h-screen bg-brand-beige p-6 md:p-10">
            {/* Header */}
            <header className="mb-8">
                <h1 className="text-4xl font-bold tracking-tight text-brand-teal font-serif">Procedure Plans</h1>
                <p className="text-brand-teal/60 mt-1.5 font-medium">View and manage patient procedure plans</p>
            </header>

            {/* Filters */}
            <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-white/50 p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-teal/40" />
                        <input
                            type="text"
                            placeholder="Search by patient or procedure name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-brand-teal/20 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none transition-all"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-teal/40" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-brand-teal/20 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none transition-all appearance-none bg-white"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="DRAFT">Draft</option>
                            <option value="PENDING_APPROVAL">Pending Approval</option>
                            <option value="APPROVED">Approved</option>
                            <option value="SCHEDULED">Scheduled</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Procedures Table */}
            <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-white/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-brand-teal/5 border-b border-brand-teal/5">
                                <th className="px-6 py-4 text-[10px] font-bold text-brand-teal/40 uppercase tracking-[0.2em]">Patient</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-brand-teal/40 uppercase tracking-[0.2em]">Procedure</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-brand-teal/40 uppercase tracking-[0.2em]">Doctor</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-brand-teal/40 uppercase tracking-[0.2em]">Scheduled Date</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-brand-teal/40 uppercase tracking-[0.2em]">Status</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-brand-teal/40 uppercase tracking-[0.2em] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-teal/5">
                            {procedures.length > 0 ? (
                                procedures.map((proc) => (
                                    <tr key={proc.id} className="hover:bg-brand-teal/[0.02] transition-colors group">
                                        <td className="px-6 py-4 text-sm">
                                            <div className="font-bold text-brand-teal">{proc.patientName}</div>
                                            <div className="text-brand-teal/40 text-xs font-medium">{proc.patientNumber}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-brand-teal">
                                            {proc.procedureName}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-brand-teal/70 font-medium">
                                            Dr. {proc.doctorName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-teal/70 font-medium">
                                            {proc.scheduledDate || 'Not scheduled'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                {proc.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                            <button className="text-brand-teal hover:text-brand-gold font-bold text-xs transition-colors">
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="w-16 h-16 rounded-full bg-brand-teal/5 flex items-center justify-center">
                                                <Calendar className="w-8 h-8 text-brand-teal/20" />
                                            </div>
                                            <div className="text-brand-teal/30 text-sm font-medium italic">
                                                No procedure plans found.
                                            </div>
                                            <p className="text-brand-teal/20 text-xs max-w-md">
                                                Procedure plans will appear here once they are created by doctors during consultations.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Info Card */}
            <div className="mt-6 bg-blue-50/50 backdrop-blur-md rounded-2xl shadow-sm border border-blue-100/50 p-6">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-blue-900 mb-1">About Procedure Plans</h3>
                        <p className="text-xs text-blue-700/70 leading-relaxed">
                            Procedure plans are created by doctors during consultations when a patient requires a surgical or medical procedure.
                            Once created, they can be scheduled, and patients will need to provide consent before the procedure can be performed.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
