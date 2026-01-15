/**
 * React Query hooks for Procedure Plan Management
 * 
 * Provides typed hooks for procedure plan operations:
 * - Get procedure plans
 * - Get procedure plan by ID
 * - Get by consultation/patient
 * - Create, update, approve, schedule, complete
 * 
 * All hooks automatically handle caching, error handling, and query invalidation.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  procedurePlanService,
  type ProcedurePlan,
  type CreateProcedurePlanRequest,
  type UpdateProcedurePlanRequest,
} from '@/services/procedure-plan.service';
import { consultationKeys } from './useConsultations';

/**
 * Query key factory for procedure plans
 */
export const procedurePlanKeys = {
  all: ['procedure-plans'] as const,
  lists: () => [...procedurePlanKeys.all, 'list'] as const,
  list: (filters?: { consultationId?: string; patientId?: string }) =>
    [...procedurePlanKeys.lists(), filters] as const,
  details: () => [...procedurePlanKeys.all, 'detail'] as const,
  detail: (id: string) => [...procedurePlanKeys.details(), id] as const,
  byConsultation: (consultationId: string) =>
    [...procedurePlanKeys.all, 'consultation', consultationId] as const,
  byPatient: (patientId: string) =>
    [...procedurePlanKeys.all, 'patient', patientId] as const,
};

/**
 * Hook to get procedure plan by ID
 */
export function useProcedurePlan(id: string | null) {
  return useQuery({
    queryKey: procedurePlanKeys.detail(id || ''),
    queryFn: () => procedurePlanService.getProcedurePlan(id!),
    enabled: !!id,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook to get procedure plans by consultation ID
 */
export function useProcedurePlansByConsultation(consultationId: string | null) {
  return useQuery({
    queryKey: procedurePlanKeys.byConsultation(consultationId || ''),
    queryFn: () => procedurePlanService.getProcedurePlansByConsultation(consultationId!),
    enabled: !!consultationId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook to get procedure plans by patient ID
 */
export function useProcedurePlansByPatient(patientId: string | null) {
  return useQuery({
    queryKey: procedurePlanKeys.byPatient(patientId || ''),
    queryFn: () => procedurePlanService.getProcedurePlansByPatient(patientId!),
    enabled: !!patientId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook for procedure plan mutations
 */
export function useProcedurePlanMutations() {
  const queryClient = useQueryClient();

  /**
   * Invalidate all procedure plan-related queries
   */
  const invalidateProcedurePlans = (plan?: ProcedurePlan) => {
    queryClient.invalidateQueries({ queryKey: procedurePlanKeys.all });

    if (plan) {
      queryClient.invalidateQueries({ queryKey: procedurePlanKeys.detail(plan.id) });
      queryClient.invalidateQueries({ queryKey: procedurePlanKeys.byConsultation(plan.consultationId) });
      queryClient.invalidateQueries({ queryKey: procedurePlanKeys.byPatient(plan.patientId) });
      
      // Invalidate consultation queries (procedure plan is linked to consultation)
      queryClient.invalidateQueries({ queryKey: consultationKeys.all });
    }
  };

  const createProcedurePlan = useMutation({
    mutationFn: (dto: CreateProcedurePlanRequest) => procedurePlanService.createProcedurePlan(dto),
    onSuccess: (data) => {
      invalidateProcedurePlans(data);
    },
  });

  const updateProcedurePlan = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateProcedurePlanRequest }) =>
      procedurePlanService.updateProcedurePlan(id, dto),
    onSuccess: (data) => {
      invalidateProcedurePlans(data);
    },
  });

  const approveProcedurePlan = useMutation({
    mutationFn: (id: string) => procedurePlanService.approveProcedurePlan(id),
    onSuccess: (data) => {
      invalidateProcedurePlans(data);
    },
  });

  const scheduleProcedurePlan = useMutation({
    mutationFn: ({ id, appointmentId }: { id: string; appointmentId: string }) =>
      procedurePlanService.scheduleProcedurePlan(id, appointmentId),
    onSuccess: (data) => {
      invalidateProcedurePlans(data);
    },
  });

  const completeSession = useMutation({
    mutationFn: ({ id, sessionNumber }: { id: string; sessionNumber: number }) =>
      procedurePlanService.completeSession(id, sessionNumber),
    onSuccess: (data) => {
      invalidateProcedurePlans(data);
    },
  });

  const completeProcedurePlan = useMutation({
    mutationFn: (id: string) => procedurePlanService.completeProcedurePlan(id),
    onSuccess: (data) => {
      invalidateProcedurePlans(data);
    },
  });

  return {
    createProcedurePlan,
    updateProcedurePlan,
    approveProcedurePlan,
    scheduleProcedurePlan,
    completeSession,
    completeProcedurePlan,
  };
}
