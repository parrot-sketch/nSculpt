'use client';

import Link from 'next/link';
import { ArrowLeft, Bell, CheckCircle2 } from 'lucide-react';

/**
 * Patient Notifications Page
 * 
 * System notifications and alerts for the patient.
 * Placeholder for future notifications implementation.
 */
export default function PatientNotificationsPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mb-8">
        <Link
          href="/patient/dashboard"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-slate-900">Notifications</h1>
        <p className="text-slate-600 mt-1">Stay updated with important information</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
        <Bell className="h-16 w-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Notifications</h3>
        <p className="text-slate-600">
          You're all caught up! Important updates will appear here.
        </p>
      </div>
    </div>
  );
}
