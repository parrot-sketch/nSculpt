'use client';

import { useUserAuditTrail } from '@/hooks/useAdminQuery';
import { format } from 'date-fns';
import { Activity, Shield, User, Info, Clock, AlertTriangle } from 'lucide-react';

interface UserAuditTimelineProps {
    userId: string;
}

export function UserAuditTimeline({ userId }: UserAuditTimelineProps) {
    const { data, isLoading, error } = useUserAuditTrail(userId);

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg bg-rose-50 p-4 text-center text-sm text-rose-600">
                <AlertTriangle className="mx-auto mb-2 h-5 w-5" />
                Failed to load audit trail.
            </div>
        );
    }

    const logs = data?.data || [];

    if (logs.length === 0) {
        return (
            <div className="rounded-lg bg-slate-50 p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-3">
                    <Clock className="h-6 w-6 text-slate-400" />
                </div>
                <h3 className="text-sm font-medium text-slate-900">No History Available</h3>
                <p className="mt-1 text-sm text-slate-500">No audit events found for this user.</p>
            </div>
        );
    }

    return (
        <div className="flow-root">
            <ul role="list" className="-mb-8">
                {logs.map((log: any, logIdx: number) => {
                    const isLast = logIdx === logs.length - 1;

                    return (
                        <li key={log.id}>
                            <div className="relative pb-8">
                                {!isLast ? (
                                    <span
                                        className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200"
                                        aria-hidden="true"
                                    />
                                ) : null}
                                <div className="relative flex space-x-3">
                                    <div>
                                        <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white
                      ${log.success ? 'bg-indigo-100 text-indigo-600' : 'bg-rose-100 text-rose-600'}
                    `}>
                                            {getIconForAction(log.action)}
                                        </span>
                                    </div>
                                    <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                        <div>
                                            <p className="text-sm text-slate-500">
                                                {log.action} <span className="font-medium text-slate-900">by {log.user?.email || 'System'}</span>
                                            </p>
                                            {log.reason && (
                                                <p className="mt-1 text-xs text-slate-500 italic">
                                                    Reason: {log.reason}
                                                </p>
                                            )}
                                        </div>
                                        <div className="whitespace-nowrap text-right text-xs text-slate-400">
                                            <time dateTime={log.accessedAt}>
                                                {format(new Date(log.accessedAt), 'MMM d, yyyy HH:mm')}
                                            </time>
                                            <br />
                                            {log.ipAddress && (
                                                <span className="font-mono text-[10px] mt-1 inline-block bg-slate-100 px-1 py-0.5 rounded text-slate-500">
                                                    {log.ipAddress}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

function getIconForAction(action: string) {
    if (action.includes('LOGIN')) return <User className="h-4 w-4" />;
    if (action.includes('ROLE')) return <Shield className="h-4 w-4" />;
    if (action.includes('STATUS')) return <Activity className="h-4 w-4" />;
    return <Info className="h-4 w-4" />;
}
