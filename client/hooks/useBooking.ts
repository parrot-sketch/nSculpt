/**
 * React Query hooks for Patient Appointment Booking
 * 
 * Provides typed hooks for booking operations:
 * - Get available doctors
 * - Get doctor availability
 * - Create appointment booking
 * 
 * All hooks automatically handle caching, error handling, and query invalidation.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorService } from '@/services/doctor.service';
import { appointmentService } from '@/services/appointment.service';
import { patientSelfKeys } from './usePatientSelf';

/**
 * Query key factory for booking
 */
export const bookingKeys = {
  all: ['booking'] as const,
  doctors: () => [...bookingKeys.all, 'doctors'] as const,
  availability: (doctorId: string, date: string) =>
    [...bookingKeys.all, 'availability', doctorId, date] as const,
};

/**
 * Hook to get all available doctors
 * GET /api/v1/doctors
 */
export function useDoctors() {
  return useQuery({
    queryKey: bookingKeys.doctors(),
    queryFn: () => doctorService.getAllDoctors(),
    staleTime: 5 * 60 * 1000, // 5 minutes - doctors don't change frequently
    retry: 1,
  });
}

/**
 * Hook to get available time slots for a doctor on a specific date
 * GET /api/v1/public/consultations/available-slots
 */
export function useDoctorAvailability(
  doctorId: string | null,
  date: string | null, // YYYY-MM-DD
  durationMinutes: number = 30
) {
  return useQuery({
    queryKey: bookingKeys.availability(doctorId || '', date || ''),
    queryFn: () => {
      if (!doctorId || !date) {
        throw new Error('Doctor ID and date are required');
      }
      return appointmentService.getAvailableSlots(doctorId, date, durationMinutes);
    },
    enabled: !!doctorId && !!date,
    staleTime: 1 * 60 * 1000, // 1 minute - availability changes frequently
    retry: 1,
  });
}

/**
 * Hook to create an appointment booking
 * POST /api/v1/public/consultations/book
 */
export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { doctorId: string; appointmentType: string; reason?: string }) =>
      appointmentService.requestAppointment(data),
    onSuccess: (data, variables) => {
      // Invalidate patient appointments to refetch
      queryClient.invalidateQueries({ queryKey: patientSelfKeys.appointments() });

      // Invalidate doctor availability for all dates (slot is now taken)
      queryClient.invalidateQueries({
        queryKey: [...bookingKeys.all, 'availability', variables.doctorId]
      });

      // Update cache optimistically
      queryClient.setQueryData(
        patientSelfKeys.appointments(),
        (old: any) => {
          if (!old) return [data];
          if (Array.isArray(old)) {
            return [data, ...old];
          }
          // Fallback for object-based state (though current implementation uses arrays)
          return {
            ...old,
            data: [data, ...(old.data || [])],
          };
        }
      );
    },
    onError: (error) => {
      console.error('Failed to book appointment:', error);
    },
  });
}
