'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { ROLES } from '@/lib/constants';
import { getFullName } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { theaterService } from '@/services/theater.service'; // Keep for surgical context
import { patientService } from '@/services/patient.service';
import { billingService } from '@/services/billing.service';
import { inventoryService } from '@/services/inventory.service';
import { appointmentService, AppointmentStatus } from '@/services/appointment.service';
import Link from 'next/link';
import {
  UserPlus,
  Calendar,
  CreditCard,
  Box,
  Users,
  Clock,
  AlertCircle,
  Search,
  CheckCircle2,
  Activity,
  Stethoscope,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';

/**
 * Modern Role-aware dashboard
 */
export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const access = useFeatureAccess();
  const queryClient = useQueryClient();

  // Redirect users to their appropriate dashboard based on department/role
  // Uses getDashboardRouteForUser which handles department-based and role-based routing
  useEffect(() => {
    if (!isAuthLoading && user) {
      const { getDashboardRouteForUser } = require('@/lib/department-routing');
      const dashboardRoute = getDashboardRouteForUser(user);
      
      // If user should be on a different dashboard, redirect them
      if (dashboardRoute !== '/dashboard') {
        console.log('[Dashboard] Redirecting user to appropriate dashboard:', dashboardRoute, {
          department: user.department?.code,
          roles: user.roles,
        });
        router.replace(dashboardRoute);
        return;
      }
    }
  }, [user, isAuthLoading, router]);

  // Show loading while determining redirect or if user is admin (will be redirected)
  if (isAuthLoading || (user && (user.roles?.includes(ROLES.ADMIN) || user.department?.code === 'ADMINISTRATION'))) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isFrontDesk = user?.roles.includes('FRONT_DESK');
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // --- QUERIES ---

  // 1. Today's Appointments (Consultations) - Specific for Front Desk
  const { data: appointmentsData } = useQuery({
    queryKey: ['appointments', 'today'],
    queryFn: () => appointmentService.getAppointments(0, 100, {
      startDate: todayStart,
      endDate: todayEnd
    }),
    enabled: isFrontDesk,
  });

  // 2. Surgical Cases (For reference/other roles)
  const { data: casesData } = useQuery({
    queryKey: ['surgical-cases', 'dashboard'],
    queryFn: () => theaterService.getCases(0, 5),
    enabled: access.canReadTheater() && !isFrontDesk, // Less priority for Front Desk main view, can add later
  });

  // 3. Recent Patients
  const { data: patientsData } = useQuery({
    queryKey: ['patients', 'dashboard'],
    queryFn: () => patientService.getPatients(0, 5),
    enabled: access.canReadPatients() || isFrontDesk,
  });

  // 4. Pending Bills
  const { data: billsData } = useQuery({
    queryKey: ['bills', 'dashboard'],
    queryFn: () => billingService.getBills(0, 5),
    enabled: access.canReadBilling() || isFrontDesk,
  });

  // 5. Stock
  const { data: stockData } = useQuery({
    queryKey: ['inventory-stock', 'dashboard'],
    queryFn: () => inventoryService.getStock(),
    enabled: access.canReadInventory() || isFrontDesk,
  });

  // --- MUTATIONS ---
  const checkInMutation = useMutation({
    mutationFn: (id: string) => appointmentService.checkIn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (error: any) => {
      alert('Failed to check in: ' + (error.response?.data?.message || 'Unknown error'));
    }
  });

  // --- COMPUTED STATS ---
  const todayAppointments = appointmentsData?.data || [];
  const checkedInCount = todayAppointments.filter(a => a.status === AppointmentStatus.CHECKED_IN).length;
  // const pendingCount = todayAppointments.filter(a => a.status === AppointmentStatus.CONFIRMED).length;

  const pendingBills = billsData?.data.filter((b) => b.status === 'PENDING' || b.status === 'SENT').length || 0;

  const lowStockItems = stockData?.filter((s) => {
    const onHand = parseFloat(s.quantityOnHand);
    const reorderPoint = s.item?.reorderPoint ? parseFloat(s.item.reorderPoint) : 0;
    return onHand <= reorderPoint && reorderPoint > 0;
  }).length || 0;


  // --- FRONT DESK VIEW ---
  if (isFrontDesk) {
    return (
      <div className="min-h-screen bg-gray-50/50 p-6 md:p-8 font-sans text-slate-800">
        {/* Header Section */}
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Front Desk Overview</h1>
            <p className="text-slate-500 mt-1 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {format(new Date(), 'EEEE, MMMM do, yyyy')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/patients/new" className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md">
              <UserPlus className="w-4 h-4" />
              New Registration
            </Link>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <StatWidget
            label="Appointments Today"
            value={todayAppointments.length}
            icon={<Calendar className="w-5 h-5 text-indigo-600" />}
            trend="Daily scheduled"
            color="bg-indigo-50 border-indigo-100"
          />
          <StatWidget
            label="Checked In"
            value={checkedInCount}
            icon={<CheckCircle2 className="w-5 h-5 text-green-600" />}
            trend="Patients waiting"
            color="bg-green-50 border-green-100"
          />
          <StatWidget
            label="Pending Bills"
            value={pendingBills}
            icon={<CreditCard className="w-5 h-5 text-orange-600" />}
            trend="Need attention"
            color="bg-orange-50 border-orange-100"
          />
          <StatWidget
            label="Low Stock"
            value={lowStockItems}
            icon={<AlertCircle className="w-5 h-5 text-red-600" />}
            trend="Items to reorder"
            color="bg-red-50 border-red-100"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Column: Appointment Schedule */}
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Today's Schedule</h2>
                  <p className="text-sm text-slate-500">Manage patient flow and check-ins</p>
                </div>
                <Link href="/appointments" className="text-sm font-medium text-primary hover:text-primary-dark flex items-center gap-1">
                  View Calendar <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Doctor</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {todayAppointments.length > 0 ? (
                      todayAppointments.map((apt) => (
                        <tr key={apt.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                            {format(new Date(apt.scheduledStartTime), 'HH:mm')}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-900">
                            <div className="font-medium">{getFullName(apt.patient?.firstName || '', apt.patient?.lastName || '')}</div>
                            <div className="text-slate-500 text-xs">{apt.patient?.phone || 'No phone'}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            Dr. {getFullName(apt.doctor?.firstName || '', apt.doctor?.lastName || '')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge status={apt.status} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            {apt.status === AppointmentStatus.CONFIRMED && (
                              <button
                                onClick={() => checkInMutation.mutate(apt.id)}
                                disabled={checkInMutation.isPending}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors shadow-sm disabled:opacity-50"
                              >
                                Check In
                              </button>
                            )}
                            {apt.status === AppointmentStatus.PENDING_PAYMENT && (
                              <Link href={`/appointments/${apt.id}/pay`} className="text-orange-600 hover:text-orange-900 font-medium text-xs">
                                Collect Payment
                              </Link>
                            )}
                            {apt.status === AppointmentStatus.CHECKED_IN && (
                              <span className="text-green-600 font-medium text-xs flex items-center justify-end gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Ready
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                          No appointments scheduled for today.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Registrations Block */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-slate-400" /> Recent Patients
                </h2>
                <Link href="/patients" className="text-sm font-medium text-primary hover:text-primary-dark">View All</Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
                {patientsData?.data?.slice(0, 4).map(patient => (
                  <Link key={patient.id} href={`/patients/${patient.id}`} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm">
                      {patient.firstName[0]}{patient.lastName[0]}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{getFullName(patient.firstName, patient.lastName)}</p>
                      <p className="text-xs text-slate-500">{patient.patientNumber || 'No MRN'}</p>
                    </div>
                  </Link>
                ))}
                {!patientsData?.data?.length && (
                  <div className="col-span-2 text-center py-4 text-slate-400 text-sm">No recent patients</div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Alerts & Quick Links */}
          <div className="space-y-6">
            {/* Quick Actions Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Quick Navigation</h3>
              <nav className="space-y-2">
                <QuickNavLink href="/patients/new" icon={<UserPlus />} label="Register Patient" color="text-blue-600" bg="bg-blue-50" />
                <QuickNavLink href="/appointments/new" icon={<Calendar />} label="Book Appointment" color="text-indigo-600" bg="bg-indigo-50" />
                <QuickNavLink href="/billing" icon={<CreditCard />} label="Billing Dashboard" color="text-green-600" bg="bg-green-50" />
                <QuickNavLink href="/inventory" icon={<Box />} label="Inventory" color="text-amber-600" bg="bg-amber-50" />
              </nav>
            </div>

            {/* Waiting Room / Queue Status (Simulated based on check-ins) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center justify-between">
                Waiting Room
                <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">{checkedInCount}</span>
              </h3>
              <div className="space-y-3">
                {todayAppointments.filter(a => a.status === AppointmentStatus.CHECKED_IN).length > 0 ? (
                  todayAppointments.filter(a => a.status === AppointmentStatus.CHECKED_IN).slice(0, 5).map(apt => (
                    <div key={apt.id} className="flex items-center justify-between p-3 rounded-lg bg-green-50/50 border border-green-100">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{getFullName(apt.patient?.firstName || '', apt.patient?.lastName || '')}</p>
                          <p className="text-xs text-slate-500">Waiting for Dr. {apt.doctor?.lastName}</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-slate-400">{format(new Date(apt.scheduledStartTime), 'HH:mm')}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 italic text-center py-4">Waiting room is empty.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- FALLBACK / OTHER ROLES VIEW (Keep existing logic effectively, but wrapped cleanly) ---
  return (
    <div className="min-h-screen bg-white p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">Dashboard</h1>
        {user && (
          <p className="text-neutral-600 mt-1">
            Welcome back, {getFullName(user.firstName, user.lastName)}
          </p>
        )}
      </div>
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md text-yellow-800">
        Generic Dashboard view for {user?.roles.join(', ')}. Front Desk view is prioritized.
      </div>
    </div>
  );
}

// --- SUBCOMPONENTS ---

function StatWidget({ label, value, icon, trend, color }: any) {
  return (
    <div className={`bg-white p-5 rounded-xl border shadow-sm ${color || 'border-slate-100'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">
          {icon}
        </div>
        <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-full">{trend}</span>
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="text-sm text-slate-500 font-medium">{label}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const styles: Record<string, string> = {
    [AppointmentStatus.CONFIRMED]: 'bg-blue-100 text-blue-800 border-blue-200',
    [AppointmentStatus.CHECKED_IN]: 'bg-green-100 text-green-800 border-green-200',
    [AppointmentStatus.PENDING_PAYMENT]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    [AppointmentStatus.CANCELLED]: 'bg-red-100 text-red-800 border-red-200',
    [AppointmentStatus.COMPLETED]: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles[AppointmentStatus.CONFIRMED]}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function QuickNavLink({ href, icon, label, color, bg }: any) {
  return (
    <Link href={href} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group">
      <div className={`p-2 rounded-md ${bg} ${color} group-hover:scale-110 transition-transform`}>
        {/* Clone icon to set size if needed, or rely on parent */}
        <div className="w-5 h-5">{icon}</div>
      </div>
      <span className="font-medium text-slate-700 group-hover:text-slate-900 text-sm">{label}</span>
      <ChevronRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-slate-500" />
    </Link>
  );
}
