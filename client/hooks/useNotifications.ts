import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService, Notification } from '@/services/notification.service';

/**
 * Query key factory for notifications
 */
export const notificationKeys = {
    all: ['notifications'] as const,
    unread: () => [...notificationKeys.all, 'unread'] as const,
    list: (limit: number, offset: number) => [...notificationKeys.all, 'list', { limit, offset }] as const,
};

/**
 * Hook to get all notifications
 */
export function useNotifications(limit = 50, offset = 0) {
    return useQuery({
        queryKey: notificationKeys.list(limit, offset),
        queryFn: () => notificationService.getNotifications(limit, offset),
        staleTime: 30000, // 30 seconds
    });
}

/**
 * Hook to get unread notifications only
 */
export function useUnreadNotifications() {
    return useQuery({
        queryKey: notificationKeys.unread(),
        queryFn: () => notificationService.getUnreadNotifications(),
        refetchInterval: 30000, // Background poll every 30 seconds
    });
}

/**
 * Hook for notification mutations
 */
export function useNotificationMutations() {
    const queryClient = useQueryClient();

    const markAsRead = useMutation({
        mutationFn: (id: string) => notificationService.markAsRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.all });
        },
    });

    const markAllAsRead = useMutation({
        mutationFn: () => notificationService.markAllAsRead(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.all });
        },
    });

    const deleteNotification = useMutation({
        mutationFn: (id: string) => notificationService.deleteNotification(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.all });
        },
    });

    return {
        markAsRead,
        markAllAsRead,
        deleteNotification,
    };
}
