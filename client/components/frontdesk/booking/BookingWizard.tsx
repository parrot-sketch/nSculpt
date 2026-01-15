'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Stethoscope, Calendar, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PatientStep } from './steps/PatientStep';
import { DoctorStep } from './steps/DoctorStep';
import { SlotStep } from './steps/SlotStep';
import { ReviewStep } from './steps/ReviewStep';
import { useAppointment } from '@/hooks/useAppointments';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';

export type BookingMode = 'new' | 'existing' | 'procedure';

export interface BookingState {
    mode: BookingMode;
    requestId?: string;
    patient: any | null; // Typed loosely for now, will strict typing later
    doctor: any | null;
    selectedDate: Date | null;
    selectedSlot: { start: string; end: string } | null;
    appointmentType: string;
    reason: string;
    notes: string;
}

const STEPS = [
    { id: 1, label: 'Patient', icon: User },
    { id: 2, label: 'Doctor', icon: Stethoscope },
    { id: 3, label: 'Slot', icon: Calendar },
    { id: 4, label: 'Review', icon: CheckCircle2 },
];

export function BookingWizard({
    initialMode = 'existing',
    requestId
}: {
    initialMode?: BookingMode;
    requestId?: string;
}) {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [state, setState] = useState<BookingState>({
        mode: initialMode,
        requestId,
        patient: null,
        doctor: null,
        selectedDate: null,
        selectedSlot: null,
        appointmentType: 'CONSULTATION',
        reason: '',
        notes: '',
    });

    // Fetch existing request if requestId is provided
    const { appointment, isLoading: isLoadingRequest } = useAppointment(requestId || '');

    useEffect(() => {
        if (appointment && requestId) {
            setState(prev => ({
                ...prev,
                patient: appointment.patient,
                doctor: appointment.doctor,
                appointmentType: appointment.appointmentType,
                reason: appointment.reason,
                notes: appointment.notes || '',
                // If it's a request, it won't have a slot yet usually, but we keep it open
            }));
            // If we have both patient and doctor, we can skip to slot selection
            if (appointment.patient && appointment.doctor) {
                setCurrentStep(3);
            } else if (appointment.patient) {
                setCurrentStep(2);
            }
        }
    }, [appointment, requestId]);

    if (requestId && isLoadingRequest) {
        return (
            <div className="flex items-center justify-center p-20">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    const updateState = (updates: Partial<BookingState>) => {
        setState(prev => ({ ...prev, ...updates }));
    };

    const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 4));
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    const canProceed = () => {
        switch (currentStep) {
            case 1: // Patient
                if (state.mode === 'existing') return !!state.patient;
                return true; // New patient form handles its own validation inside step or we do it here
            case 2: // Doctor
                return !!state.doctor;
            case 3: // Slot
                return !!state.selectedSlot;
            default:
                return true;
        }
    };

    return (
        <div className="max-w-5xl mx-auto bg-white/50 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 overflow-hidden flex flex-col min-h-[600px]">
            {/* Progress Header */}
            <div className="bg-white/80 border-b border-brand-teal/10 p-6">
                <div className="flex items-center justify-between max-w-3xl mx-auto relative">
                    {/* Connecting Line */}
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-brand-teal/10 -z-10" />

                    {STEPS.map((step) => {
                        const Icon = step.icon;
                        const isActive = step.id === currentStep;
                        const isCompleted = step.id < currentStep;

                        return (
                            <div key={step.id} className="flex flex-col items-center gap-2 bg-white px-2">
                                <div
                                    className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                                        isActive ? "bg-brand-teal text-brand-gold shadow-lg scale-110" :
                                            isCompleted ? "bg-brand-teal/10 text-brand-teal" : "bg-gray-100 text-gray-400"
                                    )}
                                >
                                    <Icon className="w-5 h-5" />
                                </div>
                                <span className={cn(
                                    "text-xs font-bold uppercase tracking-wider transition-colors",
                                    isActive ? "text-brand-teal" : isCompleted ? "text-brand-teal/60" : "text-gray-400"
                                )}>
                                    {step.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {currentStep === 1 && (
                        <PatientStep
                            state={state}
                            updateState={updateState}
                            onNext={nextStep}
                        />
                    )}
                    {currentStep === 2 && (
                        <DoctorStep
                            state={state}
                            updateState={updateState}
                        />
                    )}
                    {currentStep === 3 && (
                        <SlotStep
                            state={state}
                            updateState={updateState}
                        />
                    )}
                    {currentStep === 4 && (
                        <ReviewStep
                            state={state}
                            onBack={prevStep}
                            onComplete={() => router.push('/frontdesk/appointments')}
                        />
                    )}
                </div>
            </div>

            {/* Footer Navigation */}
            {currentStep < 4 && (
                <div className="p-6 bg-white border-t border-brand-teal/10 flex justify-between items-center">
                    <Button
                        variant="ghost"
                        onClick={prevStep}
                        disabled={currentStep === 1}
                        className="text-brand-teal/60 hover:text-brand-teal"
                    >
                        Back
                    </Button>

                    {currentStep === 1 && state.mode === 'new' ? (
                        <span className="text-xs text-brand-teal/40 italic">Fill form to proceed</span>
                    ) : (
                        <Button
                            onClick={nextStep}
                            disabled={!canProceed()}
                            className="bg-brand-teal text-white hover:bg-brand-teal/90 shadow-lg shadow-brand-teal/20"
                        >
                            Continue
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
