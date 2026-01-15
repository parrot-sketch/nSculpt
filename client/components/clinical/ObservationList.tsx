import { Observation, ObservationStatus } from '@/types/clinical';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface ObservationListProps {
    observations: Observation[];
    onAmend: (obs: Observation) => void;
    encounterLocked: boolean;
}

export function ObservationList({ observations, onAmend, encounterLocked }: ObservationListProps) {
    return (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Display</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Value</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                            <span className="sr-only">Actions</span>
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                    {observations.map((obs) => {
                        const isFinal = obs.status === ObservationStatus.FINAL;
                        const isError = obs.status === ObservationStatus.ENTERED_IN_ERROR;
                        const canEdit = !encounterLocked && !isError; // Even FINAL can be amended, but via special modal

                        return (
                            <tr key={obs.id} className={isError ? "bg-gray-50 opacity-60 grayscale" : ""}>
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                    {obs.display}
                                    {!obs.isLatest && <span className="ml-2 text-xs text-gray-500">(History)</span>}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                    {obs.valueQuantity} {obs.valueUnit} {obs.valueString}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${isFinal ? 'bg-green-50 text-green-700 ring-green-600/20' :
                                            isError ? 'bg-red-50 text-red-700 ring-red-600/10' :
                                                'bg-yellow-50 text-yellow-800 ring-yellow-600/20'
                                        }`}>
                                        {obs.status}
                                    </span>
                                </td>
                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                    {canEdit && (
                                        <button
                                            onClick={() => onAmend(obs)}
                                            className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50"
                                            disabled={encounterLocked}
                                        >
                                            {isFinal ? 'Amend' : 'Edit'}
                                        </button>
                                    )}
                                    {encounterLocked && <span className="text-gray-400 text-xs italic">Locked</span>}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
