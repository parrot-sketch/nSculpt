'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';
import {
    LayoutDashboard,
    ClipboardList,
    Stethoscope,
    HeartPulse,
    Activity
} from 'lucide-react';

const navItems = [
    {
        label: 'Dashboard',
        href: ROUTES.NURSING_DASHBOARD,
        icon: LayoutDashboard,
    },
    {
        label: 'Patient Vitals',
        href: '/nursing/vitals',
        icon: HeartPulse,
    },
    {
        label: 'Tasks',
        href: '/nursing/tasks',
        icon: ClipboardList,
    },
    {
        label: 'Encounters',
        href: '/encounters',
        icon: Stethoscope,
    },
];

export function NursingSidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-72 bg-brand-teal h-full flex flex-col shadow-2xl relative z-20">
            {/* Sidebar Header with Logo */}
            <div className="p-8 mb-4">
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

            {/* Navigation items */}
            <nav className="flex-1 px-4 space-y-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'relative flex items-center gap-4 px-5 py-4 text-sm font-semibold rounded-xl transition-all duration-300 group overflow-hidden',
                                isActive
                                    ? 'bg-white/10 text-brand-gold'
                                    : 'text-white/60 hover:text-white hover:bg-white/5'
                            )}
                        >
                            {/* Active Indicator Bar */}
                            {isActive && (
                                <div className="absolute left-0 top-3 bottom-3 w-1 bg-brand-gold rounded-r-full shadow-glow-gold" />
                            )}

                            <Icon
                                className={cn(
                                    'h-5 w-5 transition-transform duration-300 group-hover:scale-110',
                                    isActive ? 'text-brand-gold' : 'text-white/40 group-hover:text-white/80'
                                )}
                            />
                            <span className="tracking-wide">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Section - Action */}
            <div className="p-6 border-t border-white/5">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                    <p className="text-[10px] uppercase font-bold text-white/40 tracking-[0.2em] mb-2">Internal Tools</p>
                    <button className="w-full text-left flex items-center gap-3 text-sm font-medium text-white/60 hover:text-white transition-colors">
                        <div className="p-2 bg-brand-gold/10 rounded-lg">
                            <Activity className="h-4 w-4 text-brand-gold" />
                        </div>
                        <span>Shift Handover</span>
                    </button>
                </div>
            </div>
        </aside>
    );
}
