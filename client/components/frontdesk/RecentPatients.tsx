import React from 'react';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { getFullName } from '@/lib/utils';

interface RecentPatientsProps {
    patients: any[];
}

export function RecentPatients({ patients }: RecentPatientsProps) {
    return (
        <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-white/50 overflow-hidden">
            <div className="p-6 border-b border-brand-teal/5 flex justify-between items-center bg-white/40">
                <h2 className="text-xl font-bold text-brand-teal font-serif flex items-center gap-3">
                    <Users className="w-6 h-6 text-brand-gold" /> Recent Patients
                </h2>
                <Link href="/frontdesk/patients" className="text-sm font-bold text-brand-gold hover:text-brand-gold-dark transition-colors">View All</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                {patients.slice(0, 4).map(patient => (
                    <Link key={patient.id} href={`/frontdesk/patients/${patient.id}`} className="flex items-start gap-4 p-4 rounded-xl bg-white/50 border border-white hover:bg-white hover:shadow-md hover:border-brand-gold/20 transition-all duration-300 transform hover:-translate-y-0.5 group">
                        <div className="w-12 h-12 rounded-xl bg-brand-teal/5 flex items-center justify-center text-brand-teal font-black text-sm group-hover:bg-brand-gold group-hover:text-white transition-colors">
                            {patient.firstName[0]}{patient.lastName[0]}
                        </div>
                        <div>
                            <p className="font-bold text-brand-teal text-sm leading-tight group-hover:text-brand-gold transition-colors">{getFullName(patient.firstName, patient.lastName)}</p>
                            <p className="text-[10px] font-black text-brand-teal/30 uppercase tracking-widest mt-1">{patient.fileNumber || patient.patientNumber || 'No MRN'}</p>
                        </div>
                    </Link>
                ))}
                {!patients.length && (
                    <div className="col-span-2 text-center py-8 text-brand-teal/30 text-sm font-medium italic">No recent patients</div>
                )}
            </div>
        </div>
    );
}
