'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { appointmentService, AppointmentStatus } from '@/services/appointment.service';
import { AppointmentStatusBadge } from '@/components/appointments/AppointmentStatusBadge';
import { AppointmentActions } from '@/components/appointments/AppointmentActions';
import { getFullName } from '@/lib/utils';
import { format } from 'date-fns';
import Link from 'next/link';
import { Calendar, Search, Filter, Plus } from 'lucide-react';

export default function AppointmentsPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'ALL'>('ALL');
    const [dateFilter, setDateFilter] = useState<string>('');

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const { data: appointmentsData, isLoading } = useQuery({
        queryKey: ['appointments', 'all', statusFilter, dateFilter],
        queryFn: () => appointmentService.getAppointments(0, 100, {
            status: statusFilter !== 'ALL' ? statusFilter : undefined,
            startDate: dateFilter || todayStart,
            endDate: dateFilter || todayEnd,
        }),
    });

    const appointments = appointmentsData?.data || [];

    const filteredAppointments = appointments.filter(apt => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        const patientName = getFullName(apt.patient?.firstName || '', apt.patient?.lastName || '').toLowerCase();
        const doctorName = getFullName(apt.doctor?.firstName || '', apt.doctor?.lastName || '').toLowerCase();
        return patientName.includes(search) || doctorName.includes(search) || apt.appointmentNumber.toLowerCase().includes(search);
    });

    return (
        <div className="min-h-screen bg-brand-beige p-6 md:p-10">
            {/* Header */}
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-brand-teal font-serif">Appointments</h1>
                    <p className="text-brand-teal/60 mt-1.5 font-medium">Manage all patient appointments</p>
                </div>
                <Link
                    href="/frontdesk/appointments/book"
                    className="inline-flex items-center justify-center gap-2 bg-brand-teal hover:bg-brand-teal-dark text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                    <Plus className="w-5 h-5" />
                    New Appointment
                </Link>
            </header>

            {/* Filters */}
            <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-white/50 p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-teal/40" />
                        <input
                            type="text"
                            placeholder="Search by patient, doctor, or number..."
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
                            onChange={(e) => setStatusFilter(e.target.value as AppointmentStatus | 'ALL')}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-brand-teal/20 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none transition-all appearance-none bg-white"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value={AppointmentStatus.REQUESTED}>New Requests</option>
                            <option value={AppointmentStatus.SCHEDULED}>Scheduled (Pending Doctor)</option>
                            <option value={AppointmentStatus.NEEDS_RESCHEDULE}>Needs Reschedule</option>
                            <option value={AppointmentStatus.CONFIRMED}>Confirmed</option>
                            <option value={AppointmentStatus.PENDING_PAYMENT}>Pending Payment</option>
                            <option value={AppointmentStatus.CHECKED_IN}>Checked In</option>
                            <option value={AppointmentStatus.COMPLETED}>Completed</option>
                            <option value={AppointmentStatus.CANCELLED}>Cancelled</option>
                            <option value={AppointmentStatus.NO_SHOW}>No Show</option>
                        </select>
                    </div>

                    {/* Date Filter */}
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-teal/40" />
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-brand-teal/20 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Appointments Table */}
            <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-white/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-brand-teal/5 border-b border-brand-teal/5">
                                <th className="px-6 py-4 text-[10px] font-bold text-brand-teal/40 uppercase tracking-[0.2em]">Appointment #</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-brand-teal/40 uppercase tracking-[0.2em]">Date & Time</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-brand-teal/40 uppercase tracking-[0.2em]">Patient</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-brand-teal/40 uppercase tracking-[0.2em]">Doctor</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-brand-teal/40 uppercase tracking-[0.2em]">Type</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-brand-teal/40 uppercase tracking-[0.2em]">Status</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-brand-teal/40 uppercase tracking-[0.2em] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-teal/5">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center text-brand-teal/30 text-sm font-medium">
                                        Loading appointments...
                                    </td>
                                </tr>
                            ) : filteredAppointments.length > 0 ? (
                                filteredAppointments.map((apt) => (
                                    <tr key={apt.id} className="hover:bg-brand-teal/[0.02] transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-brand-teal">
                                            {apt.appointmentNumber}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-teal/70 font-medium">
                                            {apt.scheduledStartTime ? (
                                                <>
                                                    <div>{format(new Date(apt.scheduledStartTime), 'MMM dd, yyyy')}</div>
                                                    <div className="text-xs text-brand-teal/40">{format(new Date(apt.scheduledStartTime), 'HH:mm')}</div>
                                                </>
                                            ) : (
                                                <span className="text-brand-gold font-bold italic">TBD (Request)</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <div className="font-bold text-brand-teal">{getFullName(apt.patient?.firstName || '', apt.patient?.lastName || '')}</div>
                                            <div className="text-brand-teal/40 text-xs font-medium">{apt.patient?.phone || 'No phone'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-brand-teal/70 font-medium">
                                            Dr. {getFullName(apt.doctor?.firstName || '', apt.doctor?.lastName || '')}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-brand-teal/70 font-medium">
                                            {apt.appointmentType}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <AppointmentStatusBadge status={apt.status} />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                            <AppointmentActions appointment={apt as any} />
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center text-brand-teal/30 text-sm font-medium italic">
                                        No appointments found matching your filters.
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
