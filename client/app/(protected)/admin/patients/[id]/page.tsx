'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { patientService, type Patient } from '@/services/patient.service';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import Link from 'next/link';

/**
 * Calculate age from date of birth
 */
function calculateAge(dateOfBirth: string | Date): number {
  const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

/**
 * Format date for display
 */
function formatDate(date: string | Date | undefined): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * Admin Patient Detail Page
 * 
 * View detailed information about a specific patient.
 * Displays fields in the exact order specified:
 * 1. File No. (NS001)
 * 2. Patient Name (single column)
 * 3. Age
 * 4. DOB
 * 5. Email
 * 6. Tel
 * 7. WhatsApp
 * 8. Occupation
 * 9. Drug Allergies
 * 10. Residence
 * 11. Next of Kin
 * 12. Relation to Next of Kin
 * 13. Next of Kin Contact
 * 14. Doctor in Charge
 * 15. Services (when required)
 */
export default function AdminPatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const { data: patient, isLoading, error } = useQuery({
    queryKey: ['admin', 'patients', patientId],
    queryFn: () => patientService.getPatient(patientId),
    enabled: !!patientId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to load patient.</p>
          <button
            onClick={() => router.back()}
            className="mt-4 text-sm text-red-600 hover:text-red-800 underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Patient not found.</p>
          <Link
            href="/admin/patients"
            className="mt-4 inline-block text-sm text-yellow-600 hover:text-yellow-800 underline"
          >
            Back to patients list
          </Link>
        </div>
      </div>
    );
  }

  // Get primary next of kin contact
  const nextOfKin = patient.contacts?.find(contact => contact.isNextOfKin) || null;
  
  // Calculate age
  const age = patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Patient Record</h1>
          <p className="mt-2 text-neutral-600">Patient Details</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/patients/${patientId}/edit`}
            className="px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Edit
          </Link>
          <Link
            href="/admin/patients"
            className="px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Back to List
          </Link>
        </div>
      </div>

      {/* Patient Information - Displayed in exact order specified */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
        <h2 className="text-xl font-semibold text-neutral-900 mb-6">Patient Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. File No. */}
          <div>
            <label className="text-sm font-medium text-neutral-500">File No.</label>
            <p className="mt-1 text-lg font-semibold text-neutral-900">
              {patient.fileNumber || patient.patientNumber || 'N/A'}
            </p>
          </div>

          {/* 2. Patient Name (single column) */}
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-neutral-500">Patient Name</label>
            <p className="mt-1 text-lg font-semibold text-neutral-900">
              {patient.firstName} {patient.middleName ? `${patient.middleName} ` : ''}{patient.lastName}
            </p>
          </div>

          {/* 3. Age */}
          {age !== null && (
            <div>
              <label className="text-sm font-medium text-neutral-500">Age</label>
              <p className="mt-1 text-sm text-neutral-900">{age} years</p>
            </div>
          )}

          {/* 4. DOB */}
          {patient.dateOfBirth && (
            <div>
              <label className="text-sm font-medium text-neutral-500">Date of Birth</label>
              <p className="mt-1 text-sm text-neutral-900">{formatDate(patient.dateOfBirth)}</p>
            </div>
          )}

          {/* 5. Email */}
          {patient.email && (
            <div>
              <label className="text-sm font-medium text-neutral-500">Email</label>
              <p className="mt-1 text-sm text-neutral-900">{patient.email}</p>
            </div>
          )}

          {/* 6. Tel */}
          {patient.phone && (
            <div>
              <label className="text-sm font-medium text-neutral-500">Tel</label>
              <p className="mt-1 text-sm text-neutral-900">{patient.phone}</p>
            </div>
          )}

          {/* 7. WhatsApp */}
          {patient.whatsapp && (
            <div>
              <label className="text-sm font-medium text-neutral-500">WhatsApp</label>
              <p className="mt-1 text-sm text-neutral-900">{patient.whatsapp}</p>
            </div>
          )}

          {/* 8. Occupation */}
          {patient.occupation && (
            <div>
              <label className="text-sm font-medium text-neutral-500">Occupation</label>
              <p className="mt-1 text-sm text-neutral-900">{patient.occupation}</p>
            </div>
          )}

          {/* 9. Drug Allergies */}
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-neutral-500">Drug Allergies</label>
            {patient.allergies && patient.allergies.length > 0 ? (
              <div className="mt-2 space-y-2">
                {patient.allergies.map((allergy) => (
                  <div key={allergy.id} className="flex items-start gap-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      allergy.severity === 'SEVERE' || allergy.severity === 'LIFE_THREATENING'
                        ? 'bg-red-100 text-red-800'
                        : allergy.severity === 'MODERATE'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {allergy.severity}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{allergy.allergen}</p>
                      {allergy.reaction && (
                        <p className="text-xs text-neutral-600">{allergy.reaction}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-sm text-neutral-500 italic">No known allergies</p>
            )}
          </div>

          {/* 10. Residence */}
          {(patient.city || patient.address?.city) && (
            <div>
              <label className="text-sm font-medium text-neutral-500">Residence</label>
              <p className="mt-1 text-sm text-neutral-900">
                {patient.city || patient.address?.city || 'N/A'}
              </p>
            </div>
          )}

          {/* 11. Next of Kin */}
          {nextOfKin && (
            <div>
              <label className="text-sm font-medium text-neutral-500">Next of Kin</label>
              <p className="mt-1 text-sm text-neutral-900">
                {nextOfKin.firstName} {nextOfKin.lastName}
              </p>
            </div>
          )}

          {/* 12. Relation to Next of Kin */}
          {nextOfKin && (
            <div>
              <label className="text-sm font-medium text-neutral-500">Relation to Next of Kin</label>
              <p className="mt-1 text-sm text-neutral-900">
                {nextOfKin.relationship || 'N/A'}
              </p>
            </div>
          )}

          {/* 13. Next of Kin Contact */}
          {nextOfKin && (
            <div>
              <label className="text-sm font-medium text-neutral-500">Next of Kin Contact</label>
              <p className="mt-1 text-sm text-neutral-900">
                {nextOfKin.phone || nextOfKin.email || 'N/A'}
              </p>
            </div>
          )}

          {/* 14. Doctor in Charge */}
          {patient.doctorInCharge && (
            <div>
              <label className="text-sm font-medium text-neutral-500">Doctor in Charge</label>
              <p className="mt-1 text-sm text-neutral-900">
                Dr. {patient.doctorInCharge.firstName} {patient.doctorInCharge.lastName}
              </p>
            </div>
          )}

          {/* 15. Services - Placeholder for when required */}
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-neutral-500">Services</label>
            <p className="mt-1 text-sm text-neutral-500 italic">
              Services can be provided when required
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
        <h2 className="text-xl font-semibold text-neutral-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/patients/${patientId}/edit`}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Edit Patient
          </Link>
          <Link
            href={`/admin/patients/${patientId}/consents`}
            className="px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            View Consents
          </Link>
        </div>
      </div>
    </div>
  );
}
