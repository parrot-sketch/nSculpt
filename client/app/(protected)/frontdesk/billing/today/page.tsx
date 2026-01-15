'use client';

import { CheckCircle, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

/**
 * Paid Today - Today's Payments Overview
 * 
 * Read-only view of today's collected payments.
 * Front Desk can see what was paid but cannot modify.
 */
export default function PaidTodayPage() {
    const today = new Date();

    // TODO: Implement with Payment queries for today

    return (
        <div className="p-6 md:p-10">
            {/* Header */}
            <header className="mb-8">
                <h1 className="text-4xl font-bold tracking-tight text-brand-teal font-serif">
                    Paid Today
                </h1>
                <p className="text-brand-teal/60 mt-1.5 font-medium">
                    {format(today, 'EEEE, MMMM d, yyyy')}
                </p>
            </header>

            {/* Summary Card */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-sm border border-green-200 p-8 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-green-700/60 uppercase tracking-wider mb-2">
                            Total Collected Today
                        </p>
                        <p className="text-5xl font-bold text-green-700">$0.00</p>
                    </div>
                    <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                        <DollarSign className="w-10 h-10 text-green-600" />
                    </div>
                </div>
            </div>

            {/* Empty State */}
            <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-white/50 p-16">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-bold text-brand-teal mb-2">No Payments Yet</h3>
                    <p className="text-sm text-brand-teal/60 max-w-md mx-auto">
                        Payments received today will appear here. This is a read-only view for Front Desk reference.
                    </p>
                </div>
            </div>
        </div>
    );
}
