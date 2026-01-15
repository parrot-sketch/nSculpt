'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patientService, type Patient } from '@/services/patient.service';
import Link from 'next/link';

/**
 * Admin Create Patient Page
 * 
 * Comprehensive patient intake form for front desk staff.
 * Collects ALL required information before creating patient record.
 * 
 * Required fields:
 * - Personal: firstName, lastName, dateOfBirth
 * - Contact: email, phone, whatsapp, address, city (residence)
 * - Additional: occupation, gender
 * - Next of Kin: name, relationship, contact
 * - Medical: allergies (can be added later via patient_allergies table)
 */
export default function AdminCreatePatientPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
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

  // Next of Kin fields
  const [nextOfKin, setNextOfKin] = useState({
    firstName: '',
    lastName: '',
    relationship: '',
    contact: '',
  });

  const createMutation = useMutation({
    mutationFn: (patient: Partial<Patient> & { nextOfKinFirstName?: string; nextOfKinLastName?: string; nextOfKinRelationship?: string; nextOfKinContact?: string }) => {
      // Combine patient data with next of kin
      return patientService.createPatient({
        ...patient,
        nextOfKinFirstName: nextOfKin.firstName,
        nextOfKinLastName: nextOfKin.lastName,
        nextOfKinRelationship: nextOfKin.relationship,
        nextOfKinContact: nextOfKin.contact,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'patients'] });
      if (data && data.id) {
        router.push(`/admin/patients/${data.id}`);
      } else {
        router.push('/admin/patients');
      }
    },
    onError: (error: any) => {
      console.error('Failed to create patient:', error);
      // Error is already handled by the error display in the form
      // No need to do anything here - the error state will trigger the error display
    },
  });

  // Extract error message from API error response
  const getErrorMessage = (error: any): string => {
    if (!error) return 'Failed to create patient. Please try again.';
    
    // Handle ApiError structure from apiClient
    if (error.message) {
      return error.message;
    }
    
    // Handle Axios error structure
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    
    // Handle generic error
    if (typeof error === 'string') {
      return error;
    }
    
    return 'Failed to create patient. Please check the information and try again.';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNextOfKinChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNextOfKin((prev) => ({ ...prev, [name]: value }));
  };

  // Prevent form submission on Enter key press in input/select fields
  // Only allow submission when explicitly clicking the submit button
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      // Prevent form submission unless it's the submit button
      if (target.tagName !== 'BUTTON' || target.type !== 'submit') {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Patient Intake</h1>
          <p className="mt-2 text-neutral-600">
            Collect all required patient information before creating the record
          </p>
        </div>
        <Link
          href="/admin/patients"
          className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
        >
          Cancel
        </Link>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8 space-y-8">
        {createMutation.isError && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-semibold text-red-800 mb-1">Error Creating Patient</h3>
                <p className="text-sm text-red-700">
                  {getErrorMessage(createMutation.error)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Personal Information Section */}
        <div>
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-neutral-700 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                required
                value={formData.firstName}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-neutral-700 mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                required
                value={formData.lastName}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label htmlFor="middleName" className="block text-sm font-medium text-neutral-700 mb-2">
                Middle Name
              </label>
              <input
                type="text"
                id="middleName"
                name="middleName"
                value={formData.middleName}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-neutral-700 mb-2">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="dateOfBirth"
                name="dateOfBirth"
                required
                max={new Date().toISOString().split('T')[0]}
                value={formData.dateOfBirth}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-neutral-700 mb-2">
                Gender
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              >
                <option value="">Select...</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
                <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
              </select>
            </div>

            <div>
              <label htmlFor="occupation" className="block text-sm font-medium text-neutral-700 mb-2">
                Occupation
              </label>
              <input
                type="text"
                id="occupation"
                name="occupation"
                value={formData.occupation}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                placeholder="e.g., Engineer, Teacher, Business Owner"
              />
            </div>
          </div>
        </div>

        {/* Contact Information Section */}
        <div>
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">Contact Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 mb-2">
                Tel (Primary Phone)
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                placeholder="+254 700 000 000"
              />
            </div>

            <div>
              <label htmlFor="whatsapp" className="block text-sm font-medium text-neutral-700 mb-2">
                WhatsApp
              </label>
              <input
                type="tel"
                id="whatsapp"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                placeholder="+254 700 000 000"
              />
            </div>
          </div>
        </div>

        {/* Address / Residence Section */}
        <div>
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">Residence</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="address" className="block text-sm font-medium text-neutral-700 mb-2">
                Address
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                placeholder="Street address"
              />
            </div>

            <div>
              <label htmlFor="city" className="block text-sm font-medium text-neutral-700 mb-2">
                City (Residence) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="city"
                name="city"
                required
                value={formData.city}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                placeholder="e.g., Nairobi"
              />
            </div>

            <div>
              <label htmlFor="state" className="block text-sm font-medium text-neutral-700 mb-2">
                State/Province
              </label>
              <input
                type="text"
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label htmlFor="zipCode" className="block text-sm font-medium text-neutral-700 mb-2">
                ZIP/Postal Code
              </label>
              <input
                type="text"
                id="zipCode"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label htmlFor="country" className="block text-sm font-medium text-neutral-700 mb-2">
                Country
              </label>
              <input
                type="text"
                id="country"
                name="country"
                value={formData.country || 'Kenya'}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Next of Kin Section */}
        <div>
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">Next of Kin</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="nextOfKinFirstName" className="block text-sm font-medium text-neutral-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                id="nextOfKinFirstName"
                name="firstName"
                value={nextOfKin.firstName}
                onChange={handleNextOfKinChange}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label htmlFor="nextOfKinLastName" className="block text-sm font-medium text-neutral-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                id="nextOfKinLastName"
                name="lastName"
                value={nextOfKin.lastName}
                onChange={handleNextOfKinChange}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label htmlFor="nextOfKinRelationship" className="block text-sm font-medium text-neutral-700 mb-2">
                Relation to Next of Kin
              </label>
              <select
                id="nextOfKinRelationship"
                name="relationship"
                value={nextOfKin.relationship}
                onChange={handleNextOfKinChange}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              >
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
              <label htmlFor="nextOfKinContact" className="block text-sm font-medium text-neutral-700 mb-2">
                Next of Kin Contact
              </label>
              <input
                type="tel"
                id="nextOfKinContact"
                name="contact"
                value={nextOfKin.contact}
                onChange={handleNextOfKinChange}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                placeholder="Phone or email"
              />
            </div>
          </div>
        </div>

        {/* Note about Drug Allergies */}
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

        {/* Form Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-neutral-200">
          <Link
            href="/admin/patients"
            className="px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-6 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
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
