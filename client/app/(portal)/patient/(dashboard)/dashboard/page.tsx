'use client';

import { useAuth } from '@/hooks/useAuth';
import { usePatientProfile, usePatientAppointments, usePatientVisits } from '@/hooks/usePatientSelf';
import { useProcedurePlansByPatient } from '@/hooks/useProcedurePlans';
import { format } from 'date-fns';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  FileText,
  MessageCircle,
  ChevronRight,
  Plus,
  ShieldCheck,
  LayoutDashboard,
  Compass,
  ArrowRight,
  User,
  CreditCard,
} from 'lucide-react';
import { getFullName } from '@/lib/utils';
import { AppointmentStatusBadge } from '@/components/appointments/AppointmentStatusBadge';
import { ProcedurePlanStatus } from '@/services/procedure-plan.service';

/**
 * Professional Patient Dashboard
 * 
 * Clean, utilitarian workspace focusing on clinical management
 * and active care steps.
 */
export default function PatientDashboard() {
  const { user } = useAuth();
  const { data: patient, isLoading: isLoadingProfile } = usePatientProfile();
  const { data: appointments, isLoading: isLoadingAppointments } = usePatientAppointments();
  const { data: visits } = usePatientVisits();
  const { data: procedurePlans } = useProcedurePlansByPatient(patient?.id || null);

  // Filter and sort appointments
  const upcomingAppointments = (appointments || [])
    .filter(apt => new Date(apt.scheduledStartTime) >= new Date())
    .sort((a, b) => new Date(a.scheduledStartTime).getTime() - new Date(b.scheduledStartTime).getTime())
    .slice(0, 3);

  const patientName = patient
    ? getFullName(patient.firstName || '', patient.lastName || '') || patient.email
    : user
      ? getFullName(user.firstName || '', user.lastName || '') || user.email
      : 'Patient';

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Loading clinical dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* PROFESSIONAL HEADER */}
      <div className="bg-white border-b border-slate-200 pt-8 pb-6 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest mb-2">
                <LayoutDashboard className="h-3.5 w-3.5" />
                Patient Workspace
              </div>
              <h1 className="text-3xl font-bold text-slate-900 leading-tight">
                Welcome, {patientName}
              </h1>
              <p className="text-slate-500 mt-1">Manage your care and clinical records.</p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/patient/discover"
                className="px-5 py-2.5 bg-indigo-50 text-indigo-700 rounded-lg font-bold text-sm hover:bg-indigo-100 transition-colors flex items-center gap-2 border border-indigo-100"
              >
                <Compass className="h-4 w-4" />
                Discovery Hub
              </Link>
              <Link
                href="/patient/book"
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-all shadow-md flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Book Appointment
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 mt-8">
        {/* QUICK STATS / ACTION CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Appointments</p>
              <p className="text-xl font-bold text-slate-900">{upcomingAppointments?.length || 0}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Active Plans</p>
              <p className="text-xl font-bold text-slate-900">
                {procedurePlans?.filter(p => p.status !== ProcedurePlanStatus.COMPLETED && p.status !== ProcedurePlanStatus.CANCELLED).length || 0}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Pending Bills</p>
              <p className="text-xl font-bold text-slate-900">0</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Status</p>
              <p className="text-xl font-bold text-emerald-600">Verified</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Workspace */}
          <div className="lg:col-span-8 space-y-8">
            {/* Appointments Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-indigo-600" />
                  Clinical Schedule
                </h2>
                <Link href="/patient/appointments" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
                  View Full History
                </Link>
              </div>

              <div className="p-6">
                {isLoadingAppointments ? (
                  <div className="py-8 text-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-100 border-t-indigo-600 mx-auto" /></div>
                ) : upcomingAppointments.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingAppointments.map((apt) => (
                      <div key={apt.id} className="flex items-center gap-4 p-4 rounded-lg border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/20 transition-all">
                        <div className="flex flex-col items-center justify-center h-12 w-12 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-colors">
                          <p className="text-[10px] uppercase font-bold text-slate-500">{format(new Date(apt.scheduledStartTime), 'MMM')}</p>
                          <p className="text-lg font-bold -mt-1 leading-none">{format(new Date(apt.scheduledStartTime), 'dd')}</p>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-slate-800">{apt.appointmentType}</p>
                            <AppointmentStatusBadge status={apt.status} />
                          </div>
                          <div className="flex items-center gap-3 mt-1.5">
                            <div className="flex items-center gap-1 text-slate-500 text-xs">
                              <Clock className="h-3 w-3" />
                              {format(new Date(apt.scheduledStartTime), 'h:mm a')}
                            </div>
                            {apt.doctor && (
                              <div className="flex items-center gap-1 text-slate-500 text-xs italic">
                                <User className="h-3 w-3" />
                                Dr. {getFullName(apt.doctor.firstName || '', apt.doctor.lastName || '')}
                              </div>
                            )}
                          </div>
                        </div>
                        <Link href={`/patient/appointments/${apt.id}`} className="text-slate-400 hover:text-indigo-600">
                          <ChevronRight className="h-5 w-5" />
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-xl px-4">
                    <p className="text-slate-500 text-sm mb-4">You have no upcoming clinical appointments.</p>
                    <Link href="/patient/book" className="text-sm font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-100">
                      Request Consultation
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Medical Records Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  Recent Medical Records
                </h2>
                <Link href="/patient/records" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
                  Access All Files
                </Link>
              </div>
              <div className="p-6">
                {(visits || []).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(visits || []).slice(0, 4).map((visit: any, idx: number) => (
                      <div key={visit.id || idx} className="p-3.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-white text-indigo-500 flex items-center justify-center shadow-sm border border-slate-100">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-sm font-bold text-slate-800 truncate">
                            {visit.periodStart ? format(new Date(visit.periodStart), 'MMM d, yyyy') : 'Visit Record'}
                          </p>
                          <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wide mt-0.5">{visit.type || visit.class || 'Clinical Record'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-slate-400 text-sm italic">No recent clinical records available.</div>
                )}
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className="lg:col-span-4 space-y-6">
            {/* Active Treatment Plans */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Active Plans
              </h3>
              {procedurePlans && procedurePlans.filter(p => p.status !== ProcedurePlanStatus.COMPLETED).length > 0 ? (
                <div className="space-y-4">
                  {procedurePlans.filter(p => p.status !== ProcedurePlanStatus.COMPLETED).slice(0, 2).map(plan => (
                    <div key={plan.id} className="p-3 border-l-2 border-indigo-500 bg-indigo-50/30 rounded-r-lg">
                      <p className="text-sm font-bold text-indigo-900">{plan.procedureName}</p>
                      <p className="text-[10px] text-indigo-600 font-medium uppercase mt-1">Status: {plan.status}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-lg text-center">
                  <p className="text-xs text-slate-500">No active procedure plans.</p>
                </div>
              )}
            </div>

            {/* Support Message Hub */}
            <div className="bg-indigo-600 rounded-xl p-6 text-white shadow-md relative overflow-hidden group">
              <div className="absolute top-0 right-0 h-24 w-24 bg-white/10 rounded-full -translate-y-8 translate-x-8 group-hover:scale-125 transition-transform" />
              <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                Care Coordination
                <MessageCircle className="h-4 w-4" />
              </h3>
              <p className="text-xs text-indigo-100 mb-5 leading-relaxed">
                Contact your surgical coordinator for any questions regarding your recovery or schedule.
              </p>
              <Link
                href="/patient/messages"
                className="inline-flex items-center gap-2 px-6 py-2 bg-white text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-50 transition-colors"
              >
                Open Message Center
              </Link>
            </div>

            {/* Discovery Promotion (Clean) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-6 text-center">
              <Compass className="h-8 w-8 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800 text-sm">Explore Nairobi Sculpt</h3>
              <p className="text-xs text-slate-500 mt-2 mb-4 leading-relaxed">
                Discover our full range of aesthetic procedures and meet our board-certified experts.
              </p>
              <Link href="/patient/discover" className="text-xs font-bold text-indigo-600 border border-indigo-100 px-4 py-2 rounded-lg hover:bg-indigo-50 inline-flex items-center gap-1">
                Visit Discovery Hub
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
