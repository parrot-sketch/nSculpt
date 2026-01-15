'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientService, type Patient } from '@/services/patient.service';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import Link from 'next/link';

/**
 * Admin Edit Patient Page
 * 
 * Edit existing patient information.
 * Pre-populates form with current patient data.
 */
export default function AdminEditPatientPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const patientId = params.id as string;

  // Fetch existing patient data
  const { data: patient, isLoading: isLoadingPatient, error } = useQuery({
    queryKey: ['admin', 'patients', patientId],
    queryFn: () => patientService.getPatient(patientId),
    enabled: !!patientId,
  });

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
        address: patient.address || '',
        city: patient.city || '',
        state: patient.state || '',
        zipCode: patient.zipCode || '',
        country: patient.country || 'Kenya',
      });

      // Populate next of kin from contacts
      const primaryContact = patient.contacts?.find(c => c.isNextOfKin && c.priority === 1);
      if (primaryContact) {
        setNextOfKin({
          firstName: primaryContact.firstName || '',
          lastName: primaryContact.lastName || '',
          relationship: primaryContact.relationship || '',
          contact: primaryContact.phone || primaryContact.email || '',
        });
      }
    }
  }, [patient]);

  const updateMutation = useMutation({
    mutationFn: (patient: Partial<Patient> & { nextOfKinFirstName?: string; nextOfKinLastName?: string; nextOfKinRelationship?: string; nextOfKinContact?: string }) => {
      return patientService.updatePatient(patientId, {
        ...patient,
        nextOfKinFirstName: nextOfKin.firstName,
        nextOfKinLastName: nextOfKin.lastName,
        nextOfKinRelationship: nextOfKin.relationship,
        nextOfKinContact: nextOfKin.contact,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'patients'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'patients', patientId] });
      if (data && data.id) {
        router.push(`/admin/patients/${data.id}`);
      } else {
        router.push('/admin/patients');
      }
    },
    onError: (error) => {
      console.error('Failed to update patient:', error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNextOfKinChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNextOfKin((prev) => ({ ...prev, [name]: value }));
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
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to load patient.</p>
          <Link
            href="/admin/patients"
            className="mt-4 inline-block text-sm text-red-600 hover:text-red-800 underline"
          >
            Back to patients list
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Edit Patient</h1>
          <p className="mt-2 text-neutral-600">
            Update patient information
          </p>
        </div>
        <Link
          href={`/admin/patients/${patientId}`}
          className="px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
        >
          Cancel
        </Link>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 space-y-8">
        {updateMutation.isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">
              {updateMutation.error instanceof Error
                ? updateMutation.error.message
                : 'Failed to update patient. Please try again.'}
            </p>
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
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Phone or email"
              />
            </div>
          </div>
        </div>

        {/* Note about Drug Allergies */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Drug allergies can be managed from the patient detail page.
            The system supports multiple allergies per patient with severity tracking.
          </p>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-neutral-200">
          <Link
            href={`/admin/patients/${patientId}`}
            className="px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateMutation.isPending ? 'Updating Patient...' : 'Update Patient'}
          </button>
        </div>
      </form>
    </div>
  );
}
