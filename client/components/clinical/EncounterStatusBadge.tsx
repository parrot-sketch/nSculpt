import { EncounterStatus } from '@/types/clinical';
import { cn } from '@/lib/utils'; // Assuming standard Shadcn pattern

interface EncounterStatusBadgeProps {
    status: EncounterStatus;
    locked?: boolean;
    className?: string;
}

export function EncounterStatusBadge({ status, locked, className }: EncounterStatusBadgeProps) {
    if (locked) {
        return (
            <span className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200",
                className
            )}>
                🔒 LOCKED
            </span>
        );
    }

    const variants = {
        [EncounterStatus.PLANNED]: "bg-blue-100 text-blue-800",
        [EncounterStatus.ARRIVED]: "bg-purple-100 text-purple-800",
        [EncounterStatus.IN_PROGRESS]: "bg-green-100 text-green-800 animate-pulse",
        [EncounterStatus.FINISHED]: "bg-gray-100 text-gray-800",
        [EncounterStatus.CANCELLED]: "bg-red-100 text-red-800 line-through",
    };

    return (
        <span className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
            variants[status] || "bg-gray-100 text-gray-800",
            className
        )}>
            {status.replace('_', ' ')}
        </span>
    );
}
