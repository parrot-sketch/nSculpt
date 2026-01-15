'use client';

import { useAuth } from '@/hooks/useAuth';
import { getFullName } from '@/lib/utils';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-3xl font-semibold text-neutral-900 mb-6">Settings</h1>

      <div className="bg-white rounded-lg border border-neutral-200 shadow-soft p-6">
        <h2 className="text-xl font-semibold text-neutral-900 mb-4">Profile</h2>
        {user && (
          <div className="space-y-2">
            <div>
              <span className="text-sm font-medium text-neutral-600">Name:</span>
              <span className="ml-2 text-neutral-900">
                {getFullName(user.firstName, user.lastName)}
              </span>
            </div>
            <div>
              <span className="text-sm font-medium text-neutral-600">Email:</span>
              <span className="ml-2 text-neutral-900">{user.email}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-neutral-600">Roles:</span>
              <span className="ml-2 text-neutral-900">{user.roles.join(', ')}</span>
            </div>
            {user.employeeId && (
              <div>
                <span className="text-sm font-medium text-neutral-600">Employee ID:</span>
                <span className="ml-2 text-neutral-900">{user.employeeId}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}












