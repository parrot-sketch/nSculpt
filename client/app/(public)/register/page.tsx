'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';

/**
 * Patient Self-Registration Page
 * 
 * Public patient registration form for self-registration.
 * 
 * Workflow:
 * 1. Patient navigates to /register (public route)
 * 2. Patient fills form with their information
 * 3. Patient submits
 * 4. System creates patient record + user account
 * 5. Patient receives credentials via email
 * 
 * Use Cases:
 * - Online pre-registration (patient's own device)
 * - Tablet/kiosk at front desk (front desk navigates to /register and hands tablet to patient)
 * - Mobile app registration
 * 
 * Privacy: Patient enters their own data, maintaining privacy and reducing errors.
 */

interface RegistrationFormData {
  // Personal Information
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string;
  gender?: string;

  // Contact Information
  email: string;
  phone?: string;
  whatsapp?: string;

  // Address / Residence
  address?: string;
  city?: string; // Required for residence
  state?: string;
  zipCode?: string;
  country?: string;

  // Additional Information
  occupation?: string;

  // Account
  password: string;
  confirmPassword: string;

  // Emergency Contact / Next of Kin
  nextOfKinFirstName?: string;
  nextOfKinLastName?: string;
  nextOfKinRelationship?: string;
  nextOfKinContact?: string;
}

export default function PatientRegistrationPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<RegistrationFormData>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    email: '',
    password: '',
    confirmPassword: '',
    country: 'Kenya',
    city: '', // Residence
    occupation: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordStrength, setPasswordStrength] = useState(0);

  const totalSteps = 5;

  const registrationMutation = useMutation({
    mutationFn: async (data: RegistrationFormData) => {
      const { confirmPassword, ...submitData } = data;
      const response = await fetch('http://localhost:3002/api/v1/public/patients/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Show success message
      alert(`Registration successful! Your patient number is: ${data.patient.patientNumber}\n\nPlease check your email for account confirmation.`);
      
      // Redirect to login
      router.push('/login?registered=true');
    },
    onError: (error: Error) => {
      setErrors({ submit: error.message });
    },
  });

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
      if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
      if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
      
      // Validate date of birth is in the past
      if (formData.dateOfBirth && new Date(formData.dateOfBirth) >= new Date()) {
        newErrors.dateOfBirth = 'Date of birth must be in the past';
      }
    }

    if (step === 2) {
      if (!formData.email.trim()) newErrors.email = 'Email is required';
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    if (step === 4) {
      if (!formData.password) newErrors.password = 'Password is required';
      if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      }
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        newErrors.password = 'Password must contain uppercase, lowercase, and number';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(Math.min(currentStep + 1, totalSteps));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(Math.max(currentStep - 1, 1));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep(4)) {
      registrationMutation.mutate(formData);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Calculate password strength
    if (name === 'password') {
      let strength = 0;
      if (value.length >= 8) strength++;
      if (/[a-z]/.test(value)) strength++;
      if (/[A-Z]/.test(value)) strength++;
      if (/\d/.test(value)) strength++;
      if (/[^a-zA-Z\d]/.test(value)) strength++;
      setPasswordStrength(strength);
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 2) return 'bg-red-500';
    if (passwordStrength <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Patient Registration</h1>
          <p className="text-blue-100 text-sm sm:text-base">
            Please provide your information to create your patient account
          </p>
        </div>

        {/* Progress Bar */}
        <div className="px-6 sm:px-8 pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-neutral-600">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-sm font-medium text-neutral-600">
              {Math.round((currentStep / totalSteps) * 100)}%
            </span>
          </div>
          <div className="w-full bg-neutral-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8">
          {errors.submit && (
            <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium">{errors.submit}</p>
            </div>
          )}

          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">Personal Information</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                    className={`w-full h-12 sm:h-14 px-4 sm:px-6 text-base sm:text-lg border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20 ${
                      errors.firstName ? 'border-red-500' : 'border-neutral-300'
                    }`}
                    placeholder="Enter your first name"
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                  )}
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
                    className={`w-full h-12 sm:h-14 px-4 sm:px-6 text-base sm:text-lg border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20 ${
                      errors.lastName ? 'border-red-500' : 'border-neutral-300'
                    }`}
                    placeholder="Enter your last name"
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="middleName" className="block text-sm font-medium text-neutral-700 mb-2">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    id="middleName"
                    name="middleName"
                    value={formData.middleName || ''}
                    onChange={handleChange}
                    className="w-full h-12 sm:h-14 px-4 sm:px-6 text-base sm:text-lg border-2 border-neutral-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                    placeholder="Enter your middle name (optional)"
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
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    max={new Date().toISOString().split('T')[0]}
                    className={`w-full h-12 sm:h-14 px-4 sm:px-6 text-base sm:text-lg border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20 ${
                      errors.dateOfBirth ? 'border-red-500' : 'border-neutral-300'
                    }`}
                  />
                  {errors.dateOfBirth && (
                    <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-neutral-700 mb-2">
                    Gender
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender || ''}
                    onChange={handleChange}
                    className="w-full h-12 sm:h-14 px-4 sm:px-6 text-base sm:text-lg border-2 border-neutral-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                  >
                    <option value="">Select gender (optional)</option>
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
                    value={formData.occupation || ''}
                    onChange={handleChange}
                    className="w-full h-12 sm:h-14 px-4 sm:px-6 text-base sm:text-lg border-2 border-neutral-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                    placeholder="e.g., Engineer, Teacher"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Contact Information */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">Contact Information</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                  <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full h-12 sm:h-14 px-4 sm:px-6 text-base sm:text-lg border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20 ${
                      errors.email ? 'border-red-500' : 'border-neutral-300'
                    }`}
                    placeholder="your.email@example.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                  <p className="mt-1 text-sm text-neutral-500">
                    This will be used for your patient portal login
                  </p>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleChange}
                    className="w-full h-12 sm:h-14 px-4 sm:px-6 text-base sm:text-lg border-2 border-neutral-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                    placeholder="+254 700 000 000"
                  />
                </div>

                <div>
                  <label htmlFor="whatsapp" className="block text-sm font-medium text-neutral-700 mb-2">
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    id="whatsapp"
                    name="whatsapp"
                    value={formData.whatsapp || ''}
                    onChange={handleChange}
                    className="w-full h-12 sm:h-14 px-4 sm:px-6 text-base sm:text-lg border-2 border-neutral-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                    placeholder="+254 700 000 000"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="address" className="block text-sm font-medium text-neutral-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address || ''}
                    onChange={handleChange}
                    className="w-full h-12 sm:h-14 px-4 sm:px-6 text-base sm:text-lg border-2 border-neutral-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20"
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
                    value={formData.city || ''}
                    onChange={handleChange}
                    className="w-full h-12 sm:h-14 px-4 sm:px-6 text-base sm:text-lg border-2 border-neutral-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20"
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
                    value={formData.state || ''}
                    onChange={handleChange}
                    className="w-full h-12 sm:h-14 px-4 sm:px-6 text-base sm:text-lg border-2 border-neutral-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                    placeholder="State or Province"
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
                    value={formData.zipCode || ''}
                    onChange={handleChange}
                    className="w-full h-12 sm:h-14 px-4 sm:px-6 text-base sm:text-lg border-2 border-neutral-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                    placeholder="ZIP Code"
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
                    className="w-full h-12 sm:h-14 px-4 sm:px-6 text-base sm:text-lg border-2 border-neutral-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                    placeholder="Country"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Emergency Contact */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">Emergency Contact</h2>
              <p className="text-neutral-600 mb-6">
                Please provide contact information for your next of kin or emergency contact
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="nextOfKinFirstName" className="block text-sm font-medium text-neutral-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="nextOfKinFirstName"
                    name="nextOfKinFirstName"
                    value={formData.nextOfKinFirstName || ''}
                    onChange={handleChange}
                    className="w-full h-12 sm:h-14 px-4 sm:px-6 text-base sm:text-lg border-2 border-neutral-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                    placeholder="First name"
                  />
                </div>

                <div>
                  <label htmlFor="nextOfKinLastName" className="block text-sm font-medium text-neutral-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="nextOfKinLastName"
                    name="nextOfKinLastName"
                    value={formData.nextOfKinLastName || ''}
                    onChange={handleChange}
                    className="w-full h-12 sm:h-14 px-4 sm:px-6 text-base sm:text-lg border-2 border-neutral-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                    placeholder="Last name"
                  />
                </div>

                <div>
                  <label htmlFor="nextOfKinRelationship" className="block text-sm font-medium text-neutral-700 mb-2">
                    Relationship
                  </label>
                  <select
                    id="nextOfKinRelationship"
                    name="nextOfKinRelationship"
                    value={formData.nextOfKinRelationship || ''}
                    onChange={handleChange}
                    className="w-full h-12 sm:h-14 px-4 sm:px-6 text-base sm:text-lg border-2 border-neutral-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                  >
                    <option value="">Select relationship</option>
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
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    id="nextOfKinContact"
                    name="nextOfKinContact"
                    value={formData.nextOfKinContact || ''}
                    onChange={handleChange}
                    className="w-full h-12 sm:h-14 px-4 sm:px-6 text-base sm:text-lg border-2 border-neutral-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                    placeholder="+254 700 000 000"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Account Creation */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">Create Your Account</h2>
              <p className="text-neutral-600 mb-6">
                Create a password for your patient portal account
              </p>
              
              <div className="space-y-6">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full h-12 sm:h-14 px-4 sm:px-6 text-base sm:text-lg border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20 ${
                      errors.password ? 'border-red-500' : 'border-neutral-300'
                    }`}
                    placeholder="Enter password"
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                  )}
                  
                  {/* Password Strength Indicator */}
                  {formData.password && (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className={`h-2 flex-1 rounded ${
                              level <= passwordStrength
                                ? getPasswordStrengthColor()
                                : 'bg-neutral-200'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="mt-1 text-xs text-neutral-500">
                        Password strength: {passwordStrength <= 2 ? 'Weak' : passwordStrength <= 3 ? 'Medium' : 'Strong'}
                      </p>
                    </div>
                  )}

                  <div className="mt-2 text-xs text-neutral-500">
                    <p>Password must:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Be at least 8 characters long</li>
                      <li>Contain at least one uppercase letter</li>
                      <li>Contain at least one lowercase letter</li>
                      <li>Contain at least one number</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700 mb-2">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`w-full h-12 sm:h-14 px-4 sm:px-6 text-base sm:text-lg border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20 ${
                      errors.confirmPassword ? 'border-red-500' : 'border-neutral-300'
                    }`}
                    placeholder="Confirm password"
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review & Submit */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">Review Your Information</h2>
              <p className="text-neutral-600 mb-6">
                Please review your information before submitting
              </p>

              <div className="bg-neutral-50 rounded-lg p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-neutral-900 mb-2">Personal Information</h3>
                  <div className="text-neutral-600 space-y-1">
                    <p><strong>Name:</strong> {formData.firstName} {formData.middleName} {formData.lastName}</p>
                    <p><strong>Date of Birth:</strong> {formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString() : 'Not provided'}</p>
                    <p><strong>Gender:</strong> {formData.gender || 'Not provided'}</p>
                    <p><strong>Occupation:</strong> {formData.occupation || 'Not provided'}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-neutral-900 mb-2">Contact Information</h3>
                  <div className="text-neutral-600 space-y-1">
                    <p><strong>Email:</strong> {formData.email}</p>
                    <p><strong>Phone:</strong> {formData.phone || 'Not provided'}</p>
                    <p><strong>WhatsApp:</strong> {formData.whatsapp || 'Not provided'}</p>
                    <p><strong>Address:</strong> {formData.address || 'Not provided'}</p>
                    <p><strong>City (Residence):</strong> {formData.city || 'Not provided'}</p>
                  </div>
                </div>

                {formData.nextOfKinFirstName && (
                  <div>
                    <h3 className="font-semibold text-neutral-900 mb-2">Emergency Contact</h3>
                    <div className="text-neutral-600 space-y-1">
                      <p><strong>Name:</strong> {formData.nextOfKinFirstName} {formData.nextOfKinLastName}</p>
                      <p><strong>Relationship:</strong> {formData.nextOfKinRelationship || 'Not specified'}</p>
                      <p><strong>Contact:</strong> {formData.nextOfKinContact || 'Not provided'}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> By submitting this form, you agree to our Terms of Service and Privacy Policy.
                  Your information will be kept confidential and secure.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 flex justify-between gap-4">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-medium text-neutral-700 bg-white border-2 border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={registrationMutation.isPending}
                className="px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {registrationMutation.isPending ? 'Submitting...' : 'Submit Registration'}
              </button>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 sm:px-8 py-4 bg-neutral-50 border-t border-neutral-200 text-center">
          <p className="text-sm text-neutral-600">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

