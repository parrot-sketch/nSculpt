/**
 * React Query hooks for Prescription Management
 * 
 * Provides typed hooks for prescription operations:
 * - Get prescriptions
 * - Get prescription by ID
 * - Get prescriptions by consultation
 * - Get prescriptions by patient
 * - Create prescription
 * - Update prescription
 * - Cancel prescription
 * 
 * All hooks automatically handle caching, error handling, and query invalidation.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  prescriptionService,
  type Prescription,
  type CreatePrescriptionRequest,
  type UpdatePrescriptionRequest,
  PrescriptionStatus,
} from '@/services/prescription.service';
import { consultationKeys } from './useConsultations';

/**
 * Query key factory for prescriptions
 */
export const prescriptionKeys = {
  all: ['prescriptions'] as const,
  lists: () => [...prescriptionKeys.all, 'list'] as const,
  list: (filters?: {
    patientId?: string;
    consultationId?: string;
    status?: PrescriptionStatus;
  }) => [...prescriptionKeys.lists(), filters] as const,
  details: () => [...prescriptionKeys.all, 'detail'] as const,
  detail: (id: string) => [...prescriptionKeys.details(), id] as const,
  byConsultation: (consultationId: string) => [...prescriptionKeys.all, 'consultation', consultationId] as const,
  byPatient: (patientId: string) => [...prescriptionKeys.all, 'patient', patientId] as const,
};

/**
 * Hook to get all prescriptions with filtering
 */
export function usePrescriptions(filters?: {
  patientId?: string;
  consultationId?: string;
  status?: PrescriptionStatus;
}) {
  return useQuery({
    queryKey: prescriptionKeys.list(filters),
    queryFn: () => prescriptionService.getPrescriptions(filters),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook to get prescription by ID
 */
export function usePrescription(id: string | null) {
  return useQuery({
    queryKey: prescriptionKeys.detail(id || ''),
    queryFn: () => prescriptionService.getPrescription(id!),
    enabled: !!id,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook to get prescriptions by consultation ID
 */
export function usePrescriptionsByConsultation(consultationId: string | null) {
  return useQuery({
    queryKey: prescriptionKeys.byConsultation(consultationId || ''),
    queryFn: () => prescriptionService.getPrescriptionsByConsultation(consultationId!),
    enabled: !!consultationId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook to get prescriptions by patient ID
 * 
 * Note: Backend doesn't have a direct patient endpoint.
 * This fetches prescriptions via consultations:
 * 1. Get all consultations for patient
 * 2. Get prescriptions for each consultation
 * 3. Flatten results
 * 
 * In production, a direct patient endpoint would be more efficient.
 */
export function usePrescriptionsByPatient(patientId: string | null) {
  // First, get all consultations for the patient
  const { data: consultationsData, isLoading: isLoadingConsultations } = useConsultations(0, 100, { patientId });
  const consultations = consultationsData?.data || [];

  // Then, fetch prescriptions for each consultation
  return useQuery({
    queryKey: [...prescriptionKeys.byPatient(patientId || ''), consultations.map(c => c.id)],
    queryFn: async () => {
      if (!patientId || consultations.length === 0) return [];

      // Fetch prescriptions for each consultation in parallel
      const prescriptionPromises = consultations.map((consultation) =>
        prescriptionService.getPrescriptionsByConsultation(consultation.id).catch((error) => {
          console.error(`Failed to fetch prescriptions for consultation ${consultation.id}:`, error);
          return [];
        })
      );

      const prescriptionArrays = await Promise.all(prescriptionPromises);
      return prescriptionArrays.flat();
    },
    enabled: !!patientId && !isLoadingConsultations && consultations.length > 0,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook for prescription mutations
 */
export function usePrescriptionMutations() {
  const queryClient = useQueryClient();

  /**
   * Invalidate all prescription-related queries
   */
  const invalidatePrescriptions = (prescription?: Prescription) => {
    // Invalidate all prescription lists
    queryClient.invalidateQueries({ queryKey: prescriptionKeys.all });

    // Invalidate specific prescription detail
    if (prescription) {
      queryClient.invalidateQueries({ queryKey: prescriptionKeys.detail(prescription.id) });
      queryClient.invalidateQueries({ queryKey: prescriptionKeys.byConsultation(prescription.consultationId) });
      queryClient.invalidateQueries({ queryKey: prescriptionKeys.byPatient(prescription.patientId) });
      
      // Invalidate consultation queries (prescription linked to consultation)
      queryClient.invalidateQueries({ queryKey: consultationKeys.all });
    }
  };

  const createPrescription = useMutation({
    mutationFn: (dto: CreatePrescriptionRequest) => prescriptionService.createPrescription(dto),
    onSuccess: (data) => {
      invalidatePrescriptions(data);
    },
    onError: (error) => {
      console.error('Failed to create prescription:', error);
    },
  });

  const updatePrescription = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePrescriptionRequest }) =>
      prescriptionService.updatePrescription(id, dto),
    onSuccess: (data) => {
      invalidatePrescriptions(data);
    },
    onError: (error) => {
      console.error('Failed to update prescription:', error);
    },
  });

  const cancelPrescription = useMutation({
    mutationFn: (id: string) => prescriptionService.cancelPrescription(id),
    onSuccess: (data) => {
      invalidatePrescriptions(data);
    },
    onError: (error) => {
      console.error('Failed to cancel prescription:', error);
    },
  });

  return {
    createPrescription,
    updatePrescription,
    cancelPrescription,
  };
}
