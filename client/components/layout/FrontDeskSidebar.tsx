'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { frontDeskNavigation } from '@/config/frontdesk-navigation';
import { cn } from '@/lib/utils';

export function FrontDeskSidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 bg-white border-r border-brand-teal/10 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-brand-teal/10">
                <h2 className="text-xl font-bold text-brand-teal font-serif">Front Desk</h2>
                <p className="text-xs text-brand-teal/60 mt-1 font-medium">Clinic Operations</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-4">
                {frontDeskNavigation.map((section, sectionIdx) => (
                    <div key={sectionIdx} className="mb-6">
                        <h3 className="text-[10px] font-bold text-brand-teal/40 uppercase tracking-[0.2em] mb-3 px-3">
                            {section.title}
                        </h3>
                        <ul className="space-y-1">
                            {section.items.map((item, itemIdx) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                                return (
                                    <li key={itemIdx} className="relative group px-2">
                                        <Link
                                            href={item.href}
                                            className={cn(
                                                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200',
                                                isActive
                                                    ? 'bg-brand-teal/10 text-brand-teal shadow-none'
                                                    : 'text-slate-500 hover:bg-slate-50 hover:text-brand-teal'
                                            )}
                                        >
                                            <Icon className={cn(
                                                "w-4 h-4 flex-shrink-0 transition-colors",
                                                isActive ? "text-brand-teal" : "text-slate-400 group-hover:text-brand-teal"
                                            )} />
                                            <span className="flex-1">{item.label}</span>

                                            {/* Left accent border for active state */}
                                            {isActive && (
                                                <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-brand-gold rounded-full" />
                                            )}

                                            {item.badge !== undefined && item.badge > 0 && (
                                                <span className={cn(
                                                    'px-2 py-0.5 rounded-full text-[10px] font-black',
                                                    isActive
                                                        ? 'bg-brand-teal text-white'
                                                        : 'bg-slate-100 text-slate-500'
                                                )}>
                                                    {item.badge}
                                                </span>
                                            )}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100">
                <div className="flex items-center gap-3 text-slate-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">Operational Status: Online</span>
                </div>
            </div>
        </aside>
    );
}
