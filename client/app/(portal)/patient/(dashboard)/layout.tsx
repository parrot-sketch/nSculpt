'use client';

import { PatientSidebar } from '@/components/layout/PatientSidebar';

/**
 * Dashboard Layout - Restricted to clinical management pages
 * Includes the professional sidebar.
 */
export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="h-screen bg-slate-50 flex overflow-hidden">
            {/* Patient Sidebar */}
            <PatientSidebar />

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
