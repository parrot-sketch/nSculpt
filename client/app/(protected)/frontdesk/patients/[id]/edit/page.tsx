'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { usePatient, useUpdatePatient } from '@/hooks/usePatients';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import Link from 'next/link';
import {
    PersonalInformationSection,
    ContactInformationSection,
    ResidenceSection,
    NextOfKinSection,
} from '@/components/patients/PatientFormSections';
import { PatientFormError } from '@/components/patients/PatientFormError';

/**
 * Front Desk Edit Patient Page
 * 
 * Clean, focused edit form for front desk staff.
 * Reuses existing patient form sections for consistency.
 */
export default function FrontDeskEditPatientPage() {
    const params = useParams();
    const router = useRouter();
    const patientId = params.id as string;

    // Fetch existing patient data using the standard hook
    const { data: patient, isLoading: isLoadingPatient, error } = usePatient(patientId);

    const [formData, setFormData] = useState({
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

    const [nextOfKin, setNextOfKin] = useState({
        firstName: '',
        lastName: '',
        relationship: '',
        contact: '',
    });

    // Populate form when patient data loads
    useEffect(() => {
        if (patient) {
            setFormData({
                firstName: patient.firstName || '',
                lastName: patient.lastName || '',
                middleName: patient.middleName || '',
                email: patient.email || '',
                phone: patient.phone || '',
                whatsapp: patient.whatsapp || '',
                dateOfBirth: patient.dateOfBirth
                    ? typeof patient.dateOfBirth === 'string'
                        ? patient.dateOfBirth.split('T')[0]
                        : new Date(patient.dateOfBirth).toISOString().split('T')[0]
                    : '',
                gender: patient.gender || '',
                occupation: patient.occupation || '',
                address: patient.address?.street || '',
                city: patient.city || patient.address?.city || '',
                state: patient.address?.state || '',
                zipCode: patient.address?.zipCode || '',
                country: patient.address?.country || 'Kenya',
            });

            // Populate next of kin from patient data
            const nokContact = patient.contacts?.find(c => c.isNextOfKin);
            if (nokContact) {
                setNextOfKin({
                    firstName: nokContact.firstName || '',
                    lastName: nokContact.lastName || '',
                    relationship: nokContact.relationship || '',
                    contact: nokContact.phone || nokContact.email || '',
                });
            }
        }
    }, [patient]);

    const updateMutation = useUpdatePatient();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Convert flat form data back to nested structure expected by backend
        const patientData = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            middleName: formData.middleName,
            email: formData.email,
            phone: formData.phone,
            whatsapp: formData.whatsapp,
            dateOfBirth: formData.dateOfBirth,
            gender: formData.gender,
            occupation: formData.occupation,
            city: formData.city, // Keep top-level city for now, if backend expects it
            address: {
                street: formData.address,
                city: formData.city,
                state: formData.state,
                zipCode: formData.zipCode,
                country: formData.country,
            },
            nextOfKinFirstName: nextOfKin.firstName,
            nextOfKinLastName: nextOfKin.lastName,
            nextOfKinRelationship: nextOfKin.relationship,
            nextOfKinContact: nextOfKin.contact,
        };

        updateMutation.mutate({
            id: patientId,
            patient: patientData as any
        }, {
            onSuccess: () => {
                router.push(`/frontdesk/patients/${patientId}`);
            }
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNextOfKinChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setNextOfKin(prev => ({ ...prev, [name]: value }));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (e.key === 'Enter') {
            const target = e.target as HTMLElement;
            const isSubmitButton = target.tagName === 'BUTTON' && (target as HTMLButtonElement).type === 'submit';
            if (!isSubmitButton) {
                e.preventDefault();
            }
        }
    };

    if (isLoadingPatient) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner />
            </div>
        );
    }

    if (error || !patient) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <p className="text-red-800 font-bold">Error: Could not find patient</p>
                    <p className="text-red-600 text-sm mt-1">The patient record may have been moved or deleted.</p>
                    <Link href="/frontdesk/patients" className="mt-4 inline-block text-brand-teal font-bold hover:underline">
                        Return to Patients List
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-brand-teal font-serif">Edit Patient Record</h1>
                    <p className="mt-2 text-brand-teal/60 font-medium">
                        Update information for {patient.firstName} {patient.lastName}
                    </p>
                </div>
                <Link
                    href={`/frontdesk/patients/${patientId}`}
                    className="px-4 py-2 text-sm font-bold text-brand-teal bg-white border border-brand-teal/20 rounded-xl hover:bg-brand-teal/5 transition-all shadow-sm"
                >
                    Cancel
                </Link>
            </div>

            <form onSubmit={handleSubmit} className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-white/50 p-8 space-y-8">
                {updateMutation.isError && <PatientFormError error={updateMutation.error} />}

                <PersonalInformationSection
                    formData={formData}
                    handleChange={handleChange}
                    handleKeyDown={handleKeyDown}
                />

                <ContactInformationSection
                    formData={formData}
                    handleChange={handleChange}
                    handleKeyDown={handleKeyDown}
                />

                <ResidenceSection
                    formData={formData}
                    handleChange={handleChange}
                    handleKeyDown={handleKeyDown}
                />

                <NextOfKinSection
                    nextOfKin={nextOfKin}
                    handleNextOfKinChange={handleNextOfKinChange}
                    handleKeyDown={handleKeyDown}
                />

                <div className="flex justify-end gap-3 pt-6 border-t border-brand-teal/5">
                    <Link
                        href={`/frontdesk/patients/${patientId}`}
                        className="px-6 py-2.5 text-sm font-bold text-brand-teal bg-white border border-brand-teal/10 rounded-xl hover:bg-brand-teal/5 transition-all"
                    >
                        Discard Changes
                    </Link>
                    <button
                        type="submit"
                        disabled={updateMutation.isPending}
                        className="px-8 py-2.5 text-sm font-bold text-white bg-brand-teal rounded-xl hover:bg-brand-teal-dark shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {updateMutation.isPending ? (
                            <>
                                <LoadingSpinner size="sm" />
                                Updating...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
