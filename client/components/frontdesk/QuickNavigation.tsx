import React from 'react';
import { UserPlus, Calendar, CreditCard, Box } from 'lucide-react';
import { QuickNavLink } from './QuickNavLink';

export function QuickNavigation() {
    return (
        <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-white/50 p-6">
            <h3 className="text-[10px] font-bold text-brand-teal/40 uppercase tracking-[0.2em] mb-6">Quick Navigation</h3>
            <nav className="space-y-3">
                <QuickNavLink href="/frontdesk/patients/new" icon={<UserPlus className="w-5 h-5" />} label="Register Patient" />
                <QuickNavLink href="/frontdesk/appointments/book" icon={<Calendar className="w-5 h-5" />} label="Book Appointment" />
                <QuickNavLink href="/billing" icon={<CreditCard className="w-5 h-5" />} label="Billing Dashboard" />
                <QuickNavLink href="/inventory" icon={<Box className="w-5 h-5" />} label="Inventory" />
            </nav>
        </div>
    );
}
