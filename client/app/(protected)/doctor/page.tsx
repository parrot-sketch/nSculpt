'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Calendar,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Activity,
  Stethoscope,
  Scissors,
  FileText,
} from 'lucide-react';
import { doctorService } from '@/services/doctor.service';
import DoctorConfirmations from './components/DoctorConfirmations';

interface DashboardStats {
  totalPatients: number;
  pendingConsultations: number;
  upcomingSurgeries: number;
  pendingConsents: number;
}

export default function DoctorDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If loading, wait
    if (isLoading) return;

    // If not authenticated, redirect
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // If authenticated and user exists, fetch stats
    if (user) {
      fetchDashboardStats();
    }
  }, [isAuthenticated, isLoading, user, router]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const data = await doctorService.getDashboardStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Doctor Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Manage your patients, consultations, and surgical cases
        </p>
      </div>

      {/* NEW: Clinical Coordination Widget */}
      <DoctorConfirmations />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Patients"
          value={stats?.totalPatients || 0}
          icon={Users}
          color="blue"
          href="/doctor/patients"
        />
        <StatCard
          title="Pending Consultations"
          value={stats?.pendingConsultations || 0}
          icon={Calendar}
          color="orange"
          href="/doctor/consultations"
        />
        <StatCard
          title="Upcoming Surgeries"
          value={stats?.upcomingSurgeries || 0}
          icon={Scissors}
          color="purple"
          href="/doctor/surgeries"
        />
        <StatCard
          title="Pending Consents"
          value={stats?.pendingConsents || 0}
          icon={FileText}
          color="red"
          href="/doctor/consents"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickActionButton
            href="/doctor/consultations/new"
            icon={Stethoscope}
            label="New Consultation"
            description="Start a new patient consultation"
          />
          <QuickActionButton
            href="/doctor/procedure-plans/new"
            icon={FileText}
            label="Create Procedure Plan"
            description="Create a treatment plan and quotation"
          />
          <QuickActionButton
            href="/doctor/theater/book"
            icon={Scissors}
            label="Book Theater"
            description="Book a theater slot for surgery"
          />
        </div>
      </div>

      {/* Workflow Guide */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Consultation to Surgery Workflow
        </h2>
        <div className="flex flex-wrap gap-4 items-center text-sm">
          <WorkflowStep step={1} label="Consultation" icon={Stethoscope} />
          <div className="text-gray-400">→</div>
          <WorkflowStep step={2} label="Procedure Plan" icon={FileText} />
          <div className="text-gray-400">→</div>
          <WorkflowStep step={3} label="Deposit Payment" icon={DollarSign} />
          <div className="text-gray-400">→</div>
          <WorkflowStep step={4} label="Theater Booking" icon={Scissors} />
          <div className="text-gray-400">→</div>
          <WorkflowStep step={5} label="Surgery" icon={CheckCircle2} />
        </div>
        <p className="text-sm text-gray-600 mt-4">
          <AlertCircle className="w-4 h-4 inline mr-1" />
          Theater bookings require deposit payment confirmation. Bookings start as PENDING until payment is verified.
        </p>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentConsultations />
        <UpcomingSurgeries />
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: 'blue' | 'orange' | 'purple' | 'red' | 'green';
  href: string;
}

function StatCard({ title, value, icon: Icon, color, href }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    orange: 'bg-orange-100 text-orange-600',
    purple: 'bg-purple-100 text-purple-600',
    red: 'bg-red-100 text-red-600',
    green: 'bg-green-100 text-green-600',
  };

  return (
    <Link href={href}>
      <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm mb-1">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </div>
    </Link>
  );
}

interface QuickActionButtonProps {
  href: string;
  icon: React.ElementType;
  label: string;
  description: string;
}

function QuickActionButton({
  href,
  icon: Icon,
  label,
  description,
}: QuickActionButtonProps) {
  return (
    <Link href={href}>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
        <div className="flex items-center gap-3 mb-2">
          <Icon className="w-5 h-5 text-primary" />
          <span className="font-semibold text-gray-900">{label}</span>
        </div>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </Link>
  );
}

interface WorkflowStepProps {
  step: number;
  label: string;
  icon: React.ElementType;
}

function WorkflowStep({ step, label, icon: Icon }: WorkflowStepProps) {
  return (
    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm">
      <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold">
        {step}
      </div>
      <Icon className="w-4 h-4 text-gray-600" />
      <span className="font-medium text-gray-700">{label}</span>
    </div>
  );
}

function RecentConsultations() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Recent Consultations</h3>
      <div className="space-y-3">
        <p className="text-gray-500 text-sm">No recent consultations</p>
        <Link
          href="/doctor/consultations"
          className="text-primary hover:underline text-sm"
        >
          View all consultations →
        </Link>
      </div>
    </div>
  );
}

function UpcomingSurgeries() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Upcoming Surgeries</h3>
      <div className="space-y-3">
        <p className="text-gray-500 text-sm">No upcoming surgeries</p>
        <Link
          href="/doctor/surgeries"
          className="text-primary hover:underline text-sm"
        >
          View all surgeries →
        </Link>
      </div>
    </div>
  );
}

