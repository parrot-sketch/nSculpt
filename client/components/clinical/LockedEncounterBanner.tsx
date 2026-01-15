import { AlertTriangle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LockedEncounterBannerProps {
    locked: boolean;
    lockedBy?: string; // Name
    lockedAt?: string; // Date
}

export function LockedEncounterBanner({ locked, lockedBy, lockedAt }: LockedEncounterBannerProps) {
    if (!locked) return null;

    return (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4 rounded-r-md">
            <div className="flex">
                <div className="flex-shrink-0">
                    <Lock className="h-5 w-5 text-amber-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                    <p className="text-sm text-amber-700">
                        <span className="font-bold">This encounter is LOCKED.</span>
                        {' '}
                        No further clinical observations, diagnoses, or notes can be added.
                        {lockedBy && <span className="block mt-1 text-amber-600 text-xs">Locked by {lockedBy} on {new Date(lockedAt || '').toLocaleDateString()}</span>}
                    </p>
                </div>
            </div>
        </div>
    );
}
