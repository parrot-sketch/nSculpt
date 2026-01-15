'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookingWizard, BookingMode } from '@/components/frontdesk/booking/BookingWizard';

export default function BookAppointmentPage() {
    return (
        <div className="min-h-screen bg-brand-gray/30 p-4 md:p-8">
            {/* Page Header */}
            <div className="max-w-5xl mx-auto mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-brand-teal font-serif">
                    Operational Booking
                </h1>
                <p className="text-brand-teal/60">
                    Orchestrate clinic flow by scheduling appointments.
                </p>
            </div>

            <Suspense fallback={<div>Loading...</div>}>
                <WizardWrapper />
            </Suspense>
        </div>
    );
}

function WizardWrapper() {
    const searchParams = useSearchParams();
    const initialMode = (searchParams.get('mode') as BookingMode) || 'existing';
    const requestId = searchParams.get('requestId') || undefined;

    return <BookingWizard initialMode={initialMode} requestId={requestId} />;
}
