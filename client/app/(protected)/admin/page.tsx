'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Users, UserCheck, Shield, Key } from 'lucide-react';
import { adminService } from '@/services/admin.service';
import { StatCard } from '@/components/cards/StatCard';
import { Card } from '@/components/layout/Card';
import { ResponsiveGrid } from '@/components/layout/ResponsiveGrid';
import type { AdminDashboardStats } from '@/types/admin';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

/**
 * Admin Dashboard
 * 
 * Overview page showing system statistics and key metrics.
 */
export default function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  
  const { data: stats, isLoading, error } = useQuery<AdminDashboardStats>({
    queryKey: ['admin', 'dashboard', 'stats'],
    queryFn: () => adminService.getDashboardStats(),
    // Only run query when user is authenticated
    enabled: isAuthenticated && !isAuthLoading,
    // Don't auto-refresh - let user manually refresh if needed
    refetchInterval: false,
    retry: 2, // Retry twice on failure
    retryDelay: 1000,
  });

  // Default values for graceful degradation
  const displayStats: AdminDashboardStats = stats || {
    totalUsers: 0,
    activeUsers: 0,
    totalRoles: 0,
    activeRoles: 0,
    totalPermissions: 0,
    recentActivity: [],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Admin Dashboard</h1>
        <p className="mt-2 text-sm sm:text-base text-neutral-600">
          System overview and administration
        </p>
      </div>

      {/* Error Banner (non-blocking) */}
      {error && (
        <Card padding="sm" className="bg-yellow-50 border-yellow-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Unable to refresh dashboard data
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Showing cached data. The page will refresh automatically.
                </p>
              </div>
            </div>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard', 'stats'] })}
              className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
            >
              Retry
            </button>
          </div>
        </Card>
      )}

      {/* Statistics Cards */}
      {isLoading ? (
        <ResponsiveGrid columns={{ mobile: 1, tablet: 2, desktop: 4 }} gap="md">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} padding="md">
              <div className="animate-pulse">
                <div className="h-4 bg-neutral-200 rounded w-24 mb-3"></div>
                <div className="h-8 bg-neutral-200 rounded w-16"></div>
              </div>
            </Card>
          ))}
        </ResponsiveGrid>
      ) : (
        <ResponsiveGrid columns={{ mobile: 1, tablet: 2, desktop: 4 }} gap="md">
          <StatCard
            title="Total Users"
            value={displayStats.totalUsers}
            icon={<Users className="h-6 w-6 text-primary" />}
          />
          <StatCard
            title="Active Users"
            value={displayStats.activeUsers}
            icon={<UserCheck className="h-6 w-6 text-primary" />}
          />
          <StatCard
            title="Roles"
            value={displayStats.totalRoles}
            icon={<Shield className="h-6 w-6 text-primary" />}
          />
          <StatCard
            title="Permissions"
            value={displayStats.totalPermissions}
            icon={<Key className="h-6 w-6 text-primary" />}
          />
        </ResponsiveGrid>
      )}

      {/* Recent Activity */}
      {displayStats.recentActivity && displayStats.recentActivity.length > 0 && (
        <Card padding="md">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">
            Recent Activity
          </h2>
          <div className="space-y-3">
            {displayStats.recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    {activity.description}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 bg-neutral-100 text-neutral-700 rounded">
                  {activity.type}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <Card padding="md">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">
          Quick Actions
        </h2>
        <ResponsiveGrid columns={{ mobile: 1, tablet: 3 }} gap="sm">
          <Link
            href="/admin/users"
            className="p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors block"
          >
            <h3 className="font-medium text-neutral-900">Manage Users</h3>
            <p className="text-sm text-neutral-600 mt-1">
              Create, update, or deactivate users
            </p>
          </Link>
          <Link
            href="/admin/system-config/departments"
            className="p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors block"
          >
            <h3 className="font-medium text-neutral-900">Configure System</h3>
            <p className="text-sm text-neutral-600 mt-1">
              Set up departments, theaters, and more
            </p>
          </Link>
          <Link
            href="/admin/roles"
            className="p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors block"
          >
            <h3 className="font-medium text-neutral-900">Manage Roles</h3>
            <p className="text-sm text-neutral-600 mt-1">
              Configure roles and permissions
            </p>
          </Link>
          <Link
            href="/admin/patients"
            className="p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors block"
          >
            <h3 className="font-medium text-neutral-900">Manage Patients</h3>
            <p className="text-sm text-neutral-600 mt-1">
              View, merge, restrict, and archive patients
            </p>
          </Link>
        </ResponsiveGrid>
      </Card>
    </div>
  );
}

