'use client';

import { FormField, SelectField, FormSection } from './PatientFormFields';
import { Phone, Mail } from 'lucide-react';

interface PatientFormData {
  firstName: string;
  lastName: string;
  middleName: string;
  dateOfBirth: string;
  gender: string;
  occupation: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface NextOfKinData {
  firstName: string;
  lastName: string;
  relationship: string;
  contact: string;
}

interface PatientFormSectionsProps {
  formData: PatientFormData;
  nextOfKin: NextOfKinData;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleNextOfKinChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export function PersonalInformationSection({
  formData,
  handleChange,
  handleKeyDown,
}: Omit<PatientFormSectionsProps, 'nextOfKin' | 'handleNextOfKinChange'>) {
  return (
    <FormSection title="Personal Information">
      <FormField
        label="First Name"
        name="firstName"
        value={formData.firstName}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        required
      />
      <FormField
        label="Last Name"
        name="lastName"
        value={formData.lastName}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        required
      />
      <FormField
        label="Middle Name"
        name="middleName"
        value={formData.middleName}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      <FormField
        label="Date of Birth"
        name="dateOfBirth"
        type="date"
        value={formData.dateOfBirth}
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
          { value: '', label: 'Select...' },
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
        placeholder="e.g., Engineer, Teacher, Business Owner"
      />
    </FormSection>
  );
}

export function ContactInformationSection({
  formData,
  handleChange,
  handleKeyDown,
}: Omit<PatientFormSectionsProps, 'nextOfKin' | 'handleNextOfKinChange'>) {
  return (
    <FormSection title="Contact Information">
      <FormField
        label="Email"
        name="email"
        type="email"
        value={formData.email}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        icon={<Mail className="h-4 w-4 text-neutral-400" />}
      />
      <FormField
        label="Tel (Primary Phone)"
        name="phone"
        type="tel"
        value={formData.phone}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="+254 700 000 000"
        icon={<Phone className="h-4 w-4 text-neutral-400" />}
      />
      <FormField
        label="WhatsApp"
        name="whatsapp"
        type="tel"
        value={formData.whatsapp}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="+254 700 000 000"
        icon={<Phone className="h-4 w-4 text-neutral-400" />}
      />
    </FormSection>
  );
}

export function ResidenceSection({
  formData,
  handleChange,
  handleKeyDown,
}: Omit<PatientFormSectionsProps, 'nextOfKin' | 'handleNextOfKinChange'>) {
  return (
    <FormSection title="Residence">
      <FormField
        label="Address"
        name="address"
        value={formData.address}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Street address"
        fullWidth
      />
      <FormField
        label="City (Residence)"
        name="city"
        value={formData.city}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        required
        placeholder="e.g., Nairobi"
      />
      <FormField
        label="State/Province"
        name="state"
        value={formData.state}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      <FormField
        label="ZIP/Postal Code"
        name="zipCode"
        value={formData.zipCode}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      <FormField
        label="Country"
        name="country"
        value={formData.country || 'Kenya'}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
    </FormSection>
  );
}

export function NextOfKinSection({
  nextOfKin,
  handleNextOfKinChange,
  handleKeyDown,
}: Pick<PatientFormSectionsProps, 'nextOfKin' | 'handleNextOfKinChange' | 'handleKeyDown'>) {
  return (
    <FormSection title="Next of Kin">
      <FormField
        label="First Name"
        name="firstName"
        value={nextOfKin.firstName}
        onChange={handleNextOfKinChange}
        onKeyDown={handleKeyDown}
      />
      <FormField
        label="Last Name"
        name="lastName"
        value={nextOfKin.lastName}
        onChange={handleNextOfKinChange}
        onKeyDown={handleKeyDown}
      />
      <SelectField
        label="Relation to Next of Kin"
        name="relationship"
        value={nextOfKin.relationship}
        onChange={handleNextOfKinChange}
        onKeyDown={handleKeyDown}
        options={[
          { value: '', label: 'Select relationship...' },
          { value: 'SPOUSE', label: 'Spouse' },
          { value: 'PARENT', label: 'Parent' },
          { value: 'CHILD', label: 'Child' },
          { value: 'SIBLING', label: 'Sibling' },
          { value: 'FRIEND', label: 'Friend' },
          { value: 'OTHER', label: 'Other' },
        ]}
      />
      <FormField
        label="Next of Kin Contact"
        name="contact"
        type="tel"
        value={nextOfKin.contact}
        onChange={handleNextOfKinChange}
        onKeyDown={handleKeyDown}
        placeholder="Phone or email"
      />
    </FormSection>
  );
}
