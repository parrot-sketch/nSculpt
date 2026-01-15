'use client';

import { usePatientAppointments } from '@/hooks/usePatientSelf';
import { format } from 'date-fns';
import Link from 'next/link';
import { Calendar, Plus, Clock, User, ArrowLeft } from 'lucide-react';
import { getFullName } from '@/lib/utils';
import { AppointmentActions } from '@/components/appointments/AppointmentActions';
import { AppointmentStatusBadge } from '@/components/appointments/AppointmentStatusBadge';
import type { Appointment } from '@/services/appointment.service';

/**
 * Patient Appointments Page
 * 
 * View and manage own appointments.
 * Patients can view upcoming and past appointments.
 */
export default function PatientAppointmentsPage() {
  const { data: appointments, isLoading, error } = usePatientAppointments();

  const appointmentsList = appointments || [];
  const upcoming = appointmentsList.filter(apt => 
    new Date(apt.scheduledStartTime) >= new Date()
  ).sort((a, b) => 
    new Date(a.scheduledStartTime).getTime() - new Date(b.scheduledStartTime).getTime()
  );
  const past = appointmentsList.filter(apt => 
    new Date(apt.scheduledStartTime) < new Date()
  ).sort((a, b) => 
    new Date(b.scheduledStartTime).getTime() - new Date(a.scheduledStartTime).getTime()
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Loading your appointments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-8">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center">
          <p className="text-rose-800 font-medium">Unable to load appointments</p>
          <p className="text-rose-600 text-sm mt-2">
            {(error as any)?.message || 'There was a problem loading your appointments. Please try again.'}
          </p>
          <Link
            href="/patient/dashboard"
            className="inline-block mt-4 text-sm text-rose-600 hover:text-rose-800 underline"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link
            href="/patient/dashboard"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">My Appointments</h1>
          <p className="text-slate-600 mt-1">View and manage your appointments</p>
        </div>
        <Link
          href="/patient/book"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Book Appointment
        </Link>
      </div>

      {/* Upcoming Appointments */}
      {upcoming.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Upcoming</h2>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="divide-y divide-slate-200">
              {upcoming.map((apt) => (
                <div
                  key={apt.id}
                  className="p-6 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="h-12 w-12 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <Calendar className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-semibold text-slate-900">
                            {format(new Date(apt.scheduledStartTime), 'EEEE, MMMM d, yyyy')}
                          </p>
                          <AppointmentStatusBadge status={apt.status} />
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {format(new Date(apt.scheduledStartTime), 'h:mm a')}
                          </div>
                          {apt.doctor && (
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              Dr. {getFullName(apt.doctor.firstName || '', apt.doctor.lastName || '')}
                            </div>
                          )}
                        </div>
                        {apt.reason && (
                          <p className="text-sm text-slate-500 mt-2 italic">
                            {apt.reason}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <AppointmentActions appointment={apt as Appointment} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Past Appointments */}
      {past.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Past Appointments</h2>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="divide-y divide-slate-200">
              {past.map((apt) => (
                <div
                  key={apt.id}
                  className="p-6 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Calendar className="h-6 w-6 text-slate-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-semibold text-slate-900">
                            {format(new Date(apt.scheduledStartTime), 'EEEE, MMMM d, yyyy')}
                          </p>
                        <AppointmentStatusBadge status={apt.status} />
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {format(new Date(apt.scheduledStartTime), 'h:mm a')}
                          </div>
                          {apt.doctor && (
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              Dr. {getFullName(apt.doctor.firstName || '', apt.doctor.lastName || '')}
                            </div>
                          )}
                        </div>
                        {apt.reason && (
                          <p className="text-sm text-slate-500 mt-2 italic">
                            {apt.reason}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <AppointmentActions appointment={apt as Appointment} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {upcoming.length === 0 && past.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <Calendar className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Appointments</h3>
          <p className="text-slate-600 mb-6">You don't have any appointments yet.</p>
          <Link
            href="/patient/book"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Book Your First Appointment
          </Link>
        </div>
      )}
    </div>
  );
}
