import apiClient from './apiClient';

export enum NotificationType {
    INFO = 'INFO',
    SUCCESS = 'SUCCESS',
    WARNING = 'WARNING',
    ERROR = 'ERROR',
    APPOINTMENT = 'APPOINTMENT',
    SYSTEM = 'SYSTEM',
}

export enum NotificationPriority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    URGENT = 'URGENT',
}

export interface Notification {
    id: string;
    recipientId: string;
    title: string;
    message: string;
    type: NotificationType;
    priority: NotificationPriority;
    read: boolean;
    link?: string;
    metadata?: any;
    createdAt: string;
    updatedAt: string;
}

/**
 * Notification Service
 * 
 * Type-safe API client for notification endpoints.
 */
export const notificationService = {
    /**
     * Get all notifications for current user
     */
    async getNotifications(limit = 50, offset = 0): Promise<Notification[]> {
        const response = await apiClient.get<Notification[]>(`/notifications?limit=${limit}&offset=${offset}`);
        return (response as any).data || response;
    },

    /**
     * Get unread notifications
     */
    async getUnreadNotifications(): Promise<Notification[]> {
        const response = await apiClient.get<Notification[]>('/notifications/unread');
        return (response as any).data || response;
    },

    /**
     * Mark notification as read
     */
    async markAsRead(id: string): Promise<Notification> {
        const response = await apiClient.patch<Notification>(`/notifications/${id}/read`, {});
        return (response as any).data || response;
    },

    /**
     * Mark all notifications as read
     */
    async markAllAsRead(): Promise<void> {
        await apiClient.post('/notifications/read-all', {});
    },

    /**
     * Delete notification
     */
    async deleteNotification(id: string): Promise<void> {
        await apiClient.patch(`/notifications/delete/${id}`, {});
    },
};
