'use client';

import { useQuery } from '@tanstack/react-query';
import { doctorService } from '@/services/doctor.service';
import { User, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BookingState } from '../BookingWizard';

interface DoctorStepProps {
    state: BookingState;
    updateState: (updates: Partial<BookingState>) => void;
}

export function DoctorStep({ state, updateState }: DoctorStepProps) {
    const { data: doctors, isLoading } = useQuery({
        queryKey: ['doctors'],
        queryFn: () => doctorService.getAllDoctors(),
    });

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-24 bg-brand-teal/5 rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-brand-teal font-serif">Select a Doctor</h3>
                <p className="text-brand-teal/60">Choose the specialist for this appointment</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {doctors?.map((doctor) => {
                    const isSelected = state.doctor?.id === doctor.id;

                    return (
                        <button
                            key={doctor.id}
                            onClick={() => updateState({ doctor, selectedSlot: null })} // Reset slot on doctor change
                            className={cn(
                                "relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-300 text-left group",
                                isSelected
                                    ? "border-brand-teal bg-brand-teal/5 shadow-md"
                                    : "border-transparent bg-white shadow-sm hover:border-brand-teal/30 hover:shadow-md"
                            )}
                        >
                            <div className={cn(
                                "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
                                isSelected ? "bg-brand-teal text-white" : "bg-brand-teal/10 text-brand-teal group-hover:bg-brand-teal/20"
                            )}>
                                <User className="w-6 h-6" />
                            </div>

                            <div>
                                <h4 className="font-bold text-brand-teal text-lg">Dr. {doctor.firstName} {doctor.lastName}</h4>
                                <p className="text-sm text-brand-teal/60 capitalize">
                                    {doctor.department?.name.toLowerCase() || 'General Practice'}
                                </p>
                            </div>

                            {isSelected && (
                                <div className="absolute top-4 right-4 text-brand-teal">
                                    <Check className="w-5 h-5" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
