'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { appointmentService } from '@/services/appointment.service';
import { getFullName } from '@/lib/utils';
import { format } from 'date-fns';
import { Users, Clock, CheckCircle2, UserCheck } from 'lucide-react';

/**
 * Queue Management - Clinic Floor Operations
 * 
 * Real-time view of patients in the clinic:
 * - Checked-in patients (waiting)
 * - With doctor (in consultation)
 * - Completed today
 */
export default function QueuePage() {
    const [activeTab, setActiveTab] = useState<'waiting' | 'with-doctor' | 'completed'>('waiting');

    const { data: todayAppointments, isLoading } = useQuery({
        queryKey: ['appointments', 'queue', 'today'],
        queryFn: () => appointmentService.getAppointments(0, 100, {
            startDate: new Date(),
            endDate: new Date(),
        }),
        refetchInterval: 10000, // Refresh every 10 seconds for real-time updates
    });

    const appointments = todayAppointments?.data || [];

    // Group by status
    const waiting = appointments.filter(apt => apt.status === 'CHECKED_IN' && !apt.encounter);
    const withDoctor = appointments.filter(apt =>
        apt.encounter && (apt.encounter.status === 'IN_PROGRESS' || apt.encounter.status === 'ARRIVED')
    );
    const completed = appointments.filter(apt =>
        apt.status === 'COMPLETED' || (apt.encounter && apt.encounter.status === 'FINISHED')
    );

    return (
        <div className="p-6 md:p-10">
            {/* Header */}
            <header className="mb-8">
                <h1 className="text-4xl font-bold tracking-tight text-brand-teal font-serif">
                    Clinic Floor
                </h1>
                <p className="text-brand-teal/60 mt-1.5 font-medium">
                    Real-time queue management
                </p>
            </header>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <StatCard
                    icon={Users}
                    label="Waiting"
                    value={waiting.length}
                    color="amber"
                    active={activeTab === 'waiting'}
                    onClick={() => setActiveTab('waiting')}
                />
                <StatCard
                    icon={UserCheck}
                    label="With Doctor"
                    value={withDoctor.length}
                    color="purple"
                    active={activeTab === 'with-doctor'}
                    onClick={() => setActiveTab('with-doctor')}
                />
                <StatCard
                    icon={CheckCircle2}
                    label="Completed"
                    value={completed.length}
                    color="green"
                    active={activeTab === 'completed'}
                    onClick={() => setActiveTab('completed')}
                />
            </div>

            {/* Queue List */}
            <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-white/50 overflow-hidden">
                {isLoading ? (
                    <div className="p-16 text-center text-brand-teal/30">Loading queue...</div>
                ) : (
                    <div className="divide-y divide-brand-teal/5">
                        {activeTab === 'waiting' && (
                            waiting.length > 0 ? (
                                waiting.map((apt, idx) => (
                                    <QueueItem key={apt.id} appointment={apt} position={idx + 1} />
                                ))
                            ) : (
                                <div className="p-16 text-center text-brand-teal/30 italic">
                                    No patients waiting
                                </div>
                            )
                        )}
                        {activeTab === 'with-doctor' && (
                            withDoctor.length > 0 ? (
                                withDoctor.map(apt => (
                                    <QueueItem key={apt.id} appointment={apt} />
                                ))
                            ) : (
                                <div className="p-16 text-center text-brand-teal/30 italic">
                                    No patients with doctor
                                </div>
                            )
                        )}
                        {activeTab === 'completed' && (
                            completed.length > 0 ? (
                                completed.map(apt => (
                                    <QueueItem key={apt.id} appointment={apt} />
                                ))
                            ) : (
                                <div className="p-16 text-center text-brand-teal/30 italic">
                                    No completed appointments today
                                </div>
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

interface StatCardProps {
    icon: any;
    label: string;
    value: number;
    color: 'amber' | 'purple' | 'green';
    active: boolean;
    onClick: () => void;
}

function StatCard({ icon: Icon, label, value, color, active, onClick }: StatCardProps) {
    const colorClasses = {
        amber: active ? 'bg-amber-100 border-amber-300' : 'bg-amber-50 border-amber-200',
        purple: active ? 'bg-purple-100 border-purple-300' : 'bg-purple-50 border-purple-200',
        green: active ? 'bg-green-100 border-green-300' : 'bg-green-50 border-green-200',
    };

    const textColor = {
        amber: 'text-amber-700',
        purple: 'text-purple-700',
        green: 'text-green-700',
    };

    return (
        <button
            onClick={onClick}
            className={`bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-2 p-6 transition-all hover:shadow-md ${colorClasses[color]}`}
        >
            <div className="flex items-center justify-between">
                <div className="text-left">
                    <p className="text-xs font-bold text-brand-teal/40 uppercase tracking-wider mb-1">
                        {label}
                    </p>
                    <p className={`text-3xl font-bold ${textColor[color]}`}>{value}</p>
                </div>
                <Icon className={`w-8 h-8 ${textColor[color]}`} />
            </div>
        </button>
    );
}

function QueueItem({ appointment, position }: any) {
    const patientName = getFullName(
        appointment.patient?.firstName || '',
        appointment.patient?.lastName || ''
    );
    const doctorName = getFullName(
        appointment.doctor?.firstName || 'Dr.',
        appointment.doctor?.lastName || ''
    );

    return (
        <div className="p-6 hover:bg-brand-teal/[0.02] transition-colors">
            <div className="flex items-center gap-6">
                {position && (
                    <div className="w-12 h-12 rounded-full bg-brand-teal/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xl font-bold text-brand-teal">{position}</span>
                    </div>
                )}
                <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h3 className="font-bold text-brand-teal text-lg">{patientName}</h3>
                            <p className="text-sm text-brand-teal/60 mt-1">
                                {appointment.patient?.patientNumber}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-medium text-brand-teal/70">{doctorName}</p>
                            <p className="text-xs text-brand-teal/40 mt-1">
                                {format(new Date(appointment.scheduledStartTime), 'HH:mm')}
                            </p>
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <Clock className="w-3 h-3" />
                            {appointment.appointmentType}
                        </span>
                        {appointment.reason && (
                            <span className="text-xs text-brand-teal/60">{appointment.reason}</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
