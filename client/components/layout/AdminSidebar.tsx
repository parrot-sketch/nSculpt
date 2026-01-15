'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';
import {
  LayoutDashboard,
  Users,
  Shield,
  Key,
  Building2,
  DoorOpen,
  Package,
  Store,
  DollarSign,
  Building,
  FileText,
  ClipboardList,
  ShieldCheck,
  Activity,
  UserCheck,
  Merge,
  Heart,
  BarChart3,
  TrendingUp,
  Settings,
  ChevronDown,
  FileCheck,
  UserCircle,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
  collapsible?: boolean;
  defaultOpen?: boolean;
}

const adminNavSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      {
        label: 'Dashboard',
        href: ROUTES.ADMIN_DASHBOARD,
        icon: LayoutDashboard,
        description: 'System overview and statistics',
      },
    ],
  },
  {
    title: 'User Management',
    items: [
      {
        label: 'Users',
        href: ROUTES.ADMIN_USERS,
        icon: Users,
        description: 'Manage system users',
      },
      {
        label: 'Roles',
        href: ROUTES.ADMIN_ROLES,
        icon: Shield,
        description: 'Manage roles and permissions',
      },
      {
        label: 'Permissions',
        href: ROUTES.ADMIN_PERMISSIONS,
        icon: Key,
        description: 'View and manage permissions',
      },
    ],
  },
  {
    title: 'Patient Management',
    items: [
      {
        label: 'Patients',
        href: '/admin/patients',
        icon: UserCircle,
        description: 'Manage patients and medical records',
      },
    ],
  },
  {
    title: 'System Configuration',
    collapsible: true,
    defaultOpen: true,
    items: [
      {
        label: 'Departments',
        href: ROUTES.ADMIN_DEPARTMENTS,
        icon: Building2,
        description: 'Manage departments',
      },
      {
        label: 'Operating Theaters',
        href: ROUTES.ADMIN_THEATERS,
        icon: DoorOpen,
        description: 'Manage operating theaters',
      },
      {
        label: 'Inventory Categories',
        href: ROUTES.ADMIN_CATEGORIES,
        icon: Package,
        description: 'Manage inventory categories',
      },
      {
        label: 'Vendors',
        href: ROUTES.ADMIN_VENDORS,
        icon: Store,
        description: 'Manage vendors',
      },
      {
        label: 'Billing Codes',
        href: ROUTES.ADMIN_BILLING_CODES,
        icon: DollarSign,
        description: 'Manage billing codes',
      },
      {
        label: 'Insurance Providers',
        href: ROUTES.ADMIN_INSURANCE_PROVIDERS,
        icon: Building,
        description: 'Manage insurance providers',
      },
      {
        label: 'Fee Schedules',
        href: ROUTES.ADMIN_FEE_SCHEDULES,
        icon: FileText,
        description: 'Manage fee schedules',
      },
      {
        label: 'Consent Templates',
        href: ROUTES.ADMIN_CONSENT_TEMPLATES,
        icon: FileCheck,
        description: 'Manage consent form templates',
      },
    ],
  },
  {
    title: 'Audit & Compliance',
    collapsible: true,
    defaultOpen: false,
    items: [
      {
        label: 'Access Logs',
        href: ROUTES.ADMIN_ACCESS_LOGS,
        icon: ClipboardList,
        description: 'View data access logs',
      },
      {
        label: 'Domain Events',
        href: ROUTES.ADMIN_DOMAIN_EVENTS,
        icon: Activity,
        description: 'View domain events',
      },
      {
        label: 'Sessions',
        href: ROUTES.ADMIN_SESSIONS,
        icon: UserCheck,
        description: 'Manage user sessions',
      },
      {
        label: 'HIPAA Reports',
        href: ROUTES.ADMIN_HIPAA_REPORTS,
        icon: ShieldCheck,
        description: 'Generate HIPAA reports',
      },
    ],
  },
  {
    title: 'Cross-Domain',
    items: [
      {
        label: 'Merge Records',
        href: ROUTES.ADMIN_MERGE_RECORDS,
        icon: Merge,
        description: 'Merge medical records',
      },
      {
        label: 'System Health',
        href: ROUTES.ADMIN_SYSTEM_HEALTH,
        icon: Heart,
        description: 'View system health metrics',
      },
    ],
  },
  {
    title: 'Reports',
    collapsible: true,
    defaultOpen: false,
    items: [
      {
        label: 'User Activity',
        href: ROUTES.ADMIN_USER_ACTIVITY_REPORT,
        icon: BarChart3,
        description: 'User activity reports',
      },
      {
        label: 'Permission Usage',
        href: ROUTES.ADMIN_PERMISSION_USAGE_REPORT,
        icon: TrendingUp,
        description: 'Permission usage reports',
      },
    ],
  },
];

/**
 * Admin Sidebar
 * 
 * Modern, collapsible sidebar navigation with icons from Lucide React.
 * Supports complex layouts with collapsible sections.
 */
export function AdminSidebar() {
  const pathname = usePathname();
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(
      adminNavSections
        .filter((section) => section.defaultOpen)
        .map((section) => section.title)
    )
  );

  const toggleSection = (title: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  const isSectionOpen = (title: string) => openSections.has(title);

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

      <div className="px-6 mb-6">
        <div className="h-px bg-white/10 w-full" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 space-y-6 pb-8 custom-scrollbar">
        {adminNavSections.map((section) => {
          const isOpen = isSectionOpen(section.title);
          const hasActiveItem = section.items.some(
            (item) => pathname === item.href || pathname?.startsWith(`${item.href}/`)
          );

          return (
            <div key={section.title} className="space-y-2">
              <button
                onClick={() => toggleSection(section.title)}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-1 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors',
                  isOpen || hasActiveItem ? 'text-brand-gold' : 'text-white/30 hover:text-white/60'
                )}
              >
                <span>{section.title}</span>
                {section.collapsible && (
                  <ChevronDown className={cn("h-3 w-3 transition-transform duration-300", isOpen ? "rotate-0" : "-rotate-90")} />
                )}
              </button>

              {(isOpen || !section.collapsible) && (
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive =
                      pathname === item.href || pathname?.startsWith(`${item.href}/`);
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
                        title={item.description}
                      >
                        {/* Active Indicator Bar */}
                        {isActive && (
                          <div className="absolute left-0 top-3 bottom-3 w-1 bg-brand-gold rounded-r-full shadow-glow-gold" />
                        )}

                        <Icon
                          className={cn(
                            'h-4.5 w-4.5 transition-transform duration-300 group-hover:scale-110',
                            isActive ? 'text-brand-gold' : 'text-white/40 group-hover:text-white/80'
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto px-2 py-0.5 text-[10px] font-bold rounded-full bg-brand-gold text-brand-teal shadow-sm">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer action */}
      <div className="p-6 border-t border-white/5">
        <Link
          href={ROUTES.SETTINGS}
          className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all"
        >
          <Settings className="h-4.5 w-4.5 text-white/30" />
          <span>System Settings</span>
        </Link>
      </div>
    </aside>
  );
}
