'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Mail,
  Phone,
  MapPin,
  Eye,
  Edit2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Users,
  Shield,
  FileText,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { ActionsDropdown } from '@/components/ui/ActionsDropdown';
import { usePatients } from '@/hooks/usePatients';
import { type Patient } from '@/services/patient.service';
import { usePermissions } from '@/hooks/usePermissions';
import { buildPermission } from '@/lib/permissions';
import { PERMISSION_DOMAINS, PERMISSION_ACTIONS } from '@/lib/constants';

type SortField = 'fileNumber' | 'firstName' | 'lastName' | 'age' | 'dateOfBirth' | 'phone' | 'city';
type SortOrder = 'asc' | 'desc';

/**
 * Enhanced Front Desk Patient Records Page
 * 
 * Features:
 * - Sortable columns (especially File No. as requested)
 * - Advanced search and filtering
 * - Pagination
 * - Modern UI following admin design patterns
 * - Status indicators
 * - Quick actions dropdown
 */
export default function FrontDeskPatientsPage() {
  const { hasPermission } = usePermissions();
  const [search, setSearch] = useState('');
  const [skip, setSkip] = useState(0);
  const [take] = useState(50); // Show 50 patients per page
  const [sortField, setSortField] = useState<SortField>('fileNumber');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const canWrite = hasPermission(buildPermission(PERMISSION_DOMAINS.PATIENTS, '*', PERMISSION_ACTIONS.WRITE));

  // Fetch patients with search
  const { data, isLoading, error } = usePatients({
    skip,
    take,
    search: search || undefined,
  });

  const patients = data?.data || [];
  const total = data?.total || 0;

  // Client-side sorting (since backend doesn't support sorting yet)
  const sortedPatients = useMemo(() => {
    if (!patients.length) return [];

    const sorted = [...patients].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'fileNumber':
          aValue = a.fileNumber || '';
          bValue = b.fileNumber || '';
          // Sort file numbers numerically (NS001, NS002, etc.)
          const aNum = parseInt(aValue.replace('NS', '') || '0');
          const bNum = parseInt(bValue.replace('NS', '') || '0');
          return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
        case 'firstName':
          aValue = (a.firstName || '').toLowerCase();
          bValue = (b.firstName || '').toLowerCase();
          break;
        case 'lastName':
          aValue = (a.lastName || '').toLowerCase();
          bValue = (b.lastName || '').toLowerCase();
          break;
        case 'age':
          aValue = a.age ?? calculateAge(a.dateOfBirth);
          bValue = b.age ?? calculateAge(b.dateOfBirth);
          if (aValue === null) aValue = 0;
          if (bValue === null) bValue = 0;
          break;
        case 'dateOfBirth':
          aValue = a.dateOfBirth ? new Date(a.dateOfBirth).getTime() : 0;
          bValue = b.dateOfBirth ? new Date(b.dateOfBirth).getTime() : 0;
          break;
        case 'phone':
          aValue = (a.phone || '').toLowerCase();
          bValue = (b.phone || '').toLowerCase();
          break;
        case 'city':
          aValue = (a.city || '').toLowerCase();
          bValue = (b.city || '').toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [patients, sortField, sortOrder]);

  // Calculate age helper
  function calculateAge(dob: string | Date | undefined): number | null {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  // Format date helper
  function formatDOB(dob: string | Date | undefined): string {
    if (!dob) return 'N/A';
    const date = new Date(dob);
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  }

  // Format full name
  function getFullName(patient: Patient): string {
    return [patient.firstName, patient.middleName, patient.lastName]
      .filter(Boolean)
      .join(' ');
  }

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Sort icon
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="h-4 w-4 text-slate-400" />;
    }
    return sortOrder === 'asc'
      ? <ChevronUp className="h-4 w-4 text-brand-gold" />
      : <ChevronDown className="h-4 w-4 text-brand-gold" />;
  };

  // Pagination
  const totalPages = Math.ceil(total / take);
  const currentPage = Math.floor(skip / take) + 1;

  const handlePreviousPage = () => {
    if (skip > 0) {
      setSkip(Math.max(0, skip - take));
    }
  };

  const handleNextPage = () => {
    if (skip + take < total) {
      setSkip(skip + take);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center min-h-[400px]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-teal/20 border-t-brand-teal" />
        <p className="mt-4 text-brand-teal font-medium">Loading patients...</p>
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
          <h3 className="text-rose-800 font-semibold text-lg">Unable to load patients</h3>
          <p className="text-rose-600 mt-2">{(error as any)?.message || 'There was a problem connecting to the server.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patient Records</h1>
          <p className="mt-2 text-sm text-slate-500 max-w-2xl">
            Manage patient information, view records, and access patient details. All data is filtered by your access permissions.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          {canWrite && (
            <Link
              href="/frontdesk/patients/new"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-teal px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:shadow-xl hover:bg-brand-teal-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal transition-all duration-300 transform hover:-translate-y-0.5"
            >
              <Plus className="h-4.5 w-4.5" />
              Add New Patient
            </Link>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <div className="relative max-w-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            className="block w-full rounded-xl border-0 py-3 pl-10 pr-3 text-brand-teal ring-1 ring-inset ring-neutral-200 placeholder:text-neutral-400 focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 shadow-sm transition-all bg-white/50 backdrop-blur-sm"
            placeholder="Search by name, file number, phone, or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSkip(0); // Reset to first page on search
            }}
          />
        </div>
      </div>

      {/* Results Summary */}
      {total > 0 && (
        <div className="mb-4 text-sm text-slate-600">
          Showing {skip + 1} to {Math.min(skip + take, total)} of {total} patients
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th
                  scope="col"
                  className="py-3.5 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:pl-6 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('fileNumber')}
                >
                  <div className="flex items-center gap-2">
                    File No.
                    <SortIcon field="fileNumber" />
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('lastName')}
                >
                  <div className="flex items-center gap-2">
                    Patient Name
                    <SortIcon field="lastName" />
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('age')}
                >
                  <div className="flex items-center gap-2">
                    Age
                    <SortIcon field="age" />
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('dateOfBirth')}
                >
                  <div className="flex items-center gap-2">
                    DOB
                    <SortIcon field="dateOfBirth" />
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('phone')}
                >
                  <div className="flex items-center gap-2">
                    Phone
                    <SortIcon field="phone" />
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('city')}
                >
                  <div className="flex items-center gap-2">
                    City
                    <SortIcon field="city" />
                  </div>
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Next of Kin
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Next of Kin Contact
                </th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {sortedPatients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="bg-slate-50 rounded-full p-4 mb-3">
                        <Users className="h-8 w-8 text-slate-300" />
                      </div>
                      <p className="text-base font-semibold text-slate-900">No patients found</p>
                      <p className="mt-1 text-sm">
                        {search
                          ? 'Try adjusting your search terms or clear the search to see all patients.'
                          : 'Patients will appear here once they are registered.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedPatients.map((patient) => {
                  const age = patient.age ?? calculateAge(patient.dateOfBirth);
                  const fullName = getFullName(patient);

                  // Get next of kin from contacts array
                  const nextOfKin = patient.contacts?.find(c => c.isNextOfKin) ||
                    (patient.nextOfKinRelationship ? {
                      firstName: patient.nextOfKinName?.split(' ')[0] || '',
                      lastName: patient.nextOfKinName?.split(' ').slice(1).join(' ') || '',
                      relationship: patient.nextOfKinRelationship,
                      phone: patient.nextOfKinContact,
                    } : null);

                  return (
                    <tr key={patient.id} className="hover:bg-neutral-50/80 transition-colors duration-150 group">
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                        <Link href={`/frontdesk/patients/${patient.id}`} className="group/link flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-neutral-100 flex items-center justify-center text-spaceCadet font-bold text-sm group-hover/link:ring-2 group-hover/link:ring-lion group-hover/link:ring-offset-2 transition-all">
                            {patient.fileNumber?.replace('NS', '') || '?'}
                          </div>
                          <div className="ml-4">
                            <div className="font-medium text-spaceCadet group-hover/link:text-lion transition-colors">
                              {patient.fileNumber || 'N/A'}
                            </div>
                            {patient.patientNumber && (
                              <div className="text-xs text-slate-500">MRN: {patient.patientNumber}</div>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4">
                        <Link href={`/frontdesk/patients/${patient.id}`} className="group/link">
                          <div className="font-medium text-spaceCadet group-hover/link:text-lion transition-colors">
                            {fullName}
                          </div>
                          {patient.email && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                              <Mail className="h-3 w-3" />
                              {patient.email}
                            </div>
                          )}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                        {age !== null ? (
                          <span className="font-medium text-slate-900">{age}</span>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                        {formatDOB(patient.dateOfBirth)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          {patient.phone ? (
                            <>
                              <Phone className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-slate-900">{patient.phone}</span>
                            </>
                          ) : (
                            <span className="text-slate-400">N/A</span>
                          )}
                        </div>
                        {patient.whatsapp && patient.whatsapp !== patient.phone && (
                          <div className="text-xs text-emerald-600 mt-1">WA: {patient.whatsapp}</div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                        {patient.city ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            {patient.city}
                          </div>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                        {nextOfKin ? (
                          <div>
                            <div className="font-medium text-slate-900">
                              {nextOfKin.firstName} {nextOfKin.lastName}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {nextOfKin.relationship || 'N/A'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                        {nextOfKin?.phone ? (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            {nextOfKin.phone}
                          </div>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <ActionsDropdown
                          actions={[
                            {
                              label: 'View Details',
                              href: `/frontdesk/patients/${patient.id}`,
                              icon: <Eye className="h-4 w-4" />
                            },
                            ...(canWrite ? [
                              {
                                label: 'Edit Patient',
                                href: `/frontdesk/patients/${patient.id}/edit`,
                                icon: <Edit2 className="h-4 w-4" />
                              },
                              {
                                label: 'View Medical Records',
                                href: `/frontdesk/patients/${patient.id}/records`,
                                icon: <FileText className="h-4 w-4" />
                              }
                            ] : []),
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-t border-slate-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={handlePreviousPage}
                disabled={skip === 0}
                className="relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={handleNextPage}
                disabled={skip + take >= total}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-700">
                  Showing <span className="font-medium">{skip + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(skip + take, total)}</span> of{' '}
                  <span className="font-medium">{total}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={handlePreviousPage}
                    disabled={skip === 0}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Previous</span>
                    <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 border border-slate-300 bg-white text-sm font-medium text-slate-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={skip + take >= total}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Next</span>
                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
