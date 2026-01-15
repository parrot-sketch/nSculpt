'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patientService, type Patient } from '@/services/patient.service';
import { User, Mail, Phone, MapPin, Save, Loader2, HeartPulse, Briefcase, Globe, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface PatientRegistrationFormProps {
    onSuccessRedirect: string;
    onCancelRoute: string;
    title?: string;
    subtitle?: string;
}

/**
 * Shared Patient Registration Form
 * 
 * Reusable component for both Admin and Front Desk.
 * Standardizes patient intake fields and validation logic.
 */
export function PatientRegistrationForm({
    onSuccessRedirect,
    onCancelRoute,
    title = "Patient Intake",
    subtitle = "Collect all required patient information before creating the record"
}: PatientRegistrationFormProps) {
    const router = useRouter();
    const queryClient = useQueryClient();

    // 1. Patient Data State
    const [formData, setFormData] = useState<Partial<Patient>>({
        firstName: '',
        lastName: '',
        middleName: '',
        email: '',
        phone: '',
        whatsapp: '',
        dateOfBirth: '',
        gender: '',
        occupation: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'Kenya',
    });

    // 2. Next of Kin State
    const [nextOfKin, setNextOfKin] = useState({
        firstName: '',
        lastName: '',
        relationship: '',
        contact: '',
    });

    const createPatientMutation = useMutation({
        mutationFn: (patient: Partial<Patient> & { nextOfKinFirstName?: string; nextOfKinLastName?: string; nextOfKinRelationship?: string; nextOfKinContact?: string }) => {
            return patientService.createPatient({
                ...patient,
                nextOfKinFirstName: nextOfKin.firstName,
                nextOfKinLastName: nextOfKin.lastName,
                nextOfKinRelationship: nextOfKin.relationship,
                nextOfKinContact: nextOfKin.contact,
            });
        },
        onSuccess: (newItem) => {
            // Invalidate both admin and general patient lists to be safe
            queryClient.invalidateQueries({ queryKey: ['patients'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'patients'] });

            // Navigate
            if (newItem && newItem.id) {
                // If redirect string contains [id], replace it
                if (onSuccessRedirect.includes('[id]')) {
                    router.push(onSuccessRedirect.replace('[id]', newItem.id));
                } else {
                    router.push(onSuccessRedirect);
                }
            } else {
                router.push(onSuccessRedirect.replace('/[id]', ''));
            }
        },
        onError: (error: any) => {
            console.error('Failed to register patient:', error);
            // alert('Failed to register patient: ' + (error.response?.data?.message || error.message));
        }
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNextOfKinChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setNextOfKin(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.firstName || !formData.lastName || !formData.dateOfBirth || !formData.phone || !formData.city) {
            alert('Please fill in all required fields marked with *');
            return;
        }

        const payload = {
            ...formData,
            dateOfBirth: new Date(formData.dateOfBirth as string).toISOString(),
        };

        createPatientMutation.mutate(payload);
    };

    return (
        <div className="space-y-6">
            {/* Error Banner */}
            {createPatientMutation.isError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
                    <span className="font-semibold">Error:</span>
                    {createPatientMutation.error instanceof Error ? createPatientMutation.error.message : 'Failed to register patient'}
                </div>
            )}

            {/* Header is handled by parent or embedded here if preferred? 
           Keeping it flexible by accepting title/subtitle props but component structure implies this is the form content.
           Let's wrap the form in the card style.
       */}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">

                    {/* 1. Personal Information */}
                    <section>
                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-5 flex items-center gap-2 border-b border-slate-100 pb-2">
                            <User className="w-4 h-4 text-primary" /> Personal Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">First Name <span className="text-red-500">*</span></label>
                                <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required className="w-full rounded-md border-slate-300 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. John" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Last Name <span className="text-red-500">*</span></label>
                                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required className="w-full rounded-md border-slate-300 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. Doe" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Middle Name</label>
                                <input type="text" name="middleName" value={formData.middleName} onChange={handleChange} className="w-full rounded-md border-slate-300 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <input type="date" name="dateOfBirth" value={formData.dateOfBirth as string} onChange={handleChange} required max={new Date().toISOString().split('T')[0]} className="w-full rounded-md border-slate-300 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                                <select name="gender" value={formData.gender} onChange={handleChange} className="w-full rounded-md border-slate-300 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                                    <option value="">Select...</option>
                                    <option value="MALE">Male</option>
                                    <option value="FEMALE">Female</option>
                                    <option value="OTHER">Other</option>
                                    <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Occupation</label>
                                <div className="relative">
                                    <input type="text" name="occupation" value={formData.occupation} onChange={handleChange} className="w-full rounded-md border-slate-300 border pl-10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. Teacher" />
                                    <Briefcase className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 2. Contact Information */}
                    <section>
                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-5 flex items-center gap-2 border-b border-slate-100 pb-2">
                            <Phone className="w-4 h-4 text-primary" /> Contact Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Primary Phone <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required className="w-full rounded-md border-slate-300 border pl-10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="+254..." />
                                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp</label>
                                <div className="relative">
                                    <input type="tel" name="whatsapp" value={formData.whatsapp} onChange={handleChange} className="w-full rounded-md border-slate-300 border pl-10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="+254..." />
                                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                                <div className="relative">
                                    <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full rounded-md border-slate-300 border pl-10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="john.doe@example.com" />
                                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 3. Residence / Address */}
                    <section>
                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-5 flex items-center gap-2 border-b border-slate-100 pb-2">
                            <MapPin className="w-4 h-4 text-primary" /> Residence
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Street Address</label>
                                <input type="text" name="address" value={formData.address as string} onChange={handleChange} className="w-full rounded-md border-slate-300 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="P.O. Box / Street / Apartment" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">City / Town (Residence) <span className="text-red-500">*</span></label>
                                <input type="text" name="city" value={formData.city} onChange={handleChange} required className="w-full rounded-md border-slate-300 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">State / Province</label>
                                <input type="text" name="state" value={formData.state} onChange={handleChange} className="w-full rounded-md border-slate-300 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ZIP / Postal Code</label>
                                <input type="text" name="zipCode" value={formData.zipCode} onChange={handleChange} className="w-full rounded-md border-slate-300 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                                <div className="relative">
                                    <input type="text" name="country" value={formData.country} onChange={handleChange} className="w-full rounded-md border-slate-300 border pl-10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                    <Globe className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 4. Next of Kin */}
                    <section className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-5 flex items-center gap-2 border-b border-slate-200 pb-2">
                            <HeartPulse className="w-4 h-4 text-rose-500" /> Next of Kin (Emergency Contact)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                                <input type="text" name="firstName" value={nextOfKin.firstName} onChange={handleNextOfKinChange} className="w-full rounded-md border-slate-300 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                                <input type="text" name="lastName" value={nextOfKin.lastName} onChange={handleNextOfKinChange} className="w-full rounded-md border-slate-300 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Relationship</label>
                                <select name="relationship" value={nextOfKin.relationship} onChange={handleNextOfKinChange} className="w-full rounded-md border-slate-300 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                                    <option value="">Select relationship...</option>
                                    <option value="SPOUSE">Spouse</option>
                                    <option value="PARENT">Parent</option>
                                    <option value="CHILD">Child</option>
                                    <option value="SIBLING">Sibling</option>
                                    <option value="FRIEND">Friend</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Number / Email</label>
                                <input type="text" name="contact" value={nextOfKin.contact} onChange={handleNextOfKinChange} className="w-full rounded-md border-slate-300 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Phone preferred" />
                            </div>
                        </div>
                    </section>

                    {/* Actions */}
                    <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                        <Link href={onCancelRoute} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={createPatientMutation.isPending}
                            className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
                        >
                            {createPatientMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" /> Registering...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" /> Complete Registration
                                </>
                            )}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
