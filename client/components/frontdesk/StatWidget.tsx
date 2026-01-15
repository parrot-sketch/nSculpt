import React from 'react';

interface StatWidgetProps {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    trend: string;
}

export function StatWidget({ label, value, icon, trend }: StatWidgetProps) {
    return (
        <div className="bg-white/70 backdrop-blur-md p-6 rounded-2xl border border-white/50 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
                <div className="p-3 bg-white rounded-xl shadow-sm border border-brand-teal/5">
                    {icon}
                </div>
                <span className="text-[10px] font-bold text-brand-teal/30 uppercase tracking-widest">{trend}</span>
            </div>
            <div>
                <div className="text-3xl font-black text-brand-teal tracking-tight">{value}</div>
                <div className="text-[11px] font-bold text-brand-teal/50 uppercase tracking-[0.1em] mt-1">{label}</div>
            </div>
        </div>
    );
}
