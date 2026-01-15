'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { patientService } from '@/services/patient.service';
import { Search, User, UserPlus, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BookingState, BookingMode } from '../BookingWizard';

interface PatientStepProps {
    state: BookingState;
    updateState: (updates: Partial<BookingState>) => void;
    onNext: () => void;
}

export function PatientStep({ state, updateState, onNext }: PatientStepProps) {
    const [searchTerm, setSearchTerm] = useState('');

    // Mode Selection Tabs
    const modes: { id: BookingMode; label: string; icon: any }[] = [
        { id: 'existing', label: 'Existing Patient', icon: User },
        { id: 'new', label: 'New Patient', icon: UserPlus },
        { id: 'procedure', label: 'From Plan', icon: FileText },
    ];

    return (
        <div className="space-y-8">
            {/* Mode Selector */}
            <div className="flex p-1 bg-brand-teal/5 rounded-xl">
                {modes.map((mode) => {
                    const Icon = mode.icon;
                    const isActive = state.mode === mode.id;
                    return (
                        <button
                            key={mode.id}
                            onClick={() => updateState({ mode: mode.id, patient: null })}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg transition-all",
                                isActive
                                    ? "bg-white text-brand-teal shadow-sm"
                                    : "text-brand-teal/60 hover:text-brand-teal hover:bg-brand-teal/5"
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            {mode.label}
                        </button>
                    );
                })}
            </div>

            {/* Content based on Mode */}
            {state.mode === 'existing' && (
                <ExistingPatientSearch
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    selectedPatient={state.patient}
                    onSelect={(patient) => updateState({ patient })}
                />
            )}

            {state.mode === 'new' && (
                <NewPatientForm
                    updateState={updateState}
                    onNext={onNext}
                />
            )}

            {state.mode === 'procedure' && (
                <div className="text-center py-12 bg-brand-teal/5 rounded-2xl border border-brand-teal/10">
                    <FileText className="w-12 h-12 text-brand-teal/40 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-brand-teal">Select from Plan Queue</h3>
                    <p className="text-brand-teal/60 max-w-md mx-auto mt-2">
                        To schedule from a plan, please use the <strong>Scheduling</strong> tab on the sidebar.
                        This wizard is for direct bookings.
                    </p>
                </div>
            )}
        </div>
    );
}

function ExistingPatientSearch({ searchTerm, setSearchTerm, selectedPatient, onSelect }: {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    selectedPatient: any;
    onSelect: (p: any) => void;
}) {
    const { data: patients } = useQuery({
        queryKey: ['patients', 'search', searchTerm],
        queryFn: () => patientService.getPatients(0, 20, searchTerm),
        enabled: searchTerm.length > 2,
    });

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-teal/40" />
                <input
                    type="text"
                    className="w-full pl-12 pr-4 py-4 bg-white border border-brand-teal/20 rounded-xl focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition-all text-lg"
                    placeholder="Search patient by name, phone, or MRN..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                />
            </div>

            {!selectedPatient && searchTerm.length > 2 && patients?.data && (
                <div className="bg-white rounded-xl shadow-lg border border-brand-teal/10 overflow-hidden divide-y divide-brand-teal/5">
                    {patients.data.length === 0 ? (
                        <div className="p-4 text-center text-brand-teal/60">No patients found.</div>
                    ) : (
                        patients.data.map((p: any) => (
                            <button
                                key={p.id}
                                onClick={() => onSelect(p)}
                                className="w-full px-6 py-4 text-left hover:bg-brand-teal/5 flex items-center justify-between group transition-colors"
                            >
                                <div>
                                    <p className="font-bold text-brand-teal text-lg">{p.firstName} {p.lastName}</p>
                                    <p className="text-sm text-brand-teal/60 flex gap-4">
                                        <span>{p.phone || 'No phone'}</span>
                                        <span>•</span>
                                        <span>{p.patientNumber}</span>
                                    </p>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-brand-teal/5 flex items-center justify-center text-brand-teal opacity-0 group-hover:opacity-100 transition-opacity">
                                    <User className="w-4 h-4" />
                                </div>
                            </button>
                        ))
                    )}
                </div>
            )}

            {selectedPatient && (
                <div className="bg-brand-teal/5 border border-brand-teal/20 rounded-xl p-6 flex items-center justify-between animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-brand-teal text-white flex items-center justify-center shadow-lg">
                            <span className="font-bold text-lg">{selectedPatient.firstName[0]}{selectedPatient.lastName[0]}</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-brand-teal">{selectedPatient.firstName} {selectedPatient.lastName}</h3>
                            <p className="text-brand-teal/60">{selectedPatient.patientNumber} • {selectedPatient.phone}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => onSelect(null)}
                        className="text-sm font-bold text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-1 rounded-lg transition-colors"
                    >
                        Change
                    </button>
                </div>
            )}
        </div>
    );
}

function NewPatientForm({ updateState, onNext }: any) {
    const handleSubmit = (e: any) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const newPatient = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            isNew: true // Flag to identify this needs creation later or we create now? 
            // For now we'll store in state and create at end, OR create now.
            // Ideally create now to get ID? But that creates junk data if abandoned.
            // Let's keep it in state and create at submission.
        };
        updateState({ patient: newPatient });
        onNext();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-teal uppercase">First Name</label>
                    <input name="firstName" required className="w-full px-4 py-3 bg-white border border-brand-teal/20 rounded-xl focus:border-brand-teal" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-teal uppercase">Last Name</label>
                    <input name="lastName" required className="w-full px-4 py-3 bg-white border border-brand-teal/20 rounded-xl focus:border-brand-teal" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-teal uppercase">Email</label>
                    <input name="email" type="email" required className="w-full px-4 py-3 bg-white border border-brand-teal/20 rounded-xl focus:border-brand-teal" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-teal uppercase">Phone</label>
                    <input name="phone" required className="w-full px-4 py-3 bg-white border border-brand-teal/20 rounded-xl focus:border-brand-teal" />
                </div>
            </div>

            <div className="pt-4">
                <button type="submit" className="w-full py-4 bg-brand-teal text-white font-bold rounded-xl shadow-lg hover:bg-brand-teal/90 transition-all">
                    Continue with New Patient
                </button>
            </div>
        </form>
    );
}
