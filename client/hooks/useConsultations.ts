/**
 * React Query hooks for Consultation Management
 * 
 * Provides typed hooks for consultation operations:
 * - Get consultations
 * - Get consultation by ID
 * - Get consultation by appointment
 * - Create consultation
 * - Update consultation
 * - Finalize consultation
 * 
 * All hooks automatically handle caching, error handling, and query invalidation.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  consultationService,
  type Consultation,
  type CreateConsultationRequest,
  type UpdateConsultationRequest,
  ConsultationStatus,
} from '@/services/consultation.service';
import { appointmentKeys } from './useAppointments';

/**
 * Query key factory for consultations
 */
export const consultationKeys = {
  all: ['consultations'] as const,
  lists: () => [...consultationKeys.all, 'list'] as const,
  list: (filters?: {
    patientId?: string;
    doctorId?: string;
    status?: ConsultationStatus;
  }) => [...consultationKeys.lists(), filters] as const,
  details: () => [...consultationKeys.all, 'detail'] as const,
  detail: (id: string) => [...consultationKeys.details(), id] as const,
  byAppointment: (appointmentId: string) => [...consultationKeys.all, 'appointment', appointmentId] as const,
};

/**
 * Hook to get all consultations with filtering
 */
export function useConsultations(
  skip: number = 0,
  take: number = 20,
  filters?: {
    patientId?: string;
    doctorId?: string;
    status?: ConsultationStatus;
  }
) {
  return useQuery({
    queryKey: consultationKeys.list(filters),
    queryFn: () => consultationService.getConsultations(skip, take, filters),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook to get consultation by ID
 */
export function useConsultation(id: string | null) {
  return useQuery({
    queryKey: consultationKeys.detail(id || ''),
    queryFn: () => consultationService.getConsultation(id!),
    enabled: !!id,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook to get consultation by appointment ID
 */
export function useConsultationByAppointment(appointmentId: string | null) {
  return useQuery({
    queryKey: consultationKeys.byAppointment(appointmentId || ''),
    queryFn: () => consultationService.getConsultationByAppointment(appointmentId!),
    enabled: !!appointmentId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook for consultation mutations
 */
export function useConsultationMutations() {
  const queryClient = useQueryClient();

  /**
   * Invalidate all consultation-related queries
   */
  const invalidateConsultations = (consultation?: Consultation) => {
    // Invalidate all consultation lists
    queryClient.invalidateQueries({ queryKey: consultationKeys.all });

    // Invalidate specific consultation detail
    if (consultation) {
      queryClient.invalidateQueries({ queryKey: consultationKeys.detail(consultation.id) });
      queryClient.invalidateQueries({ queryKey: consultationKeys.byAppointment(consultation.appointmentId) });

      // Invalidate appointment queries (consultation is linked to appointment)
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    }
  };

  const createConsultation = useMutation({
    mutationFn: (dto: CreateConsultationRequest) => consultationService.createConsultation(dto),
    onSuccess: (data) => {
      invalidateConsultations(data);
    },
    onError: (error) => {
      console.error('Failed to create consultation:', error);
    },
  });

  const updateConsultation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateConsultationRequest }) =>
      consultationService.updateConsultation(id, dto),
    onSuccess: (data) => {
      invalidateConsultations(data);
    },
    onError: (error) => {
      console.error('Failed to update consultation:', error);
    },
  });

  const startConsultation = useMutation({
    mutationFn: (id: string) => consultationService.startConsultation(id),
    onSuccess: (data) => {
      invalidateConsultations(data);
    },
    onError: (error) => {
      console.error('Failed to start consultation:', error);
    },
  });

  const finalizePlan = useMutation({
    mutationFn: ({
      id,
      dto,
    }: {
      id: string;
      dto: {
        outcome: 'NO_ACTION' | 'FOLLOW_UP' | 'PROCEDURE_PLANNED' | 'CONSERVATIVE' | 'REFERRED';
        clinicalSummary?: string;
        diagnoses?: Record<string, any>;
        procedurePlan?: {
          procedureName: string;
          procedureCode?: string;
          procedureDescription?: string;
          planType: 'SURGICAL' | 'NON_SURGICAL' | 'CONSERVATIVE' | 'SERIES';
          sessionCount?: number;
          sessionIntervalDays?: number;
          sessionDetails?: string;
          followUpRequired?: boolean;
          followUpIntervalDays?: number;
          notes?: string;
        };
        followUpPlan?: {
          followUpType: string;
          intervalDays?: number;
          reason?: string;
        };
      };
    }) => consultationService.finalizePlan(id, dto),
    onSuccess: (data) => {
      invalidateConsultations(data);
    },
    onError: (error) => {
      console.error('Failed to finalize plan:', error);
    },
  });

  const closeConsultation = useMutation({
    mutationFn: (id: string) => consultationService.closeConsultation(id),
    onSuccess: (data) => {
      invalidateConsultations(data);
    },
    onError: (error) => {
      console.error('Failed to close consultation:', error);
    },
  });

  return {
    createConsultation,
    updateConsultation,
    startConsultation,
    finalizePlan,
    closeConsultation,
  };
}

/**
 * Hook to update an existing consultation
 */
export function useUpdateConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateConsultationRequest }) =>
      consultationService.updateConsultation(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: consultationKeys.all });
      queryClient.invalidateQueries({ queryKey: consultationKeys.detail(data.id) });
      if (data.appointmentId) {
        queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      }
    },
  });
}

/**
 * Hook to complete a consultation
 * Note: Uses closeConsultation or updateConsultation based on implementation
 */
export function useCompleteConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      // If data is provided, update first
      if (data) {
        await consultationService.updateConsultation(id, {
          clinicalSummary: data.notes,
          diagnoses: { primary: data.diagnosis },
          version: data.version,
        });
      }
      return consultationService.closeConsultation(id);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: consultationKeys.all });
      queryClient.invalidateQueries({ queryKey: consultationKeys.detail(data.id) });
      if (data.appointmentId) {
        queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      }
    },
  });
}
