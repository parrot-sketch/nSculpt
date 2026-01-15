'use client';

import { useState, useEffect } from 'react';
import { usePatientProfile, useUpdatePatientProfile } from '@/hooks/usePatientSelf';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { ArrowLeft, User, Mail, Phone, MapPin, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { type Patient } from '@/services/patient.service';

/**
 * Patient Profile Page
 * 
 * Patients can view and edit their own profile information.
 * Only demographic and contact fields - no clinical data.
 */
export default function PatientProfilePage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Patient>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Get patient profile
  const { data: patient, isLoading, error } = usePatientProfile();
  const updateMutation = useUpdatePatientProfile();

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
        occupation: patient.occupation || '',
        address: typeof patient.address === 'string' ? patient.address : patient.address?.street || '',
        city: patient.city || '',
        state: patient.state || '',
        zipCode: patient.zipCode || '',
        country: patient.country || 'Kenya',
      });
    }
  }, [patient]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    // Clear success message when editing
    if (successMessage) {
      setSuccessMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage(null);

    // Basic validation
    const newErrors: Record<string, string> = {};
    if (!formData.firstName?.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName?.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await updateMutation.mutateAsync(formData);
      setSuccessMessage('Profile updated successfully');
      setIsEditing(false);
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrors({
        submit: err?.message || 'Failed to update profile. Please try again.',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-8">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center">
          <AlertCircle className="h-12 w-12 text-rose-600 mx-auto mb-4" />
          <p className="text-rose-800 font-medium">Unable to load profile</p>
          <p className="text-rose-600 text-sm mt-2">
            {(error as any)?.message || 'There was a problem loading your profile. Please try again.'}
          </p>
          <Link
            href="/patient/dashboard"
            className="inline-block mt-4 text-sm text-rose-600 hover:text-rose-800 underline"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <p className="text-yellow-800 font-medium">Profile not found</p>
          <p className="text-yellow-600 text-sm mt-2">
            Your patient profile could not be found. Please contact support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/patient/dashboard"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
        <p className="text-slate-600 mt-1">Manage your personal information</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-2xl">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              Edit Profile
            </button>
          )}
        </div>

        <div className="p-6">
          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              <p className="text-emerald-800 text-sm font-medium">{successMessage}</p>
            </div>
          )}

          {/* Error Message */}
          {errors.submit && (
            <div className="mb-6 bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
              <p className="text-rose-800 text-sm font-medium">{errors.submit}</p>
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-2">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      required
                      value={formData.firstName || ''}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.firstName ? 'border-rose-300' : 'border-slate-300'
                      }`}
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-rose-600">{errors.firstName}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-2">
                      Last Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      required
                      value={formData.lastName || ''}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.lastName ? 'border-rose-300' : 'border-slate-300'
                      }`}
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-rose-600">{errors.lastName}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="middleName" className="block text-sm font-medium text-slate-700 mb-2">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      id="middleName"
                      name="middleName"
                      value={formData.middleName || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="occupation" className="block text-sm font-medium text-slate-700 mb-2">
                      Occupation
                    </label>
                    <input
                      type="text"
                      id="occupation"
                      name="occupation"
                      value={formData.occupation || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email || ''}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.email ? 'border-rose-300' : 'border-slate-300'
                      }`}
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-rose-600">{errors.email}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="whatsapp" className="block text-sm font-medium text-slate-700 mb-2">
                      WhatsApp
                    </label>
                    <input
                      type="tel"
                      id="whatsapp"
                      name="whatsapp"
                      value={formData.whatsapp || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-2">
                      Street Address
                    </label>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value={formData.address || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-slate-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-slate-700 mb-2">
                      State/Province
                    </label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      value={formData.state || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="zipCode" className="block text-sm font-medium text-slate-700 mb-2">
                      Zip Code
                    </label>
                    <input
                      type="text"
                      id="zipCode"
                      name="zipCode"
                      value={formData.zipCode || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-slate-700 mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      id="country"
                      name="country"
                      value={formData.country || 'Kenya'}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setErrors({});
                    setSuccessMessage(null);
                    // Reset form data to patient data
                    if (patient) {
                      setFormData({
                        firstName: patient.firstName || '',
                        lastName: patient.lastName || '',
                        middleName: patient.middleName || '',
                        email: patient.email || '',
                        phone: patient.phone || '',
                        whatsapp: patient.whatsapp || '',
                        occupation: patient.occupation || '',
                        address: typeof patient.address === 'string' ? patient.address : patient.address?.street || '',
                        city: patient.city || '',
                        state: patient.state || '',
                        zipCode: patient.zipCode || '',
                        country: patient.country || 'Kenya',
                      });
                    }
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={updateMutation.isPending}
                >
                  <Save className="h-4 w-4" />
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1 mb-2">
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </label>
                <p className="text-sm font-semibold text-slate-900">{patient.email || 'N/A'}</p>
              </div>
              {patient.phone && (
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1 mb-2">
                    <Phone className="h-3.5 w-3.5" />
                    Phone
                  </label>
                  <p className="text-sm font-semibold text-slate-900">{patient.phone}</p>
                </div>
              )}
              {patient.whatsapp && (
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1 mb-2">
                    <Phone className="h-3.5 w-3.5" />
                    WhatsApp
                  </label>
                  <p className="text-sm font-semibold text-slate-900">{patient.whatsapp}</p>
                </div>
              )}
              {patient.occupation && (
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                    Occupation
                  </label>
                  <p className="text-sm font-semibold text-slate-900">{patient.occupation}</p>
                </div>
              )}
              {(patient.address || patient.city) && (
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1 mb-2">
                    <MapPin className="h-3.5 w-3.5" />
                    Address
                  </label>
                  <p className="text-sm font-semibold text-slate-900">
                    {[
                      typeof patient.address === 'string' ? patient.address : patient.address?.street,
                      patient.city,
                      patient.state,
                      patient.zipCode,
                      patient.country,
                    ]
                      .filter(Boolean)
                      .join(', ') || 'N/A'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
