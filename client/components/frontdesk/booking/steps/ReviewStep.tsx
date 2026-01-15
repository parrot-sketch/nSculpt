'use client';

import { useMutation } from '@tanstack/react-query';
import { appointmentService } from '@/services/appointment.service';
import { useAppointmentMutations } from '@/hooks/useAppointments';
import { User, Stethoscope, Calendar, Clock, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { BookingState } from '../BookingWizard';
import { Button } from '@/components/ui/button';

interface ReviewStepProps {
    state: BookingState;
    onBack: () => void;
    onComplete: () => void;
}

export function ReviewStep({ state, onBack, onComplete }: ReviewStepProps) {
    const isNewPatient = state.mode === 'new';
    const patientName = isNewPatient
        ? `${state.patient.firstName} ${state.patient.lastName}`
        : `${state.patient.firstName} ${state.patient.lastName}`;

    const { assignSchedule } = useAppointmentMutations();

    const bookingMutation = useMutation({
        mutationFn: async () => {
            const commonData = {
                doctorId: state.doctor.id,
                scheduledDate: format(state.selectedDate!, 'yyyy-MM-dd'),
                scheduledStartTime: state.selectedSlot!.start,
                scheduledEndTime: state.selectedSlot!.end,
                appointmentType: state.appointmentType,
                reason: state.reason,
                notes: state.notes,
            };

            if (state.requestId) {
                return assignSchedule.mutateAsync({
                    id: state.requestId,
                    data: {
                        scheduledDate: commonData.scheduledDate,
                        scheduledStartTime: commonData.scheduledStartTime,
                        scheduledEndTime: commonData.scheduledEndTime,
                        estimatedDurationMinutes: 30, // Default for now
                    }
                });
            }

            if (isNewPatient) {
                return appointmentService.bookNewPatient({
                    patientData: state.patient,
                    ...commonData,
                });
            } else {
                return appointmentService.bookExistingPatient({
                    patientId: state.patient.id,
                    ...commonData,
                });
            }
        },
        onSuccess: () => {
            onComplete();
        },
        onError: (err: any) => {
            alert(`Booking Failed: ${err?.message || 'Unknown error'}`);
        }
    });

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="text-center">
                <h3 className="text-2xl font-bold text-brand-teal font-serif">Confirm Booking</h3>
                <p className="text-brand-teal/60">Review details before finalizing</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-brand-teal/10 space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-brand-teal/5 rounded-xl border border-brand-teal/10">
                        <span className="text-xs uppercase font-bold text-brand-teal/60 mb-1 block">Patient</span>
                        <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-brand-teal" />
                            <span className="font-bold text-brand-teal truncate">{patientName}</span>
                        </div>
                        {isNewPatient && <span className="text-[10px] bg-brand-gold/10 text-brand-gold px-1.5 py-0.5 rounded ml-6">NEW</span>}
                    </div>

                    <div className="p-4 bg-brand-teal/5 rounded-xl border border-brand-teal/10">
                        <span className="text-xs uppercase font-bold text-brand-teal/60 mb-1 block">Doctor</span>
                        <div className="flex items-center gap-2">
                            <Stethoscope className="w-4 h-4 text-brand-teal" />
                            <span className="font-bold text-brand-teal truncate">{state.doctor.firstName} {state.doctor.lastName}</span>
                        </div>
                    </div>

                    <div className="p-4 bg-brand-teal/5 rounded-xl border border-brand-teal/10 col-span-2 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-brand-teal" />
                                <span className="font-bold text-brand-teal">{format(state.selectedDate!, 'EEEE, MMMM do')}</span>
                            </div>
                            <div className="w-px h-8 bg-brand-teal/10" />
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-brand-teal" />
                                <span className="font-bold text-brand-teal">
                                    {format(new Date(state.selectedSlot!.start), 'HH:mm')}
                                </span>
                            </div>
                        </div>
                        <span className="text-xs font-bold bg-white px-2 py-1 rounded text-brand-teal border border-brand-teal/10">
                            {state.appointmentType}
                        </span>
                    </div>
                </div>

                <div className="border-t border-brand-teal/10 pt-4">
                    <span className="text-xs uppercase font-bold text-brand-teal/60 mb-1 block">Reason for Visit</span>
                    <p className="text-brand-teal font-medium">{state.reason || 'No specific reason provided'}</p>
                </div>
            </div>

            {/* Visibility Confirmation */}
            <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                <h4 className="flex items-center gap-2 text-sm font-bold text-blue-800 mb-3">
                    <AlertCircle className="w-4 h-4" />
                    System Actions
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-blue-700">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        <span>Add to Dr. {state.doctor.lastName}'s Schedule</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        <span>Update Front Desk Queue</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        <span>Create Patient Journey Record</span>
                    </div>
                </div>
            </div>

            <div className="flex gap-4 pt-4">
                <Button
                    variant="outline"
                    onClick={onBack}
                    className="flex-1"
                >
                    Back
                </Button>
                <Button
                    onClick={() => bookingMutation.mutate()}
                    disabled={bookingMutation.isPending}
                    className="flex-[2] bg-brand-teal text-white font-bold h-12 rounded-xl shadow-lg hover:bg-brand-teal/90"
                >
                    {bookingMutation.isPending ? 'Confirming...' : 'Confirm Booking'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </div>
        </div>
    );
}
