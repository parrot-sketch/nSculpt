'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { appointmentService } from '@/services/appointment.service';
import { Calendar as CalendarIcon, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays, startOfToday, isSameDay } from 'date-fns';
import { BookingState } from '../BookingWizard';

interface SlotStepProps {
    state: BookingState;
    updateState: (updates: Partial<BookingState>) => void;
}

export function SlotStep({ state, updateState }: SlotStepProps) {
    const [selectedDate, setSelectedDate] = useState<Date>(state.selectedDate || startOfToday());

    // Generate next 14 days
    const dates = Array.from({ length: 14 }, (_, i) => addDays(startOfToday(), i));

    const { data: slotsData, isLoading } = useQuery({
        queryKey: ['slots', state.doctor?.id, format(selectedDate, 'yyyy-MM-dd')],
        queryFn: () => appointmentService.getAvailableSlots(
            state.doctor.id,
            format(selectedDate, 'yyyy-MM-dd')
        ), // Doctor is guaranteed to exist by previous step check
        enabled: !!state.doctor?.id,
    });

    return (
        <div className="space-y-8">
            {/* Date Picker - Horizontal Scroll */}
            <div className="relative">
                <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                    {dates.map((date) => {
                        const isSelected = isSameDay(date, selectedDate);
                        return (
                            <button
                                key={date.toISOString()}
                                onClick={() => {
                                    setSelectedDate(date);
                                    updateState({ selectedDate: date, selectedSlot: null });
                                }}
                                className={cn(
                                    "min-w-[80px] p-3 rounded-xl flex flex-col items-center border-2 transition-all",
                                    isSelected
                                        ? "border-brand-teal bg-brand-teal text-white shadow-md"
                                        : "border-transparent bg-white hover:border-brand-teal/20 hover:bg-white/50"
                                )}
                            >
                                <span className={cn("text-xs font-bold uppercase", isSelected ? "text-brand-gold" : "text-brand-teal/60")}>
                                    {format(date, 'EEE')}
                                </span>
                                <span className="text-xl font-black">
                                    {format(date, 'd')}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Slots Grid */}
            <div className="bg-white/50 rounded-2xl p-6 min-h-[300px]">
                {isLoading ? (
                    <div className="h-full flex flex-col items-center justify-center text-brand-teal/40">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <p>Checking availability...</p>
                    </div>
                ) : !slotsData?.availableSlots?.length ? (
                    <div className="h-full flex flex-col items-center justify-center text-brand-teal/40">
                        <CalendarIcon className="w-12 h-12 mb-4 opacity-50" />
                        <p>No available slots on this date.</p>
                        <p className="text-sm">Try selecting another day.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h4 className="font-bold text-brand-teal">Available Times</h4>
                            <span className="text-xs text-brand-teal/60 bg-brand-teal/5 px-2 py-1 rounded">
                                {slotsData.availableSlots.length} slots found
                            </span>
                        </div>

                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {slotsData.availableSlots.map((slot: any) => {
                                const startTime = new Date(slot.start);
                                const isSelected = state.selectedSlot?.start === slot.start;

                                return (
                                    <button
                                        key={slot.start}
                                        onClick={() => updateState({ selectedSlot: slot, selectedDate: selectedDate })}
                                        className={cn(
                                            "py-3 px-2 rounded-lg text-sm font-bold border transition-all flex items-center justify-center gap-2",
                                            isSelected
                                                ? "bg-brand-teal text-white border-brand-teal shadow-md transform scale-105"
                                                : "bg-white text-brand-teal border-brand-teal/10 hover:border-brand-teal hover:bg-brand-teal/5"
                                        )}
                                    >
                                        <Clock className="w-3 h-3" />
                                        {format(startTime, 'HH:mm')}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-4 max-w-2xl mx-auto">
                <div>
                    <label className="block text-xs font-bold text-brand-teal mb-2 uppercase">Appointment Type</label>
                    <div className="flex gap-2">
                        {['CONSULTATION', 'PROCEDURE', 'FOLLOW_UP'].map(type => (
                            <button
                                key={type}
                                onClick={() => updateState({ appointmentType: type })}
                                className={cn(
                                    "flex-1 py-3 text-xs font-bold rounded-lg border uppercase transition-colors",
                                    state.appointmentType === type
                                        ? "bg-brand-teal text-white border-brand-teal"
                                        : "bg-white text-brand-teal/60 border-brand-teal/10 hover:border-brand-teal/30"
                                )}
                            >
                                {type.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-brand-teal mb-2 uppercase">Reason for Visit</label>
                    <textarea
                        className="w-full p-4 rounded-xl border border-brand-teal/20 bg-white focus:outline-none focus:border-brand-teal"
                        rows={2}
                        placeholder="e.g. Creating new treatment plan, check post-op status..."
                        value={state.reason}
                        onChange={(e) => updateState({ reason: e.target.value })}
                    />
                </div>
            </div>
        </div>
    );
}
