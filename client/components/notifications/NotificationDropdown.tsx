'use client';

import { useState, useRef, useEffect } from 'react';
import { useUnreadNotifications, useNotificationMutations, useNotifications } from '@/hooks/useNotifications';
import { Bell, Check, Trash2, ExternalLink, Inbox } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export function NotificationDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { data: unreadNotifications, isLoading: loadingUnread } = useUnreadNotifications();
    const { data: allNotifications } = useNotifications(10);
    const { markAsRead, markAllAsRead, deleteNotification } = useNotificationMutations();

    const unreadCount = unreadNotifications?.length || 0;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2.5 hover:bg-white hover:text-brand-teal rounded-xl transition-all shadow-sm hover:shadow-md"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2.5 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-gold opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-brand-gold text-[10px] text-white font-bold items-center justify-center">
                            {unreadCount}
                        </span>
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-2xl shadow-xl border border-neutral-100 overflow-hidden z-50">
                    <div className="p-4 border-b border-neutral-50 flex items-center justify-between bg-neutral-50/50">
                        <h3 className="font-bold text-brand-teal flex items-center gap-2">
                            <Bell className="h-4 w-4" />
                            Notifications
                        </h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAllAsRead.mutate()}
                                className="text-[10px] font-bold text-brand-gold hover:text-brand-gold/80 uppercase tracking-wider"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {allNotifications && allNotifications.length > 0 ? (
                            <div className="divide-y divide-neutral-50">
                                {allNotifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`p-4 transition-colors hover:bg-neutral-50/50 relative group ${!notification.read ? 'bg-brand-teal/[0.02]' : ''
                                            }`}
                                    >
                                        {!notification.read && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-gold" />
                                        )}
                                        <div className="flex justify-between gap-3">
                                            <div className="flex-1">
                                                <p className={`text-sm font-bold ${notification.read ? 'text-slate-600' : 'text-brand-teal'}`}>
                                                    {notification.title}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                                    {notification.message}
                                                </p>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <span className="text-[10px] text-slate-400 font-medium lowercase">
                                                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                                    </span>
                                                    {notification.link && (
                                                        <Link
                                                            href={notification.link}
                                                            onClick={() => {
                                                                setIsOpen(false);
                                                                if (!notification.read) markAsRead.mutate(notification.id);
                                                            }}
                                                            className="text-[10px] font-bold text-brand-teal flex items-center gap-1 hover:underline"
                                                        >
                                                            View Details
                                                            <ExternalLink className="h-2.5 w-2.5" />
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                {!notification.read && (
                                                    <button
                                                        onClick={() => markAsRead.mutate(notification.id)}
                                                        className="p-1.5 text-neutral-400 hover:text-brand-gold hover:bg-white rounded-md transition-all opacity-0 group-hover:opacity-100"
                                                        title="Mark as read"
                                                    >
                                                        <Check className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => deleteNotification.mutate(notification.id)}
                                                    className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-white rounded-md transition-all opacity-0 group-hover:opacity-100"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 px-6 text-center">
                                <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-3 text-neutral-400">
                                    <Inbox className="h-6 w-6" />
                                </div>
                                <p className="text-sm font-bold text-slate-400">All caught up!</p>
                                <p className="text-xs text-slate-400 mt-1">No new notifications at the moment.</p>
                            </div>
                        )}
                    </div>

                    <div className="p-3 bg-neutral-50/50 border-t border-neutral-50 text-center">
                        <Link
                            href="/notifications"
                            onClick={() => setIsOpen(false)}
                            className="text-xs font-bold text-brand-teal hover:text-brand-gold"
                        >
                            View all notifications
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
