'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';
import {
  ROUTES,
  PERMISSION_DOMAINS,
  PERMISSION_ACTIONS,
  ROLES,
} from '@/lib/constants';
import { buildPermission } from '@/lib/permissions';
import {
  LayoutDashboard,
  Users,
  Activity,
  Settings,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  permission?: string;
  roles?: string[];
  section?: string;
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();

  const navSections: NavSection[] = [
    {
      items: [
        {
          label: 'Dashboard',
          href: ROUTES.DASHBOARD,
          icon: LayoutDashboard,
          section: 'main',
        },
      ],
    },
    {
      label: 'Clinical',
      items: [
        {
          label: 'Patients',
          href: ROUTES.PATIENTS,
          icon: Users,
          permission: buildPermission(PERMISSION_DOMAINS.PATIENTS, '*', PERMISSION_ACTIONS.READ),
          section: 'clinical',
        },
        {
          label: 'Procedures',
          href: '/procedures',
          icon: Activity,
          permission: buildPermission(PERMISSION_DOMAINS.THEATER, '*', PERMISSION_ACTIONS.READ),
          roles: [ROLES.SURGEON, ROLES.DOCTOR, ROLES.NURSE],
          section: 'clinical',
        },
      ],
    },
    // ... Simplified for now as it's a fallback
  ];

  const filteredSections = navSections.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (item.permission && !hasPermission(item.permission)) return false;
      if (item.roles && user) {
        if (!item.roles.some((role) => user.roles.includes(role))) return false;
      }
      return true;
    }),
  })).filter((section) => section.items.length > 0);

  return (
    <aside className="w-72 bg-brand-teal h-full flex flex-col shadow-2xl relative z-20 overflow-hidden">
      {/* Sidebar Header with Logo */}
      <div className="p-8 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-brand-gold rounded-xl flex items-center justify-center shadow-lg transform -rotate-3 hover:rotate-0 transition-transform duration-300">
            <span className="text-brand-teal font-black text-xl italic select-none">S</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-lg tracking-tight leading-none uppercase">Nairobi</h1>
            <p className="text-brand-gold font-medium text-sm tracking-widest uppercase mt-0.5">Sculpt</p>
          </div>
        </div>
      </div>

      <div className="px-6 mb-4">
        <div className="h-px bg-white/10 w-full" />
      </div>

      <nav className="flex-1 overflow-y-auto px-4 space-y-6 pb-8 custom-scrollbar">
        {filteredSections.map((section, sectionIdx) => (
          <div key={sectionIdx} className="space-y-2">
            {section.label && (
              <h3 className="px-4 text-[10px] font-bold text-brand-gold uppercase tracking-[0.2em]">
                {section.label}
              </h3>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'relative flex items-center gap-4 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-300 group overflow-hidden',
                      isActive
                        ? 'bg-white/10 text-brand-gold'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-3 bottom-3 w-1 bg-brand-gold rounded-r-full shadow-glow-gold" />
                    )}

                    {Icon && <Icon className={cn("h-4.5 w-4.5", isActive ? "text-brand-gold" : "text-white/40")} />}
                    <span className="truncate flex-1">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-6 border-t border-white/5">
        <Link
          href={ROUTES.SETTINGS}
          className="flex items-center gap-4 px-5 py-4 text-sm font-semibold text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all group"
        >
          <Settings className="h-5 w-5 text-white/20 group-hover:text-white/60 transition-colors" />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  );
}
