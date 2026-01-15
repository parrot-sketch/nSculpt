'use client';

import { Scissors, Calendar } from 'lucide-react';

/**
 * Procedure Plans Awaiting Scheduling
 * 
 * Shows approved procedure plans that need appointments scheduled.
 * Front Desk schedules the operational appointment.
 */
export default function ProcedureSchedulingPage() {
    // TODO: Implement with getAppointmentsRequiringScheduling().procedurePlans

    return (
        <div className="p-6 md:p-10">
            {/* Header */}
            <header className="mb-8">
                <h1 className="text-4xl font-bold tracking-tight text-brand-teal font-serif">
                    Procedure Plans
                </h1>
                <p className="text-brand-teal/60 mt-1.5 font-medium">
                    Approved procedures awaiting scheduling
                </p>
            </header>

            {/* Empty State */}
            <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-white/50 p-16">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4">
                        <Scissors className="w-8 h-8 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-bold text-brand-teal mb-2">No Procedures to Schedule</h3>
                    <p className="text-sm text-brand-teal/60 max-w-md mx-auto">
                        Approved procedure plans will appear here when they need appointments scheduled.
                        You'll be able to book surgery appointments directly from this list.
                    </p>
                </div>
            </div>

            {/* Info Card */}
            <div className="mt-6 bg-blue-50/50 backdrop-blur-md rounded-2xl shadow-sm border border-blue-100/50 p-6">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-blue-900 mb-1">About Procedure Scheduling</h3>
                        <p className="text-xs text-blue-700/70 leading-relaxed">
                            When a doctor creates and approves a procedure plan during consultation, it will appear here.
                            Front Desk schedules the operational appointment (date, time, room) while the clinical
                            details remain with the doctor.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
