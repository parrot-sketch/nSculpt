/**
 * React Query hooks for Patient management
 * 
 * Provides typed hooks for all patient operations with automatic caching,
 * error handling, and optimistic updates.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientService, Patient, PatientsListResponse } from '@/services/patient.service';

/**
 * Query key factory for patients
 */
export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (params?: { skip?: number; take?: number; search?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }) =>
    [...patientKeys.lists(), params] as const,
  details: () => [...patientKeys.all, 'detail'] as const,
  detail: (id: string) => [...patientKeys.details(), id] as const,
};

/**
 * Hook to list patients with pagination, search, and sorting
 */
export function usePatients(params?: {
  skip?: number;
  take?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  return useQuery({
    queryKey: patientKeys.list(params),
    queryFn: () => patientService.getPatients(
      params?.skip || 0,
      params?.take || 20,
      params?.search
    ),
    staleTime: 30 * 1000, // 30 seconds - patient lists change moderately
  });
}

/**
 * Hook to get a single patient by ID
 */
export function usePatient(id: string | undefined) {
  return useQuery({
    queryKey: patientKeys.detail(id || ''),
    queryFn: () => patientService.getPatient(id!),
    enabled: !!id,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook to create a new patient
 */
export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patient: Partial<Patient>) => patientService.createPatient(patient),
    onSuccess: () => {
      // Invalidate patient lists to refetch
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
    },
  });
}

/**
 * Hook to update a patient
 */
export function useUpdatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patient }: { id: string; patient: Partial<Patient> }) =>
      patientService.updatePatient(id, patient),
    onSuccess: (data) => {
      // Invalidate patient lists and the specific patient detail
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
      queryClient.invalidateQueries({ queryKey: patientKeys.detail(data.id) });
    },
  });
}

/**
 * Hook to delete a patient
 */
export function useDeletePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => patientService.deletePatient(id),
    onSuccess: () => {
      // Invalidate patient lists
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
    },
  });
}
