'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { consultationRequestService, ConsultationRequestStatus } from '@/services/consultation-request.service';
import { getFullName } from '@/lib/utils';
import { format } from 'date-fns';
import { Search, Filter, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function ConsultationsPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<ConsultationRequestStatus | 'ALL'>('ALL');
    const queryClient = useQueryClient();

    const { data: requestsData, isLoading } = useQuery({
        queryKey: ['consultation-requests', statusFilter],
        queryFn: () => consultationRequestService.getConsultationRequests(0, 100, {
            status: statusFilter !== 'ALL' ? statusFilter : undefined,
        }),
    });

    const approveMutation = useMutation({
        mutationFn: (id: string) => consultationRequestService.approveConsultationRequest(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['consultation-requests'] });
            toast.success('Consultation request approved');
        },
        onError: () => {
            toast.error('Failed to approve consultation request');
        },
    });

    const rejectMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) =>
            consultationRequestService.rejectConsultationRequest(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['consultation-requests'] });
            toast.success('Consultation request rejected');
        },
        onError: () => {
            toast.error('Failed to reject consultation request');
        },
    });

    const requests = requestsData?.data || [];

    const filteredRequests = requests.filter(req => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        const patientName = getFullName(req.patient?.firstName || '', req.patient?.lastName || '').toLowerCase();
        return patientName.includes(search);
    });

    const handleReject = (id: string) => {
        const reason = prompt('Please provide a reason for rejection:');
        if (reason) {
            rejectMutation.mutate({ id, reason });
        }
    };

    const getStatusBadge = (status: ConsultationRequestStatus) => {
        switch (status) {
            case ConsultationRequestStatus.PENDING:
                return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <Clock className="w-3.5 h-3.5" />
                    Pending
                </span>;
            case ConsultationRequestStatus.APPROVED:
                return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Approved
                </span>;
            case ConsultationRequestStatus.REJECTED:
                return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                    <XCircle className="w-3.5 h-3.5" />
                    Rejected
                </span>;
        }
    };

    return (
        <div className="min-h-screen bg-brand-beige p-6 md:p-10">
            {/* Header */}
            <header className="mb-8">
                <h1 className="text-4xl font-bold tracking-tight text-brand-teal font-serif">Consultation Requests</h1>
                <p className="text-brand-teal/60 mt-1.5 font-medium">Review and manage consultation requests</p>
            </header>

            {/* Filters */}
            <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-white/50 p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-teal/40" />
                        <input
                            type="text"
                            placeholder="Search by patient name..."
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
                            onChange={(e) => setStatusFilter(e.target.value as ConsultationRequestStatus | 'ALL')}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-brand-teal/20 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none transition-all appearance-none bg-white"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value={ConsultationRequestStatus.PENDING}>Pending</option>
                            <option value={ConsultationRequestStatus.APPROVED}>Approved</option>
                            <option value={ConsultationRequestStatus.REJECTED}>Rejected</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Requests Table */}
            <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-white/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-brand-teal/5 border-b border-brand-teal/5">
                                <th className="px-6 py-4 text-[10px] font-bold text-brand-teal/40 uppercase tracking-[0.2em]">Patient</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-brand-teal/40 uppercase tracking-[0.2em]">Requested</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-brand-teal/40 uppercase tracking-[0.2em]">Preferred Date</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-brand-teal/40 uppercase tracking-[0.2em]">Reason</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-brand-teal/40 uppercase tracking-[0.2em]">Status</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-brand-teal/40 uppercase tracking-[0.2em] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-teal/5">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center text-brand-teal/30 text-sm font-medium">
                                        Loading consultation requests...
                                    </td>
                                </tr>
                            ) : filteredRequests.length > 0 ? (
                                filteredRequests.map((req) => (
                                    <tr key={req.id} className="hover:bg-brand-teal/[0.02] transition-colors group">
                                        <td className="px-6 py-4 text-sm">
                                            <div className="font-bold text-brand-teal">{getFullName(req.patient?.firstName || '', req.patient?.lastName || '')}</div>
                                            <div className="text-brand-teal/40 text-xs font-medium">{req.patient?.patientNumber}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-teal/70 font-medium">
                                            {format(new Date(req.requestedAt), 'MMM dd, yyyy HH:mm')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-teal/70 font-medium">
                                            {req.preferredDate ? format(new Date(req.preferredDate), 'MMM dd, yyyy') : 'Not specified'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-brand-teal/70 max-w-xs truncate">
                                            {req.reason || 'No reason provided'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(req.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                            {req.status === ConsultationRequestStatus.PENDING && (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => approveMutation.mutate(req.id)}
                                                        disabled={approveMutation.isPending}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold transition-colors disabled:opacity-50"
                                                    >
                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(req.id)}
                                                        disabled={rejectMutation.isPending}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-colors disabled:opacity-50"
                                                    >
                                                        <XCircle className="w-3.5 h-3.5" />
                                                        Reject
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center text-brand-teal/30 text-sm font-medium italic">
                                        No consultation requests found matching your filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
