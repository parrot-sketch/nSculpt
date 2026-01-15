'use client';

import { DollarSign, AlertCircle } from 'lucide-react';

/**
 * Unpaid Invoices - Limited Front Desk View
 * 
 * Shows unpaid invoices linked to appointments.
 * Front Desk can view and mark as paid, but cannot edit amounts.
 */
export default function UnpaidInvoicesPage() {
    // TODO: Implement with Invoice queries

    return (
        <div className="p-6 md:p-10">
            {/* Header */}
            <header className="mb-8">
                <h1 className="text-4xl font-bold tracking-tight text-brand-teal font-serif">
                    Unpaid Invoices
                </h1>
                <p className="text-brand-teal/60 mt-1.5 font-medium">
                    Outstanding payments
                </p>
            </header>

            {/* Empty State */}
            <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-white/50 p-16">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                        <DollarSign className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-bold text-brand-teal mb-2">All Caught Up!</h3>
                    <p className="text-sm text-brand-teal/60 max-w-md mx-auto">
                        No unpaid invoices at the moment. Outstanding invoices will appear here.
                    </p>
                </div>
            </div>

            {/* Info Card */}
            <div className="mt-6 bg-amber-50/50 backdrop-blur-md rounded-2xl shadow-sm border border-amber-100/50 p-6">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-amber-900 mb-1">Front Desk Billing Limits</h3>
                        <p className="text-xs text-amber-700/70 leading-relaxed">
                            Front Desk can view invoices and mark payments as received, but cannot edit invoice
                            amounts or billing codes. Full accounting is managed by the billing department.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
