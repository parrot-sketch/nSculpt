import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface QuickNavLinkProps {
    href: string;
    icon: React.ReactNode;
    label: string;
}

export function QuickNavLink({ href, icon, label }: QuickNavLinkProps) {
    return (
        <Link href={href} className="flex items-center gap-4 p-4 rounded-xl bg-white/40 border border-transparent hover:bg-white hover:border-white hover:shadow-sm transition-all duration-300 group">
            <div className="p-2 rounded-lg bg-brand-teal/5 text-brand-teal group-hover:bg-brand-gold group-hover:text-white transition-all transform group-hover:scale-110">
                {icon}
            </div>
            <span className="font-bold text-brand-teal text-sm group-hover:translate-x-1 transition-transform">{label}</span>
            <ChevronRight className="w-4 h-4 text-brand-teal/20 ml-auto group-hover:text-brand-gold transition-colors" />
        </Link>
    );
}
