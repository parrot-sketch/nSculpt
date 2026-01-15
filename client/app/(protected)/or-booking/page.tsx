'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { theaterService } from '@/services/theater.service';
import { DataTable } from '@/components/tables/DataTable';
import { PermissionsGuard } from '@/components/layout/PermissionsGuard';
import { PERMISSION_DOMAINS, PERMISSION_ACTIONS } from '@/lib/constants';
import { buildPermission } from '@/lib/permissions';
import { TheaterReservation, OperatingTheater } from '@/types/domain';
import { formatDateTime } from '@/lib/utils';
import { Modal } from '@/components/modals/Modal';
import Link from 'next/link';

/**
 * OR Booking page - For Theater Managers
 * Manage theater reservations and scheduling
 */
export default function ORBookingPage() {
  const [selectedTheater, setSelectedTheater] = useState<string | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  const { data: theaters } = useQuery({
    queryKey: ['operating-theaters'],
    queryFn: () => theaterService.getTheaters(),
  });

  const { data: reservations, isLoading } = useQuery({
    queryKey: ['theater-reservations', selectedTheater],
    queryFn: () => theaterService.getReservations(selectedTheater || undefined),
    enabled: true,
  });

  const columns = [
    {
      key: 'theater',
      header: 'Theater',
      render: (reservation: TheaterReservation) => (
        <span className="font-medium">{reservation.theater?.name || 'N/A'}</span>
      ),
    },
    {
      key: 'reservedFrom',
      header: 'Start Time',
      render: (reservation: TheaterReservation) => formatDateTime(reservation.reservedFrom),
    },
    {
      key: 'reservedUntil',
      header: 'End Time',
      render: (reservation: TheaterReservation) => formatDateTime(reservation.reservedUntil),
    },
    {
      key: 'reservationType',
      header: 'Type',
      render: (reservation: TheaterReservation) => (
        <span className="text-sm text-neutral-600">{reservation.reservationType}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (reservation: TheaterReservation) => {
        const statusColors = {
          CONFIRMED: 'bg-green-100 text-green-800',
          CANCELLED: 'bg-red-100 text-red-800',
          COMPLETED: 'bg-neutral-100 text-neutral-800',
        };
        return (
          <span
            className={`px-2 py-1 text-xs font-medium rounded ${
              statusColors[reservation.status as keyof typeof statusColors] || 'bg-neutral-100'
            }`}
          >
            {reservation.status}
          </span>
        );
      },
    },
    {
      key: 'case',
      header: 'Case',
      render: (reservation: TheaterReservation) =>
        reservation.case ? (
          <Link
            href={`/procedures/${reservation.case.id}`}
            className="text-primary hover:underline"
          >
            {reservation.case.caseNumber}
          </Link>
        ) : (
          <span className="text-neutral-400">Block Time</span>
        ),
    },
  ];

  return (
    <PermissionsGuard
      requiredPermission={buildPermission(
        PERMISSION_DOMAINS.THEATER,
        '*',
        PERMISSION_ACTIONS.BOOK
      )}
    >
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-semibold text-neutral-900">OR Booking</h1>
          <button
            onClick={() => setShowBookingModal(true)}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
          >
            Book Theater
          </button>
        </div>

        {/* Theater Filter */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Filter by Theater
          </label>
          <select
            value={selectedTheater || ''}
            onChange={(e) => setSelectedTheater(e.target.value || null)}
            className="px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Theaters</option>
            {theaters?.map((theater) => (
              <option key={theater.id} value={theater.id}>
                {theater.name} ({theater.code})
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 shadow-soft">
          {isLoading ? (
            <div className="p-8 text-center text-neutral-500">Loading reservations...</div>
          ) : (
            <DataTable
              data={reservations || []}
              columns={columns}
              keyExtractor={(item) => item.id}
              emptyMessage="No reservations found"
            />
          )}
        </div>

        <Modal
          isOpen={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          title="Book Operating Theater"
          size="lg"
        >
          <div className="space-y-4">
            <p className="text-neutral-600">
              Theater booking form will be implemented here.
            </p>
            <p className="text-sm text-neutral-500">
              This will integrate with the backend to create theater reservations
              and prevent double-booking via database constraints.
            </p>
          </div>
        </Modal>
      </div>
    </PermissionsGuard>
  );
}

