import React from 'react';
import { StatWidget } from './StatWidget';
import { Calendar, CheckCircle2, CreditCard, AlertCircle } from 'lucide-react';

interface DashboardStatsProps {
    stats: {
        appointmentsCount: number;
        checkedInCount: number;
        pendingBillsCount: number;
        lowStockItemsCount: number;
    };
}

export function DashboardStats({ stats }: DashboardStatsProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <StatWidget
                label="Appointments Today"
                value={stats.appointmentsCount}
                icon={<Calendar className="w-5 h-5 text-brand-teal" />}
                trend="Daily scheduled"
            />
            <StatWidget
                label="Checked In"
                value={stats.checkedInCount}
                icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                trend="Patients waiting"
            />
            <StatWidget
                label="Pending Bills"
                value={stats.pendingBillsCount}
                icon={<CreditCard className="w-5 h-5 text-amber-600" />}
                trend="Need attention"
            />
            <StatWidget
                label="Low Stock"
                value={stats.lowStockItemsCount}
                icon={<AlertCircle className="w-5 h-5 text-rose-600" />}
                trend="Items to reorder"
            />
        </div>
    );
}
