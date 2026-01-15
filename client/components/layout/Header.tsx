'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getFullName } from '@/lib/utils';
import { User, LogOut, Settings, Search, Phone, MessageSquare } from 'lucide-react';
import { NotificationDropdown } from '../notifications/NotificationDropdown';

export function Header() {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return 'U';
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      ADMIN: 'bg-rose-50 text-rose-700 border-rose-200',
      DOCTOR: 'bg-blue-50 text-blue-700 border-blue-200',
      SURGEON: 'bg-purple-50 text-purple-700 border-purple-200',
      NURSE: 'bg-green-50 text-green-700 border-green-200',
      FRONT_DESK: 'bg-amber-50 text-amber-700 border-amber-200',
      THEATER_MANAGER: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      INVENTORY_MANAGER: 'bg-teal-50 text-teal-700 border-teal-200',
      BILLING: 'bg-orange-50 text-orange-700 border-orange-200',
    };
    return colors[role] || 'bg-neutral-50 text-neutral-700 border-neutral-200';
  };

  const formatRoleName = (role: string) => {
    return role.split('_').map(word =>
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
  };

  return (
    <header className="bg-transparent h-20 flex items-center px-8 flex-shrink-0">
      <div className="flex-1 flex items-center justify-between">

        {/* Search Bar - Center Aligned */}
        <div className="max-w-md w-full relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-neutral-400 group-focus-within:text-brand-gold transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search patients, appointments..."
            className="block w-full h-11 bg-white border border-neutral-200 rounded-full pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold transition-all shadow-sm"
          />
        </div>

        {/* Action Icons & User Profile */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 text-neutral-400">
            <NotificationDropdown />
            <button className="p-2.5 hover:bg-white hover:text-brand-teal rounded-xl transition-all shadow-sm hover:shadow-md">
              <Phone className="h-5 w-5" />
            </button>
            <button className="p-2.5 hover:bg-white hover:text-brand-teal rounded-xl transition-all shadow-sm hover:shadow-md">
              <MessageSquare className="h-5 w-5" />
            </button>
          </div>

          <div className="h-8 w-px bg-neutral-200 mx-2" />

          {user && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-3 transition-all rounded-full p-1 hover:bg-white"
              >
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-bold text-brand-teal leading-tight">
                    {user.firstName && user.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user.email?.split('@')[0]}
                  </div>
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">
                    {user.roles?.[0]?.replace('_', ' ') || 'Front Desk'}
                  </div>
                </div>

                <div className="w-10 h-10 rounded-xl bg-brand-teal flex items-center justify-center text-white font-bold text-sm shadow-sm border-2 border-white overflow-hidden">
                  {user.firstName?.[0] || 'U'}
                </div>
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-neutral-200 overflow-hidden">

                  {/* User Info Section */}
                  <div className="p-4 bg-neutral-50 border-b border-neutral-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                        {getInitials(user.firstName, user.lastName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-spaceCadet truncate">
                          {user.firstName && user.lastName
                            ? getFullName(user.firstName, user.lastName)
                            : 'User'}
                        </div>
                        <div className="text-xs text-neutral-600 truncate">{user.email}</div>
                      </div>
                    </div>

                    {/* Role Badges */}
                    {user.roles && user.roles.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {user.roles.map((role) => (
                          <span
                            key={role}
                            className={`px-2 py-0.5 text-xs font-medium rounded border ${getRoleBadgeColor(role)}`}
                          >
                            {formatRoleName(role)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Menu Items */}
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        // Navigate to profile/settings
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 rounded-md transition-colors"
                    >
                      <User className="w-4 h-4 text-neutral-500" />
                      <span className="font-medium">My Profile</span>
                    </button>

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        // Navigate to settings
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 rounded-md transition-colors"
                    >
                      <Settings className="w-4 h-4 text-neutral-500" />
                      <span className="font-medium">Settings</span>
                    </button>

                    <div className="my-2 border-t border-neutral-100" />

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="font-medium">Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
