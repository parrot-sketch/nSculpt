import React from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getFullName } from '@/lib/utils';
import { AppointmentStatusBadge } from '@/components/appointments/AppointmentStatusBadge';
import { AppointmentActions } from '@/components/appointments/AppointmentActions';
import { type Appointment } from '@/services/appointment.service';

interface ScheduleTableProps {
    appointments: any[];
}

export function ScheduleTable({ appointments }: ScheduleTableProps) {
    return (
        <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-white/50 overflow-hidden">
            <div className="p-6 border-b border-brand-teal/5 flex justify-between items-center bg-white/40">
                <div>
                    <h2 className="text-xl font-bold text-brand-teal font-serif">Today's Schedule</h2>
                    <p className="text-sm text-brand-teal/50 font-medium">Manage patient flow and check-ins</p>
                </div>
                <Link href="/appointments" className="text-sm font-bold text-brand-gold hover:text-brand-gold-dark flex items-center gap-1 transition-colors">
                    View Calendar <ChevronRight className="w-4 h-4" />
                </Link>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-brand-teal/5 border-b border-brand-teal/5">
                            <th className="px-8 py-4 text-[10px] font-bold text-brand-teal/40 uppercase tracking-[0.2em]">Time</th>
                            <th className="px-8 py-4 text-[10px] font-bold text-brand-teal/40 uppercase tracking-[0.2em]">Patient</th>
                            <th className="px-8 py-4 text-[10px] font-bold text-brand-teal/40 uppercase tracking-[0.2em]">Doctor</th>
                            <th className="px-8 py-4 text-[10px] font-bold text-brand-teal/40 uppercase tracking-[0.2em]">Status</th>
                            <th className="px-8 py-4 text-[10px] font-bold text-brand-teal/40 uppercase tracking-[0.2em] text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-teal/5">
                        {appointments.length > 0 ? (
                            appointments.map((apt) => (
                                <tr key={apt.id} className="hover:bg-brand-teal/[0.02] transition-colors group">
                                    <td className="px-8 py-5 whitespace-nowrap text-sm font-bold text-brand-teal">
                                        {format(new Date(apt.scheduledStartTime), 'HH:mm')}
                                    </td>
                                    <td className="px-8 py-5 text-sm">
                                        <div className="font-bold text-brand-teal">{getFullName(apt.patient?.firstName || '', apt.patient?.lastName || '')}</div>
                                        <div className="text-brand-teal/40 text-xs font-medium">{apt.patient?.phone || 'No phone'}</div>
                                    </td>
                                    <td className="px-8 py-5 text-sm text-brand-teal/70 font-medium">
                                        Dr. {getFullName(apt.doctor?.firstName || '', apt.doctor?.lastName || '')}
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap">
                                        <AppointmentStatusBadge status={apt.status} />
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap text-right text-sm">
                                        <AppointmentActions appointment={apt as Appointment} />
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-8 py-16 text-center text-brand-teal/30 text-sm font-medium italic">
                                    No appointments scheduled for today.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
