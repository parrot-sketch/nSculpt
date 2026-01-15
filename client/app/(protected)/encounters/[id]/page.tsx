'use client';

import { } from 'react';
import { useRouter } from 'next/navigation';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { LockedEncounterBanner } from '@/components/clinical/LockedEncounterBanner';
import { EncounterStatusBadge } from '@/components/clinical/EncounterStatusBadge';
import { ObservationList } from '@/components/clinical/ObservationList';
import { Observation } from '@/types/clinical';
import { ArrowLeft, Plus } from 'lucide-react';
import { useEncounter, useObservations, useClinicalMutations } from '@/hooks/useClinicalQuery';
import { toast } from 'sonner';


interface PageProps {
    params: { id: string };
}

export default function EncounterDetailPage({ params }: PageProps) {
    return (
        <RoleGuard roles={['DOCTOR', 'ADMIN']} fallback={<p>Unauthorized Access</p>}>
            <EncounterDetailContent id={params.id} />
        </RoleGuard>
    );
}

function EncounterDetailContent({ id }: { id: string }) {
    const router = useRouter();
    const { data: encounter, isLoading: encounterLoading } = useEncounter(id);
    const { data: observations, isLoading: obsLoading } = useObservations(id);
    const { lockEncounter, amendObservation } = useClinicalMutations();

    if (encounterLoading || obsLoading) return <div className="p-8">Loading clinical context...</div>;
    if (!encounter) return <div className="p-8 text-red-600">Encounter not found</div>;

    const handleAmend = async (obs: Observation) => {
        const reason = prompt("Enter amendment reason (FORENSIC AUDIT RECORDED):");
        if (!reason) return;

        try {
            await amendObservation.mutateAsync({
                id: obs.id,
                payload: { valueString: "AMENDED VALUE" }
            });
            toast.success('Amendment submitted successfully as a new version.');
        } catch (e: any) {
            toast.error("Amendment Failed: " + e.message);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* 1. Forensic Header */}
            <div className="mb-8">
                <button onClick={() => router.back()} className="flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
                </button>

                <div className="md:flex md:items-center md:justify-between">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                            Clinical Encounter
                        </h2>
                        <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
                            <div className="mt-2 flex items-center text-sm text-gray-500">
                                Patient ID: <span className="font-mono ml-1">{encounter.patientId.slice(0, 8)}...</span>
                            </div>
                            <div className="mt-2 flex items-center text-sm text-gray-500">
                                Date: {new Date(encounter.periodStart).toLocaleDateString()}
                            </div>
                            <div className="mt-2 text-sm text-gray-500">
                                Status: <EncounterStatusBadge status={encounter.status} locked={encounter.locked} />
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 flex md:ml-4 md:mt-0">
                        {!encounter.locked && (
                            <button
                                type="button"
                                className="ml-3 inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                New Observation
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. Safety Alerts */}
            <LockedEncounterBanner
                locked={encounter.locked}
                lockedBy={encounter.lockedBy?.firstName} // Assuming relation expansion
                lockedAt={encounter.lockedAt}
            />

            {/* 3. Clinical Data (Immutable Presentation) */}
            <div className="bg-white shadow sm:rounded-lg mb-8">
                <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-base font-semibold leading-6 text-gray-900">Clinical Observations</h3>
                    <p className="mt-1 text-sm text-gray-500">Append-only vital signs and measurements.</p>
                </div>
                <div className="border-t border-gray-200">
                    <ObservationList
                        observations={observations || []}
                        onAmend={handleAmend}
                        encounterLocked={encounter.locked}
                    />
                </div>
            </div>

            {/* 4. Locking Action (Doctor Sign-off) */}
            {!encounter.locked && (
                <div className="flex justify-end border-t border-gray-200 pt-6">
                    <button
                        className="bg-red-50 text-red-700 border border-red-200 px-4 py-2 rounded-md text-sm font-medium hover:bg-red-100 disabled:opacity-50"
                        disabled={lockEncounter.isPending}
                        onClick={async () => {
                            if (confirm("Are you sure you want to LOCK this encounter? This action cannot be undone.")) {
                                try {
                                    await lockEncounter.mutateAsync(encounter.id);
                                    toast.success('Encounter locked successfully.');
                                } catch (e: any) {
                                    toast.error('Failed to lock encounter: ' + e.message);
                                }
                            }
                        }}
                    >
                        {lockEncounter.isPending ? '🔒 Locking...' : '🔒 Sign Off & Lock Encounter'}
                    </button>
                </div>
            )}
        </div>
    );
}
