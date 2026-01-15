'use client';

import { ArrowRight, Calendar } from 'lucide-react';

/**
 * Follow-up Plans Awaiting Scheduling
 * 
 * Shows active follow-up plans that need appointments scheduled.
 * Front Desk schedules the follow-up appointment.
 */
export default function FollowUpSchedulingPage() {
    // TODO: Implement with getAppointmentsRequiringScheduling().followUpPlans

    return (
        <div className="p-6 md:p-10">
            {/* Header */}
            <header className="mb-8">
                <h1 className="text-4xl font-bold tracking-tight text-brand-teal font-serif">
                    Follow-up Plans
                </h1>
                <p className="text-brand-teal/60 mt-1.5 font-medium">
                    Active follow-ups awaiting scheduling
                </p>
            </header>

            {/* Empty State */}
            <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-white/50 p-16">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                        <ArrowRight className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-bold text-brand-teal mb-2">No Follow-ups to Schedule</h3>
                    <p className="text-sm text-brand-teal/60 max-w-md mx-auto">
                        Active follow-up plans will appear here when they need appointments scheduled.
                        You'll be able to book follow-up appointments directly from this list.
                    </p>
                </div>
            </div>

            {/* Info Card */}
            <div className="mt-6 bg-green-50/50 backdrop-blur-md rounded-2xl shadow-sm border border-green-100/50 p-6">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-green-900 mb-1">About Follow-up Scheduling</h3>
                        <p className="text-xs text-green-700/70 leading-relaxed">
                            When a doctor creates a follow-up plan after consultation or procedure, it will appear here.
                            Front Desk schedules the follow-up appointment according to the doctor's recommended timeline.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
