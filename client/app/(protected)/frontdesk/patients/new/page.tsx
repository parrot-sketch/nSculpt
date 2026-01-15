'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patientService } from '@/services/patient.service';
import Link from 'next/link';
import {
  PersonalInformationSection,
  ContactInformationSection,
  ResidenceSection,
  NextOfKinSection,
} from '@/components/patients/PatientFormSections';
import { PatientFormError } from '@/components/patients/PatientFormError';
import { PatientAccountCreationSection } from '@/components/patients/PatientAccountCreationSection';

/**
 * FrontDesk Patient Registration Page
 * 
 * Clean, single-page patient intake form for front desk staff.
 * Follows clean code principles with extracted components.
 */
export default function FrontDeskCreatePatientPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  
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

  // Account creation state
  const [createUserAccount, setCreateUserAccount] = useState(false);
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountPasswordConfirm, setAccountPasswordConfirm] = useState('');

  const createMutation = useMutation({
    mutationFn: (patient: typeof formData & { createUserAccount?: boolean; password?: string }) => {
      return patientService.createPatient({
        ...patient,
        nextOfKinFirstName: nextOfKin.firstName,
        nextOfKinLastName: nextOfKin.lastName,
        nextOfKinRelationship: nextOfKin.relationship,
        nextOfKinContact: nextOfKin.contact,
        createUserAccount: createUserAccount,
        email: createUserAccount ? accountEmail : patient.email,
        password: createUserAccount ? accountPassword : undefined,
      } as any);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      router.push(data?.id ? `/frontdesk/patients/${data.id}` : '/frontdesk/patients');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate account creation fields if checkbox is checked
    if (createUserAccount) {
      if (!accountEmail) {
        alert('Email is required when creating user account');
        return;
      }
      if (!accountPassword || accountPassword.length < 8) {
        alert('Password must be at least 8 characters long');
        return;
      }
      if (accountPassword !== accountPasswordConfirm) {
        alert('Passwords do not match');
        return;
      }
    }

    createMutation.mutate(formData);
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
        e.stopPropagation();
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Patient Intake</h1>
          <p className="mt-2 text-neutral-600">
            Collect all required patient information before creating the record
          </p>
        </div>
        <Link
          href="/frontdesk/patients"
          className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
        >
          Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8 space-y-8">
        {createMutation.isError && <PatientFormError error={createMutation.error} />}

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

        <PatientAccountCreationSection
          createUserAccount={createUserAccount}
          email={accountEmail}
          password={accountPassword}
          passwordConfirm={accountPasswordConfirm}
          onToggleAccountCreation={setCreateUserAccount}
          onEmailChange={setAccountEmail}
          onPasswordChange={setAccountPassword}
          onPasswordConfirmChange={setAccountPasswordConfirm}
          onKeyDown={handleKeyDown}
        />

        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-800">
                <strong className="font-semibold">Note:</strong> Drug allergies can be added after patient creation through the patient detail page.
                The system supports multiple allergies per patient with severity tracking.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-neutral-200">
          <Link
            href="/frontdesk/patients"
            className="px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-6 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Patient...
              </span>
            ) : (
              'Create Patient'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
