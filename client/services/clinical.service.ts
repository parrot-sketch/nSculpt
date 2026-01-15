import apiClient from './apiClient';
import { getApiUrl } from '@/lib/env';
import {
    Observation,
    Encounter,
    Condition,
} from '@/types/clinical';

export const clinicalService = {
    // --- ENCOUNTERS ---

    async getEncounter(id: string): Promise<Encounter> {
        const { data } = await apiClient.get<Encounter>(getApiUrl(`/encounters/${id}`));
        return data;
    },

    async getEncounters(): Promise<Encounter[]> {
        const { data } = await apiClient.get<Encounter[]>(getApiUrl('/encounters'));
        return data;
    },

    async createEncounter(payload: Partial<Encounter>): Promise<Encounter> {
        const { data } = await apiClient.post<Encounter>(getApiUrl('/encounters'), payload);
        return data;
    },

    async lockEncounter(id: string): Promise<Encounter> {
        // Backend handles "lockedAt" and "lockedById" via UserContext
        const { data } = await apiClient.patch<Encounter>(getApiUrl(`/encounters/${id}/lock`), {});
        return data;
    },

    // --- OBSERVATIONS ---

    async getObservations(encounterId: string): Promise<Observation[]> {
        const { data } = await apiClient.get<Observation[]>(getApiUrl(`/encounters/${encounterId}/observations`));
        return data;
    },

    /**
     * Creates a new observation.
     * BLOCKED BY BACKEND if Encounter is Locked.
     */
    async createObservation(payload: Partial<Observation>): Promise<Observation> {
        const { data } = await apiClient.post<Observation>(getApiUrl('/observations'), payload);
        return data;
    },

    /**
     * Amends an existing observation.
     * Creates a NEW version (backend handles copy-on-write).
     * BLOCKED BY BACKEND if Observation is FINAL (unless versioning logic used).
     */
    async amendObservation(id: string, payload: Partial<Observation>): Promise<Observation> {
        const { data } = await apiClient.put<Observation>(getApiUrl(`/observations/${id}`), {
            ...payload,
            isLatest: true // Backend should verify this logic
        });
        return data;
    },

    /**
     * Void an observation (Soft Delete / Status Change).
     */
    async voidObservation(id: string): Promise<Observation> {
        const { data } = await apiClient.patch<Observation>(getApiUrl(`/observations/${id}/void`), {});
        return data;
    },

    // --- CONDITIONS ---
    async getConditions(encounterId: string): Promise<Condition[]> {
        const { data } = await apiClient.get<Condition[]>(getApiUrl(`/encounters/${encounterId}/conditions`));
        return data;
    }
};
