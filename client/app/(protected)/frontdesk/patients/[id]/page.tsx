'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Edit2, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  User, 
  Shield, 
  FileText, 
  Activity,
  AlertCircle,
  CheckCircle2,
  UserCircle,
  Briefcase,
  Heart,
  Users,
  Stethoscope,
  Building2,
  Globe,
  MessageCircle,
  Copy,
  ExternalLink
} from 'lucide-react';
import { usePatient } from '@/hooks/usePatients';
import { type Patient } from '@/services/patient.service';
import { usePermissions } from '@/hooks/usePermissions';
import { buildPermission } from '@/lib/permissions';
import { PERMISSION_DOMAINS, PERMISSION_ACTIONS } from '@/lib/constants';
import { format } from 'date-fns';

/**
 * Calculate age from date of birth
 */
function calculateAge(dateOfBirth: string | Date | undefined): number | null {
  if (!dateOfBirth) return null;
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
  return format(d, 'MMMM d, yyyy');
}

/**
 * Format date short
 */
function formatDateShort(date: string | Date | undefined): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'MM/dd/yyyy');
}

/**
 * Enhanced Front Desk Patient Detail Page
 * 
 * Features:
 * - Modern card-based layout
 * - Comprehensive patient information display
 * - Quick actions (Edit, View Records, etc.)
 * - Status indicators
 * - Better visual hierarchy
 * - Icons for better UX
 */
export default function FrontDeskPatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;
  const { hasPermission } = usePermissions();

  const { data: patient, isLoading, error } = usePatient(patientId);

  const canWrite = hasPermission(buildPermission(PERMISSION_DOMAINS.PATIENTS, '*', PERMISSION_ACTIONS.WRITE));
  const canReadRecords = hasPermission(buildPermission(PERMISSION_DOMAINS.MEDICAL_RECORDS, '*', PERMISSION_ACTIONS.READ));

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center min-h-[400px]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        <p className="mt-4 text-slate-500 font-medium">Loading patient information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 mb-4">
            <Shield className="h-6 w-6 text-rose-600" />
          </div>
          <h3 className="text-rose-800 font-semibold text-lg">Unable to load patient</h3>
          <p className="text-rose-600 mt-2">{(error as any)?.message || 'There was a problem connecting to the server.'}</p>
          <div className="mt-6">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-sm font-medium text-rose-600 hover:text-rose-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 mb-4">
            <AlertCircle className="h-6 w-6 text-yellow-600" />
          </div>
          <h3 className="text-yellow-800 font-semibold text-lg">Patient not found</h3>
          <p className="text-yellow-600 mt-2">The patient you are looking for does not exist or has been removed.</p>
          <div className="mt-6">
            <Link
              href="/frontdesk/patients"
              className="inline-flex items-center gap-2 text-sm font-medium text-yellow-600 hover:text-yellow-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to patients list
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Get primary next of kin contact
  const nextOfKin = patient.contacts?.find(contact => contact.isNextOfKin) || null;
  const emergencyContact = patient.contacts?.find(contact => contact.isEmergencyContact && !contact.isNextOfKin) || null;
  
  // Calculate age
  const age = patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : null;
  const fullName = [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(' ');

  // Get drug allergies
  const allergies = patient.allergies || [];

  // Copy to clipboard helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Navigation */}
      <nav className="mb-8">
        <Link
          href="/frontdesk/patients"
          className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Patient Records
        </Link>
      </nav>

      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <div className="px-6 py-6 sm:px-8 bg-gradient-to-r from-indigo-50 to-slate-50 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-3xl ring-4 ring-white shadow-lg">
                {patient.firstName?.[0]}{patient.lastName?.[0]}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                  {fullName}
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700">
                      <FileText className="h-3.5 w-3.5" />
                      {patient.fileNumber || patient.patientNumber || 'N/A'}
                    </span>
                    {patient.patientNumber && patient.patientNumber !== patient.fileNumber && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                        MRN: {patient.patientNumber}
                      </span>
                    )}
                  </div>
                  {patient.status && (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${
                      patient.status === 'ACTIVE' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        patient.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-500'
                      }`} />
                      {patient.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {canWrite && (
                <Link
                  href={`/frontdesk/patients/${patientId}/edit`}
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 transition-all"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit Patient
                </Link>
              )}
              {canReadRecords && (
                <Link
                  href={`/frontdesk/patients/${patientId}/records`}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-all"
                >
                  <FileText className="h-4 w-4" />
                  Medical Records
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Quick Info Bar */}
        <div className="px-6 py-4 sm:px-8 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {age !== null && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600">Age:</span>
                <span className="font-semibold text-slate-900">{age} years</span>
              </div>
            )}
            {patient.dateOfBirth && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600">DOB:</span>
                <span className="font-semibold text-slate-900">{formatDateShort(patient.dateOfBirth)}</span>
              </div>
            )}
            {patient.gender && (
              <div className="flex items-center gap-2 text-sm">
                <UserCircle className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600">Gender:</span>
                <span className="font-semibold text-slate-900">{patient.gender}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <User className="h-5 w-5 text-indigo-600" />
                Personal Information
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">First Name</label>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{patient.firstName}</p>
                </div>
                {patient.middleName && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Middle Name</label>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{patient.middleName}</p>
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Last Name</label>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{patient.lastName}</p>
                </div>
                {patient.dateOfBirth && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Date of Birth</label>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(patient.dateOfBirth)}</p>
                  </div>
                )}
                {age !== null && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Age</label>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{age} years</p>
                  </div>
                )}
                {patient.gender && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Gender</label>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{patient.gender}</p>
                  </div>
                )}
                {patient.occupation && (
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5" />
                      Occupation
                    </label>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{patient.occupation}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Phone className="h-5 w-5 text-indigo-600" />
                Contact Information
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {patient.email && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      Email
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{patient.email}</p>
                      <button
                        onClick={() => copyToClipboard(patient.email!)}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                        title="Copy email"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
                {patient.phone && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      Phone
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <a href={`tel:${patient.phone}`} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                        {patient.phone}
                      </a>
                      <button
                        onClick={() => copyToClipboard(patient.phone!)}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                        title="Copy phone"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
                {patient.whatsapp && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1">
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <a href={`https://wa.me/${patient.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                        {patient.whatsapp}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <button
                        onClick={() => copyToClipboard(patient.whatsapp!)}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                        title="Copy WhatsApp"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Address Information */}
          {(patient.address || patient.city || patient.state || patient.country) && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-indigo-600" />
                  Residence
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {patient.address && (
                    <div className="md:col-span-2">
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Address</label>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{patient.address}</p>
                    </div>
                  )}
                  {patient.city && (
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">City</label>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{patient.city}</p>
                    </div>
                  )}
                  {patient.state && (
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">State/Province</label>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{patient.state}</p>
                    </div>
                  )}
                  {patient.zipCode && (
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Zip Code</label>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{patient.zipCode}</p>
                    </div>
                  )}
                  {patient.country && (
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1">
                        <Globe className="h-3.5 w-3.5" />
                        Country
                      </label>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{patient.country}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Drug Allergies */}
          {allergies.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-rose-200 overflow-hidden">
              <div className="px-6 py-4 bg-rose-50 border-b border-rose-200">
                <h2 className="text-lg font-semibold text-rose-900 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-rose-600" />
                  Drug Allergies
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {allergies.map((allergy, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-rose-50 rounded-lg border border-rose-200">
                      <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-rose-900">{allergy.allergen}</p>
                        {allergy.allergyType && (
                          <p className="text-sm text-rose-700 mt-1">Type: {allergy.allergyType}</p>
                        )}
                        {allergy.severity && (
                          <p className="text-sm text-rose-700 mt-1">Severity: {allergy.severity}</p>
                        )}
                        {allergy.reaction && (
                          <p className="text-sm text-rose-600 mt-1">{allergy.reaction}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Next of Kin */}
          {nextOfKin && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-600" />
                  Next of Kin
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Name</label>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {nextOfKin.firstName} {nextOfKin.lastName}
                    </p>
                  </div>
                  {nextOfKin.relationship && (
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Relationship</label>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{nextOfKin.relationship}</p>
                    </div>
                  )}
                  {nextOfKin.phone && (
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        Contact
                      </label>
                      <div className="mt-1 flex items-center gap-2">
                        <a href={`tel:${nextOfKin.phone}`} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                          {nextOfKin.phone}
                        </a>
                        <button
                          onClick={() => copyToClipboard(nextOfKin.phone!)}
                          className="text-slate-400 hover:text-slate-600 transition-colors"
                          title="Copy phone"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                  {nextOfKin.email && (
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        Email
                      </label>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{nextOfKin.email}</p>
                        <button
                          onClick={() => copyToClipboard(nextOfKin.email!)}
                          className="text-slate-400 hover:text-slate-600 transition-colors"
                          title="Copy email"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Emergency Contact */}
          {emergencyContact && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-indigo-600" />
                  Emergency Contact
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Name</label>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {emergencyContact.firstName} {emergencyContact.lastName}
                    </p>
                  </div>
                  {emergencyContact.phone && (
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        Contact
                      </label>
                      <div className="mt-1 flex items-center gap-2">
                        <a href={`tel:${emergencyContact.phone}`} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                          {emergencyContact.phone}
                        </a>
                        <button
                          onClick={() => copyToClipboard(emergencyContact.phone!)}
                          className="text-slate-400 hover:text-slate-600 transition-colors"
                          title="Copy phone"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Doctor in Charge */}
          {patient.doctorInCharge && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-indigo-600" />
                  Doctor in Charge
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {patient.doctorInCharge.firstName} {patient.doctorInCharge.lastName}
                  </p>
                  {patient.doctorInCharge.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <a href={`mailto:${patient.doctorInCharge.email}`} className="text-sm text-indigo-600 hover:text-indigo-700">
                        {patient.doctorInCharge.email}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Patient Account Status */}
          {patient.userId && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-emerald-900">Patient Portal Access</h3>
                  <p className="text-sm text-emerald-700 mt-1">
                    This patient has a user account and can access the patient portal.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* System Information */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Activity className="h-5 w-5 text-indigo-600" />
                System Information
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-3 text-sm">
                {patient.createdAt && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Created</label>
                    <p className="mt-1 text-slate-900">{formatDate(patient.createdAt)}</p>
                  </div>
                )}
                {patient.updatedAt && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Last Updated</label>
                    <p className="mt-1 text-slate-900">{formatDate(patient.updatedAt)}</p>
                  </div>
                )}
                {patient.lifecycleState && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Status</label>
                    <p className="mt-1 text-slate-900">{patient.lifecycleState}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
