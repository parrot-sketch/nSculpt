/**
 * React Query hooks for Appointment Lifecycle Management
 * 
 * Provides typed hooks for appointment operations:
 * - Cancel appointment
 * - Confirm appointment payment
 * - Check in patient
 * - Reschedule appointment
 * - Mark no-show
 * - Mark in-progress
 * - Complete appointment
 * 
 * All hooks automatically handle caching, error handling, and query invalidation.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { appointmentService, type Appointment, AppointmentStatus } from '@/services/appointment.service';
import { patientSelfKeys } from './usePatientSelf';

/**
 * Query key factory for appointments
 */
export const appointmentKeys = {
  all: ['appointments'] as const,
  lists: () => [...appointmentKeys.all, 'list'] as const,
  list: (filters?: {
    startDate?: string;
    endDate?: string;
    status?: AppointmentStatus;
    doctorId?: string;
    patientId?: string;
  }) => [...appointmentKeys.lists(), filters] as const,
  details: () => [...appointmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...appointmentKeys.details(), id] as const,
  patient: (patientId: string) => [...appointmentKeys.all, 'patient', patientId] as const,
  doctor: (doctorId: string) => [...appointmentKeys.all, 'doctor', doctorId] as const,
  today: () => [...appointmentKeys.all, 'today'] as const,
};

/**
 * Hook for appointment lifecycle mutations
 * 
 * Provides all mutation functions for appointment status transitions.
 * All mutations invalidate relevant caches to ensure UI consistency.
 */
export function useAppointmentMutations() {
  const queryClient = useQueryClient();

  /**
   * Invalidate all appointment-related queries
   */
  const invalidateAppointments = (appointment?: Appointment) => {
    // Invalidate all appointment lists
    queryClient.invalidateQueries({ queryKey: appointmentKeys.all });

    // Invalidate specific patient/doctor queries if appointment data available
    if (appointment) {
      if (appointment.patientId) {
        queryClient.invalidateQueries({
          queryKey: appointmentKeys.patient(appointment.patientId)
        });
        // Also invalidate patient self-service queries
        queryClient.invalidateQueries({ queryKey: patientSelfKeys.appointments() });
      }
      if (appointment.doctorId) {
        queryClient.invalidateQueries({
          queryKey: appointmentKeys.doctor(appointment.doctorId)
        });
      }
      // Invalidate specific appointment detail
      queryClient.invalidateQueries({
        queryKey: appointmentKeys.detail(appointment.id)
      });
    }
  };

  const cancelAppointment = useMutation({
    mutationFn: ({
      id,
      cancelDto
    }: {
      id: string;
      cancelDto: {
        cancellationReason: string;
        cancellationNotes?: string;
        refundRequested?: boolean;
      };
    }) => appointmentService.cancelAppointment(id, cancelDto),
    onSuccess: (data) => {
      invalidateAppointments(data);
    },
    onError: (error) => {
      console.error('Failed to cancel appointment:', error);
    },
  });

  const confirmAppointment = useMutation({
    mutationFn: ({ id, paymentId }: { id: string; paymentId: string }) =>
      appointmentService.confirmAppointment(id, paymentId),
    onSuccess: (data) => {
      invalidateAppointments(data);
    },
    onError: (error) => {
      console.error('Failed to confirm appointment:', error);
    },
  });

  const checkInAppointment = useMutation({
    mutationFn: (id: string) => appointmentService.checkIn(id),
    onSuccess: (data) => {
      invalidateAppointments(data);
    },
    onError: (error) => {
      console.error('Failed to check in appointment:', error);
    },
  });

  const rescheduleAppointment = useMutation({
    mutationFn: ({
      id,
      rescheduleDto,
    }: {
      id: string;
      rescheduleDto: {
        scheduledDate: string;
        scheduledStartTime: string;
        scheduledEndTime: string;
      };
    }) => appointmentService.rescheduleAppointment(id, rescheduleDto),
    onSuccess: (data) => {
      invalidateAppointments(data);
    },
    onError: (error) => {
      console.error('Failed to reschedule appointment:', error);
    },
  });

  const markNoShow = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      appointmentService.updateAppointmentStatus(id, AppointmentStatus.NO_SHOW, notes),
    onSuccess: (data) => {
      invalidateAppointments(data);
    },
    onError: (error) => {
      console.error('Failed to mark no-show:', error);
    },
  });

  const markInProgress = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      appointmentService.updateAppointmentStatus(id, AppointmentStatus.IN_PROGRESS, notes),
    onSuccess: (data) => {
      invalidateAppointments(data);
    },
    onError: (error) => {
      console.error('Failed to mark in-progress:', error);
    },
  });

  const completeAppointment = useMutation({
    mutationFn: ({ id, consultationId }: { id: string; consultationId: string }) =>
      appointmentService.completeAppointment(id, consultationId),
    onSuccess: (data) => {
      invalidateAppointments(data);
    },
    onError: (error) => {
      console.error('Failed to complete appointment:', error);
    },
  });

  const assignSchedule = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        scheduledDate: string;
        scheduledStartTime: string;
        scheduledEndTime: string;
        estimatedDurationMinutes?: number;
      };
    }) => appointmentService.assignSchedule(id, data),
    onSuccess: (data) => {
      invalidateAppointments(data);
    },
    onError: (error) => {
      console.error('Failed to assign schedule:', error);
    },
  });

  return {
    cancelAppointment,
    confirmAppointment,
    checkInAppointment,
    rescheduleAppointment,
    markNoShow,
    markInProgress,
    completeAppointment,
    assignSchedule,
  };
}

/**
 * Hook for fetching a single appointment
 */
export function useAppointment(id: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: appointmentKeys.detail(id),
    queryFn: () => appointmentService.getAppointment(id),
    enabled: !!id,
  });

  return {
    appointment: data,
    isLoading,
    error,
    refetch,
  };
}
