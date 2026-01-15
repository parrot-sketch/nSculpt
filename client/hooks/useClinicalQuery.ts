/**
 * React Query hooks for Clinical Encounter Management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clinicalService } from '@/services/clinical.service';
import { Observation } from '@/types/clinical';

export const clinicalKeys = {
    all: ['clinical'] as const,
    encounters: () => [...clinicalKeys.all, 'encounters'] as const,
    encounter: (id: string) => [...clinicalKeys.encounters(), id] as const,
    observations: (encounterId: string) => [...clinicalKeys.encounter(encounterId), 'observations'] as const,
};

/**
 * Hook to get all encounters (Admin/Management view)
 */
export function useEncounters() {
    return useQuery({
        queryKey: clinicalKeys.encounters(),
        queryFn: () => clinicalService.getEncounters(),
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Hook to get a single encounter with full context
 */
export function useEncounter(id: string | null) {
    return useQuery({
        queryKey: clinicalKeys.encounter(id || ''),
        queryFn: () => clinicalService.getEncounter(id!),
        enabled: !!id,
        staleTime: 1 * 60 * 1000,
    });
}

/**
 * Hook to get observations for an encounter
 */
export function useObservations(encounterId: string | null) {
    return useQuery({
        queryKey: clinicalKeys.observations(encounterId || ''),
        queryFn: () => clinicalService.getObservations(encounterId!),
        enabled: !!encounterId,
        staleTime: 1 * 60 * 1000,
    });
}

/**
 * Hook for encounter and observation mutations
 */
export function useClinicalMutations() {
    const queryClient = useQueryClient();

    const lockEncounter = useMutation({
        mutationFn: (id: string) => clinicalService.lockEncounter(id),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: clinicalKeys.encounter(data.id) });
            queryClient.invalidateQueries({ queryKey: clinicalKeys.encounters() });
        }
    });

    const amendObservation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: Partial<Observation> }) =>
            clinicalService.amendObservation(id, payload),
        onSuccess: (data) => {
            if (data.encounterId) {
                queryClient.invalidateQueries({ queryKey: clinicalKeys.observations(data.encounterId) });
            }
        }
    });

    return {
        lockEncounter,
        amendObservation,
    };
}
