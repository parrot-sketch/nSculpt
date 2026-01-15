'use client';

import { useState, useEffect } from 'react';
import { appointmentService, Appointment, AppointmentStatus } from '@/services/appointment.service';
import { format } from 'date-fns';
import { CheckCircle2, Calendar, Clock, User, AlertTriangle, RefreshCw } from 'lucide-react';
import { getFullName } from '@/lib/utils';
import { toast } from 'sonner';

export default function DoctorConfirmations() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchConfirmations = async () => {
        try {
            setIsLoading(true);
            // Fetch SCHEDULED appointments needing confirmation
            const response = await appointmentService.getAppointments(0, 50, {
                status: AppointmentStatus.SCHEDULED
            });
            setAppointments(response.data || []);
        } catch (error) {
            console.error('Failed to fetch confirmations:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchConfirmations();
    }, []);

    const handleConfirm = async (id: string) => {
        try {
            await appointmentService.doctorConfirm(id);
            toast.success('Appointment confirmed');
            fetchConfirmations();
        } catch (error) {
            toast.error('Failed to confirm appointment');
        }
    };

    const handleRescheduleRequest = async (id: string) => {
        const notes = window.prompt('Please enter reason for reschedule:');
        if (notes === null) return;

        try {
            await appointmentService.requestReschedule(id, notes);
            toast.success('Reschedule requested');
            fetchConfirmations();
        } catch (error) {
            toast.error('Failed to request reschedule');
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500 italic">Checking for pending confirmations...</div>;
    }

    if (appointments.length === 0) {
        return null; // Don't show anything if no pending confirmations
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-brand-teal/10 overflow-hidden mb-8">
            <div className="bg-brand-teal px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-brand-gold" />
                    <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                        Pending Your Confirmation ({appointments.length})
                    </h2>
                </div>
                <p className="text-xs text-brand-teal-light italic opacity-80">
                    Staff assigned these slots. Please confirm or request change.
                </p>
            </div>

            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                {appointments.map((apt) => (
                    <div key={apt.id} className="p-6 hover:bg-slate-50 transition-colors">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-start gap-4">
                                <div className="h-12 w-12 rounded-full bg-brand-teal/5 flex items-center justify-center text-brand-teal border border-brand-teal/10">
                                    <User className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-brand-teal text-lg leading-none">
                                        {getFullName(apt.patient?.firstName || '', apt.patient?.lastName || '')}
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                                        <div className="flex items-center gap-1.5 font-medium">
                                            <Calendar className="h-4 w-4 text-brand-gold" />
                                            {format(new Date(apt.scheduledStartTime), 'EEEE, MMM dd')}
                                        </div>
                                        <div className="flex items-center gap-1.5 font-medium">
                                            <Clock className="h-4 w-4 text-brand-gold" />
                                            {format(new Date(apt.scheduledStartTime), 'hh:mm a')}
                                        </div>
                                    </div>
                                    {apt.reason && (
                                        <p className="text-xs text-slate-400 font-medium italic mt-2">
                                            "{apt.reason}"
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handleConfirm(apt.id)}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-brand-teal text-white rounded-lg font-bold hover:bg-brand-teal-dark transition-all shadow-sm hover:shadow-md active:scale-95"
                                >
                                    <CheckCircle2 className="h-4 w-4 border-2 border-white rounded-full" />
                                    CONFIRM
                                </button>
                                <button
                                    onClick={() => handleRescheduleRequest(apt.id)}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-white border-2 border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-50 transition-all active:scale-95"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    NEED CHANGE
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
