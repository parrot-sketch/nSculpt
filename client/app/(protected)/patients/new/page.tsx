'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patientService, type Patient } from '@/services/patient.service';
import Link from 'next/link';
import {
    User,
    Mail,
    Phone,
    Calendar,
    MapPin,
    Briefcase,
    Heart,
    ArrowLeft,
    CheckCircle2,
    AlertCircle,
    Loader2
} from 'lucide-react';

const TOTAL_STEPS = 4;
const FINAL_STEP = 4;

const steps = [
    { number: 1, title: 'Personal Info', icon: User },
    { number: 2, title: 'Contact', icon: Phone },
    { number: 3, title: 'Address', icon: MapPin },
    { number: 4, title: 'Emergency', icon: Heart },
];

export default function NewPatientPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [currentStep, setCurrentStep] = useState(1);
    const currentStepRef = useRef(currentStep);
    const [showSuccess, setShowSuccess] = useState(false);

    // Keep ref in sync with state
    useEffect(() => {
        currentStepRef.current = currentStep;
    }, [currentStep]);

    // Form state
    const [formData, setFormData] = useState<Partial<Patient>>({
        firstName: '',
        lastName: '',
        middleName: '',
        dateOfBirth: '',
        gender: '',
        occupation: '',
        email: '',
        phone: '',
        whatsapp: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'Kenya',
        nextOfKinFirstName: '',
        nextOfKinLastName: '',
        nextOfKinRelationship: '',
        nextOfKinContact: '',
    });

    // Mutation
    const createPatientMutation = useMutation({
        mutationFn: (data: Partial<Patient>) => {
            if (currentStepRef.current !== FINAL_STEP) {
                throw new Error('Form submission prevented: Please complete all steps first');
            }
            return patientService.createPatient(data);
        },
        onSuccess: (patient) => {
            queryClient.invalidateQueries({ queryKey: ['patients'] });
            setShowSuccess(true);
            setTimeout(() => {
                router.push(`/patients/${patient.id}`);
            }, 2000);
        },
        onError: (error: any) => {
            console.error('Patient registration failed:', error);
        }
    });

    // Handlers
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNextStep = () => {
        if (currentStep < TOTAL_STEPS) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handlePreviousStep = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const isOnFinalStep = () => currentStepRef.current === FINAL_STEP;

    const canSubmitForm = () => {
        return isOnFinalStep() && 
               formData.firstName && 
               formData.lastName && 
               formData.dateOfBirth;
    };

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        e.stopPropagation();

        if (!canSubmitForm()) {
            if (!isOnFinalStep()) {
                return; // Silently prevent submission if not on final step
            }
            alert('Please fill in all required fields: First Name, Last Name, and Date of Birth');
            return;
        }

        const payload = {
            ...formData,
            dateOfBirth: new Date(formData.dateOfBirth as string).toISOString(),
        };

        createPatientMutation.mutate(payload);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (e.key !== 'Enter') return;
        
        const target = e.target as HTMLElement;
        const isSubmitButton = target.tagName === 'BUTTON' && target.type === 'submit';
        
        // Only allow Enter to submit if on final step AND it's the submit button
        if (!isOnFinalStep() || !isSubmitButton) {
            e.preventDefault();
            e.stopPropagation();
        }
    };

    if (showSuccess) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-12 h-12 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-spaceCadet mb-3">Registration Successful!</h2>
                    <p className="text-neutral-600 mb-2">Patient has been registered successfully.</p>
                    <p className="text-sm text-neutral-500">Redirecting to patient profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-full bg-gradient-to-br from-neutral-50 to-neutral-100">
            <div className="max-w-5xl mx-auto p-6 md:p-8">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 text-primary hover:text-primary-dark transition-colors mb-6 group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-medium">Back to Dashboard</span>
                    </Link>

                    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                        <h1 className="text-3xl font-bold text-spaceCadet mb-2">Patient Registration</h1>
                        <p className="text-neutral-600">Complete the form below to register a new patient</p>
                    </div>
                </div>

                {/* Progress Steps */}
                <div className="mb-8">
                    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                        <div className="flex items-center justify-between">
                            {steps.map((step, index) => {
                                const Icon = step.icon;
                                const isActive = currentStep === step.number;
                                const isCompleted = currentStep > step.number;

                                return (
                                    <div key={step.number} className="flex items-center flex-1">
                                        <div className="flex flex-col items-center flex-1">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                                                isCompleted
                                                    ? 'bg-green-500 text-white'
                                                    : isActive
                                                        ? 'bg-primary text-white shadow-lg scale-110'
                                                        : 'bg-neutral-200 text-neutral-500'
                                            }`}>
                                                {isCompleted ? (
                                                    <CheckCircle2 className="w-6 h-6" />
                                                ) : (
                                                    <Icon className="w-6 h-6" />
                                                )}
                                            </div>
                                            <div className="mt-2 text-center">
                                                <div className={`text-sm font-semibold ${
                                                    isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-neutral-500'
                                                }`}>
                                                    {step.title}
                                                </div>
                                            </div>
                                        </div>
                                        {index < steps.length - 1 && (
                                            <div className={`h-1 flex-1 mx-4 rounded transition-all ${
                                                isCompleted ? 'bg-green-500' : 'bg-neutral-200'
                                            }`} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Error Alert */}
                {createPatientMutation.isError && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-red-900 mb-1">Registration Failed</h3>
                            <p className="text-sm text-red-700">
                                {createPatientMutation.error instanceof Error
                                    ? createPatientMutation.error.message
                                    : 'Unable to register patient. Please check the form and try again.'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleFormSubmit} className="space-y-6">
                    {/* Step 1: Personal Information */}
                    {currentStep === 1 && (
                        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-primary to-primary-light px-6 py-4">
                                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <User className="w-5 h-5" />
                                    Personal Information
                                </h2>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    label="First Name"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    required
                                    placeholder="John"
                                />
                                <FormField
                                    label="Last Name"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    required
                                    placeholder="Doe"
                                />
                                <FormField
                                    label="Middle Name"
                                    name="middleName"
                                    value={formData.middleName}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Optional"
                                />
                                <DateField
                                    label="Date of Birth"
                                    name="dateOfBirth"
                                    value={formData.dateOfBirth as string}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    required
                                />
                                <SelectField
                                    label="Gender"
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    options={[
                                        { value: '', label: 'Select gender' },
                                        { value: 'MALE', label: 'Male' },
                                        { value: 'FEMALE', label: 'Female' },
                                        { value: 'OTHER', label: 'Other' },
                                        { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
                                    ]}
                                />
                                <FormField
                                    label="Occupation"
                                    name="occupation"
                                    value={formData.occupation}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="e.g., Teacher, Engineer"
                                    icon={Briefcase}
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Contact Information */}
                    {currentStep === 2 && (
                        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-accent to-accent-light px-6 py-4">
                                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <Phone className="w-5 h-5" />
                                    Contact Information
                                </h2>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    label="Primary Phone"
                                    name="phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="+254 700 000 000"
                                    icon={Phone}
                                />
                                <FormField
                                    label="WhatsApp"
                                    name="whatsapp"
                                    type="tel"
                                    value={formData.whatsapp}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="+254 700 000 000"
                                    icon={Phone}
                                />
                                <FormField
                                    label="Email Address"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="john.doe@example.com"
                                    icon={Mail}
                                    fullWidth
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3: Residence */}
                    {currentStep === 3 && (
                        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <MapPin className="w-5 h-5" />
                                    Residence Information
                                </h2>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    label="Street Address"
                                    name="address"
                                    value={formData.address as string}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="P.O. Box, Street, Apartment"
                                    fullWidth
                                />
                                <FormField
                                    label="City / Town"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Nairobi"
                                />
                                <FormField
                                    label="County / State"
                                    name="state"
                                    value={formData.state}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Optional"
                                />
                                <FormField
                                    label="Postal Code"
                                    name="zipCode"
                                    value={formData.zipCode}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="00100"
                                />
                                <FormField
                                    label="Country"
                                    name="country"
                                    value={formData.country}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 4: Next of Kin */}
                    {currentStep === 4 && (
                        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-4">
                                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <Heart className="w-5 h-5" />
                                    Next of Kin / Emergency Contact
                                </h2>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    label="First Name"
                                    name="nextOfKinFirstName"
                                    value={formData.nextOfKinFirstName}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Jane"
                                />
                                <FormField
                                    label="Last Name"
                                    name="nextOfKinLastName"
                                    value={formData.nextOfKinLastName}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Doe"
                                />
                                <SelectField
                                    label="Relationship"
                                    name="nextOfKinRelationship"
                                    value={formData.nextOfKinRelationship}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    options={[
                                        { value: '', label: 'Select relationship' },
                                        { value: 'SPOUSE', label: 'Spouse' },
                                        { value: 'PARENT', label: 'Parent' },
                                        { value: 'CHILD', label: 'Child' },
                                        { value: 'SIBLING', label: 'Sibling' },
                                        { value: 'FRIEND', label: 'Friend' },
                                        { value: 'OTHER', label: 'Other' },
                                    ]}
                                />
                                <FormField
                                    label="Contact Number"
                                    name="nextOfKinContact"
                                    value={formData.nextOfKinContact}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="+254 700 000 000"
                                />
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between gap-4 pt-4">
                        <div className="flex gap-3">
                            <Link
                                href="/dashboard"
                                className="px-6 py-3 text-sm font-semibold text-neutral-700 bg-white border-2 border-neutral-300 rounded-lg hover:bg-neutral-50 hover:border-neutral-400 transition-all"
                            >
                                Cancel
                            </Link>
                            {currentStep > 1 && (
                                <button
                                    type="button"
                                    onClick={handlePreviousStep}
                                    className="px-6 py-3 text-sm font-semibold text-primary bg-white border-2 border-primary rounded-lg hover:bg-primary-light hover:text-white transition-all"
                                >
                                    Previous
                                </button>
                            )}
                        </div>

                        {currentStep < FINAL_STEP ? (
                            <button
                                type="button"
                                onClick={handleNextStep}
                                className="px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-primary to-primary-light rounded-lg hover:shadow-lg hover:scale-105 transition-all"
                            >
                                Next Step
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={createPatientMutation.isPending || !canSubmitForm()}
                                className="px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-green-500 rounded-lg hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all flex items-center gap-2"
                            >
                                {createPatientMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Registering...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-5 h-5" />
                                        Complete Registration
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}

// Reusable Form Components
interface FormFieldProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    type?: string;
    required?: boolean;
    placeholder?: string;
    icon?: React.ComponentType<{ className?: string }>;
    fullWidth?: boolean;
}

function FormField({
    label,
    name,
    value,
    onChange,
    onKeyDown,
    type = 'text',
    required = false,
    placeholder,
    icon: Icon,
    fullWidth = false,
}: FormFieldProps) {
    return (
        <div className={fullWidth ? 'md:col-span-2' : ''}>
            <label className="block text-sm font-semibold text-spaceCadet mb-2">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
                <input
                    type={type}
                    name={name}
                    value={value}
                    onChange={onChange}
                    onKeyDown={onKeyDown}
                    required={required}
                    placeholder={placeholder}
                    className={`w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
                        Icon ? 'pl-11' : ''
                    }`}
                />
                {Icon && (
                    <Icon className="absolute left-3 top-3.5 w-5 h-5 text-neutral-400 pointer-events-none" />
                )}
            </div>
        </div>
    );
}

interface DateFieldProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    required?: boolean;
}

function DateField({ label, name, value, onChange, onKeyDown, required = false }: DateFieldProps) {
    return (
        <div>
            <label className="block text-sm font-semibold text-spaceCadet mb-2">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
                <input
                    type="date"
                    name={name}
                    value={value}
                    onChange={onChange}
                    onKeyDown={onKeyDown}
                    required={required}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
                <Calendar className="absolute right-3 top-3.5 w-5 h-5 text-neutral-400 pointer-events-none" />
            </div>
        </div>
    );
}

interface SelectFieldProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLSelectElement>) => void;
    options: Array<{ value: string; label: string }>;
}

function SelectField({ label, name, value, onChange, onKeyDown, options }: SelectFieldProps) {
    return (
        <div>
            <label className="block text-sm font-semibold text-spaceCadet mb-2">{label}</label>
            <select
                name={name}
                value={value}
                onChange={onChange}
                onKeyDown={onKeyDown}
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            >
                {options.map(option => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
