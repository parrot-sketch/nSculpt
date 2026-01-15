/**
 * React Query hooks for Follow-Up Plan Management
 * 
 * Provides typed hooks for follow-up plan operations:
 * - Get follow-up plans
 * - Get follow-up plan by ID
 * - Get by consultation/patient
 * - Create, update, schedule, complete
 * 
 * All hooks automatically handle caching, error handling, and query invalidation.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  followUpPlanService,
  type FollowUpPlan,
  type CreateFollowUpPlanRequest,
  type UpdateFollowUpPlanRequest,
} from '@/services/follow-up-plan.service';
import { consultationKeys } from './useConsultations';

/**
 * Query key factory for follow-up plans
 */
export const followUpPlanKeys = {
  all: ['follow-up-plans'] as const,
  lists: () => [...followUpPlanKeys.all, 'list'] as const,
  list: (filters?: { consultationId?: string; patientId?: string }) =>
    [...followUpPlanKeys.lists(), filters] as const,
  details: () => [...followUpPlanKeys.all, 'detail'] as const,
  detail: (id: string) => [...followUpPlanKeys.details(), id] as const,
  byConsultation: (consultationId: string) =>
    [...followUpPlanKeys.all, 'consultation', consultationId] as const,
  byPatient: (patientId: string) =>
    [...followUpPlanKeys.all, 'patient', patientId] as const,
};

/**
 * Hook to get follow-up plan by ID
 */
export function useFollowUpPlan(id: string | null) {
  return useQuery({
    queryKey: followUpPlanKeys.detail(id || ''),
    queryFn: () => followUpPlanService.getFollowUpPlan(id!),
    enabled: !!id,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook to get follow-up plans by consultation ID
 */
export function useFollowUpPlansByConsultation(consultationId: string | null) {
  return useQuery({
    queryKey: followUpPlanKeys.byConsultation(consultationId || ''),
    queryFn: () => followUpPlanService.getFollowUpPlansByConsultation(consultationId!),
    enabled: !!consultationId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook to get follow-up plans by patient ID
 */
export function useFollowUpPlansByPatient(patientId: string | null) {
  return useQuery({
    queryKey: followUpPlanKeys.byPatient(patientId || ''),
    queryFn: () => followUpPlanService.getFollowUpPlansByPatient(patientId!),
    enabled: !!patientId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook for follow-up plan mutations
 */
export function useFollowUpPlanMutations() {
  const queryClient = useQueryClient();

  /**
   * Invalidate all follow-up plan-related queries
   */
  const invalidateFollowUpPlans = (plan?: FollowUpPlan) => {
    queryClient.invalidateQueries({ queryKey: followUpPlanKeys.all });

    if (plan) {
      queryClient.invalidateQueries({ queryKey: followUpPlanKeys.detail(plan.id) });
      queryClient.invalidateQueries({ queryKey: followUpPlanKeys.byConsultation(plan.consultationId) });
      queryClient.invalidateQueries({ queryKey: followUpPlanKeys.byPatient(plan.patientId) });
      
      // Invalidate consultation queries (follow-up plan is linked to consultation)
      queryClient.invalidateQueries({ queryKey: consultationKeys.all });
    }
  };

  const createFollowUpPlan = useMutation({
    mutationFn: (dto: CreateFollowUpPlanRequest) => followUpPlanService.createFollowUpPlan(dto),
    onSuccess: (data) => {
      invalidateFollowUpPlans(data);
    },
  });

  const updateFollowUpPlan = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateFollowUpPlanRequest }) =>
      followUpPlanService.updateFollowUpPlan(id, dto),
    onSuccess: (data) => {
      invalidateFollowUpPlans(data);
    },
  });

  const scheduleFollowUpPlan = useMutation({
    mutationFn: ({ id, appointmentId }: { id: string; appointmentId: string }) =>
      followUpPlanService.scheduleFollowUpPlan(id, appointmentId),
    onSuccess: (data) => {
      invalidateFollowUpPlans(data);
    },
  });

  const completeFollowUpPlan = useMutation({
    mutationFn: (id: string) => followUpPlanService.completeFollowUpPlan(id),
    onSuccess: (data) => {
      invalidateFollowUpPlans(data);
    },
  });

  return {
    createFollowUpPlan,
    updateFollowUpPlan,
    scheduleFollowUpPlan,
    completeFollowUpPlan,
  };
}
