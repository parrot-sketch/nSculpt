import React from 'react';
import { format } from 'date-fns';
import { getFullName } from '@/lib/utils';
import { AppointmentStatus } from '@/services/appointment.service';

interface WaitingRoomProps {
    appointments: any[];
}

export function WaitingRoom({ appointments }: WaitingRoomProps) {
    const waitingPatients = appointments.filter(a => a.status === AppointmentStatus.CHECKED_IN);
    const checkedInCount = waitingPatients.length;

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-white/50 p-6">
            <h3 className="text-[10px] font-bold text-brand-teal/40 uppercase tracking-[0.2em] mb-6 flex items-center justify-between">
                Waiting Room
                <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">{checkedInCount}</span>
            </h3>
            <div className="space-y-4">
                {waitingPatients.length > 0 ? (
                    waitingPatients.slice(0, 5).map(apt => (
                        <div key={apt.id} className="flex items-center justify-between p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 group">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-xs">
                                        {apt.patient?.firstName[0]}{apt.patient?.lastName[0]}
                                    </div>
                                    <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white animate-pulse"></div>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-brand-teal leading-tight">{getFullName(apt.patient?.firstName || '', apt.patient?.lastName || '')}</p>
                                    <p className="text-[10px] font-medium text-brand-teal/40 mt-0.5 uppercase tracking-wide">Waiting for Dr. {apt.doctor?.lastName}</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-black text-brand-teal/30">{format(new Date(apt.scheduledStartTime), 'HH:mm')}</span>
                        </div>
                    ))
                ) : (
                    <div className="py-10 text-center">
                        <p className="text-sm text-brand-teal/30 italic font-medium">Waiting room is empty.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
