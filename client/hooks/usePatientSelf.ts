/**
 * React Query hooks for Patient Self-Service
 * 
 * Provides typed hooks for patient self-service operations:
 * - Get own profile
 * - Update own profile
 * - Get own appointments
 * - Get own visits/encounters
 * 
 * All hooks automatically handle caching, error handling, and query invalidation.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientService, type Patient } from '@/services/patient.service';
import { appointmentService, type Appointment } from '@/services/appointment.service';
import apiClient from '@/services/apiClient';

/**
 * Query key factory for patient self-service
 */
export const patientSelfKeys = {
  all: ['patient', 'self'] as const,
  profile: () => [...patientSelfKeys.all, 'profile'] as const,
  appointments: (filters?: { status?: string }) => 
    [...patientSelfKeys.all, 'appointments', filters] as const,
  visits: () => [...patientSelfKeys.all, 'visits'] as const,
};

/**
 * Hook to get current patient's own profile
 * GET /api/v1/patients/me
 */
export function usePatientProfile() {
  return useQuery({
    queryKey: patientSelfKeys.profile(),
    queryFn: () => patientService.getMyProfile(),
    staleTime: 2 * 60 * 1000, // 2 minutes - profile doesn't change frequently
    retry: 1,
  });
}

/**
 * Hook to update current patient's own profile
 * PATCH /api/v1/patients/me
 */
export function useUpdatePatientProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patient: Partial<Patient>) => patientService.updateMyProfile(patient),
    onSuccess: (data) => {
      // Invalidate and update profile cache
      queryClient.invalidateQueries({ queryKey: patientSelfKeys.profile() });
      // Optimistically update cache
      queryClient.setQueryData(patientSelfKeys.profile(), data);
    },
    onError: (error) => {
      console.error('Failed to update patient profile:', error);
    },
  });
}

/**
 * Hook to get current patient's appointments
 * Uses patient profile to get patientId, then fetches appointments
 */
export function usePatientAppointments(filters?: { status?: string }) {
  const { data: profile } = usePatientProfile();

  return useQuery({
    queryKey: patientSelfKeys.appointments(filters),
    queryFn: async () => {
      if (!profile?.id) {
        throw new Error('Patient profile not loaded');
      }
      return appointmentService.getPatientAppointments(profile.id, filters?.status as any);
    },
    enabled: !!profile?.id,
    staleTime: 30 * 1000, // 30 seconds - appointments can change
  });
}

/**
 * Hook to get current patient's visits/encounters
 * GET /api/v1/encounters/patient/:patientId
 */
export function usePatientVisits() {
  const { data: profile } = usePatientProfile();

  return useQuery({
    queryKey: patientSelfKeys.visits(),
    queryFn: async () => {
      if (!profile?.id) {
        throw new Error('Patient profile not loaded');
      }
      const response = await apiClient.get<any[]>(`/encounters/patient/${profile.id}`);
      const data = (response as any).data || response;
      return Array.isArray(data) ? data : [];
    },
    enabled: !!profile?.id,
    staleTime: 1 * 60 * 1000, // 1 minute - visits are historical data
  });
}
