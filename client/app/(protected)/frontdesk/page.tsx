'use client';

import { useQuery } from '@tanstack/react-query';
import { appointmentService, AppointmentStatus } from '@/services/appointment.service';
import { format } from 'date-fns';
import { getFullName } from '@/lib/utils';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Users,
  AlertCircle,
  CheckCircle2,
  CalendarPlus,
  UserPlus,
  Scissors,
  ArrowRight,
} from 'lucide-react';

/**
 * Front Desk Dashboard - Operational Control Panel
 * 
 * Real clinic operations view:
 * - Today's appointments (time-ordered)
 * - Queue status (checked-in, waiting)
 * - Items requiring scheduling (procedures, follow-ups)
 * - Quick actions (book, check-in, register)
 */
export default function FrontDeskDashboard() {
  const today = new Date();

  // Today's appointments
  const { data: todayAppointments, isLoading: loadingToday } = useQuery({
    queryKey: ['appointments', 'dashboard', 'today', format(today, 'yyyy-MM-dd')],
    queryFn: () => appointmentService.getAppointments(0, 100, {
      startDate: today,
      endDate: today,
    }),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // New booking requests (status: REQUESTED)
  const { data: requestedAppointments, isLoading: loadingRequested } = useQuery({
    queryKey: ['appointments', 'dashboard', 'requested'],
    queryFn: () => appointmentService.getAppointments(0, 50, {
      status: AppointmentStatus.REQUESTED,
    }),
    refetchInterval: 15000, // Faster refresh for new requests (15s)
  });

  // Unconfirmed appointments (pending payment)
  const { data: unconfirmedAppointments } = useQuery({
    queryKey: ['appointments', 'dashboard', 'unconfirmed'],
    queryFn: () => appointmentService.getAppointments(0, 50, {
      status: AppointmentStatus.PENDING_PAYMENT,
    }),
    refetchInterval: 60000, // Refresh every minute
  });

  const appointments = todayAppointments?.data || [];
  const requested = requestedAppointments?.data || [];
  const unconfirmed = unconfirmedAppointments?.data || [];

  // Calculate stats
  const totalToday = appointments.length;
  const checkedIn = appointments.filter(apt => apt.status === 'CHECKED_IN').length;
  const completed = appointments.filter(apt => apt.status === 'COMPLETED').length;
  const pending = unconfirmed.length;
  const newRequests = requested.length;

  // Group appointments by time
  const now = new Date();
  const upcoming = appointments.filter(apt => new Date(apt.scheduledStartTime) > now);
  const current = appointments.filter(apt => {
    const start = new Date(apt.scheduledStartTime);
    const end = new Date(apt.scheduledEndTime);
    return start <= now && end >= now;
  });

  return (
    <div className="p-6 md:p-10">
      {/* Header */}
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-brand-teal font-serif">
            Front Desk Operations
          </h1>
          <p className="text-brand-teal/60 mt-1.5 font-medium">
            {format(today, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        {newRequests > 0 && (
          <div className="bg-brand-gold/10 border border-brand-gold/20 rounded-full px-4 py-1.5 flex items-center gap-2 animate-pulse">
            <CalendarPlus className="w-4 h-4 text-brand-gold" />
            <span className="text-xs font-bold text-brand-gold uppercase tracking-wider">
              {newRequests} New Request{newRequests > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <StatCard
          icon={CalendarPlus}
          label="New Requests"
          value={newRequests}
          color="amber"
          highlight={newRequests > 0}
        />
        <StatCard
          icon={Calendar}
          label="Today's Total"
          value={totalToday}
          color="blue"
        />
        <StatCard
          icon={Users}
          label="Checked In"
          value={checkedIn}
          color="purple"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={completed}
          color="green"
        />
        <StatCard
          icon={AlertCircle}
          label="Unpaid"
          value={pending}
          color="amber"
        />
      </div>

      {/* New Booking Requests Section (Premium visibility) */}
      {requested.length > 0 && (
        <div className="mb-8 bg-brand-gold/[0.03] border border-brand-gold/10 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-brand-teal flex items-center gap-2">
              <CalendarPlus className="w-5 h-5 text-brand-gold" />
              New Booking Requests
            </h2>
            <Link href="/frontdesk/appointments/requested" className="text-xs font-bold text-brand-gold hover:underline">
              View All Requests →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {requested.slice(0, 3).map(apt => (
              <div key={apt.id} className="bg-white border border-brand-gold/20 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-bold text-brand-teal truncate pr-2">
                    {getFullName(apt.patient?.firstName || '', apt.patient?.lastName || '')}
                  </p>
                  <span className="bg-brand-gold/10 text-brand-gold text-[10px] font-bold px-2 py-0.5 rounded uppercase">New</span>
                </div>
                <p className="text-xs text-brand-teal/60 mb-3 italic truncate">"{apt.reason || 'No reason provided'}"</p>
                <div className="flex items-center justify-between mt-auto">
                  <p className="text-[10px] text-brand-teal/40 font-medium">{format(new Date((apt as any).createdAt), 'MMM d, h:mm a')}</p>
                  <Link
                    href={`/frontdesk/appointments/book?requestId=${apt.id}`}
                    className="text-[10px] font-bold bg-brand-teal text-white px-3 py-1.5 rounded-lg hover:bg-brand-teal/90 transition-colors"
                  >
                    Schedule Now
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Current & Upcoming (7 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-white/50 p-6">
            <h2 className="text-lg font-bold text-brand-teal mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Active & Immediate Appointments
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-brand-teal/40 uppercase tracking-wider mb-2">Happening Now</p>
                {loadingToday ? (
                  <p className="text-brand-teal/40 text-sm">Loading...</p>
                ) : current.length > 0 ? (
                  <div className="space-y-3">
                    {current.map(apt => (
                      <AppointmentCard key={apt.id} appointment={apt} />
                    ))}
                  </div>
                ) : (
                  <p className="text-brand-teal/40 text-xs italic">No current appointments</p>
                )}
              </div>
              <div className="space-y-3 border-l pl-4 border-brand-teal/5">
                <p className="text-[10px] font-bold text-brand-teal/40 uppercase tracking-wider mb-2">Upcoming Today</p>
                {loadingToday ? (
                  <p className="text-brand-teal/40 text-sm">Loading...</p>
                ) : upcoming.length > 0 ? (
                  <div className="space-y-3">
                    {upcoming.slice(0, 3).map(apt => (
                      <AppointmentCard key={apt.id} appointment={apt} />
                    ))}
                  </div>
                ) : (
                  <p className="text-brand-teal/40 text-xs italic">No more appointments today</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-white/50 p-6">
            <h2 className="text-lg font-bold text-brand-teal mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Patient Queue (Checked-In)
            </h2>
            {checkedIn > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {appointments
                  .filter(apt => apt.status === 'CHECKED_IN')
                  .map(apt => (
                    <AppointmentCard key={apt.id} appointment={apt} showStatus />
                  ))}
              </div>
            ) : (
              <p className="text-brand-teal/40 text-sm italic py-4 text-center border-2 border-dashed border-brand-teal/5 rounded-xl">No patients in the queue</p>
            )}
          </div>
        </div>

        {/* Status Panels (5 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <h2 className="text-lg font-bold text-brand-teal mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Pending Payments
          </h2>
          {pending > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {unconfirmed.slice(0, 5).map(apt => (
                <AppointmentCard key={apt.id} appointment={apt} showStatus />
              ))}
            </div>
          ) : (
            <p className="text-brand-teal/40 text-sm italic">No pending payments</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  icon: any;
  label: string;
  value: number;
  color: 'blue' | 'purple' | 'green' | 'amber';
  highlight?: boolean;
}

function StatCard({ icon: Icon, label, value, color, highlight = false }: StatCardProps) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  return (
    <div className={`bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border p-6 transition-all ${highlight ? 'ring-2 ring-brand-gold ring-offset-2 border-brand-gold/30' : 'border-white/50'
      }`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-brand-teal/40 uppercase tracking-wider mb-1">
            {label}
          </p>
          <p className="text-3xl font-bold text-brand-teal">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

// Quick Action Component
interface QuickActionProps {
  icon: any;
  label: string;
  href: string;
  color: 'teal' | 'blue' | 'purple' | 'green';
}

function QuickAction({ icon: Icon, label, href, color }: QuickActionProps) {
  const colorClasses: Record<string, string> = {
    teal: 'bg-brand-teal hover:bg-brand-teal-dark',
    blue: 'bg-blue-600 hover:bg-blue-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
    green: 'bg-green-600 hover:bg-green-700',
  };

  return (
    <Link
      href={href}
      className={`${colorClasses[color]} text-white rounded-xl p-4 flex items-center gap-3 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-bold text-sm">{label}</span>
    </Link>
  );
}

// Appointment Card Component
function AppointmentCard({ appointment, showStatus = false }: { appointment: any; showStatus?: boolean }) {
  const patientName = getFullName(
    appointment.patient?.firstName || '',
    appointment.patient?.lastName || ''
  );
  const doctorName = getFullName(
    appointment.doctor?.firstName || 'Dr.',
    appointment.doctor?.lastName || ''
  );

  return (
    <div className="p-3 rounded-lg border border-brand-teal/10 hover:border-brand-teal/30 hover:bg-brand-teal/[0.02] transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-brand-teal text-sm truncate">{patientName}</p>
          <p className="text-xs text-brand-teal/60 mt-0.5">{doctorName}</p>
          <p className="text-xs text-brand-teal/40 mt-1">
            {appointment.scheduledStartTime
              ? `${format(new Date(appointment.scheduledStartTime), 'HH:mm')} - ${appointment.appointmentType}`
              : appointment.appointmentType
            }
          </p>
        </div>
        {showStatus && (
          <span className="px-2 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
            {appointment.status.replace(/_/g, ' ')}
          </span>
        )}
      </div>
    </div>
  );
}
