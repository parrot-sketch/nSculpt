import { Injectable } from '@nestjs/common';
import { Notification, NotificationType, NotificationPriority } from '@prisma/client';
import { NotificationRepository, CreateNotificationDto } from '../repositories/notification.repository';

@Injectable()
export class NotificationService {
    constructor(private readonly repository: NotificationRepository) { }

    async createNotification(data: CreateNotificationDto): Promise<Notification> {
        return this.repository.create(data);
    }

    async getNotifications(recipientId: string, limit = 50, offset = 0): Promise<Notification[]> {
        return this.repository.findByRecipient(recipientId, limit, offset);
    }

    async getUnreadNotifications(recipientId: string): Promise<Notification[]> {
        return this.repository.findUnreadByRecipient(recipientId);
    }

    async markAsRead(id: string): Promise<Notification> {
        return this.repository.markAsRead(id);
    }

    async markAllAsRead(recipientId: string): Promise<void> {
        await this.repository.markAllAsRead(recipientId);
    }

    async deleteNotification(id: string): Promise<void> {
        await this.repository.delete(id);
    }

    // Helper methods for common notification types
    async notifyPatient(
        patientId: string,
        title: string,
        message: string,
        priority: NotificationPriority = NotificationPriority.MEDIUM,
        link?: string,
        metadata?: any
    ): Promise<Notification> {
        return this.repository.create({
            recipientId: patientId,
            title,
            message,
            type: NotificationType.INFO,
            priority,
            link,
            metadata,
        });
    }

    async notifyDoctor(
        doctorId: string,
        title: string,
        message: string,
        priority: NotificationPriority = NotificationPriority.HIGH,
        link?: string,
        metadata?: any
    ): Promise<Notification> {
        return this.repository.create({
            recipientId: doctorId,
            title,
            message,
            type: NotificationType.APPOINTMENT,
            priority,
            link,
            metadata,
        });
    }

    async notifyFrontDesk(
        frontDeskId: string,
        title: string,
        message: string,
        priority: NotificationPriority = NotificationPriority.MEDIUM,
        link?: string,
        metadata?: any
    ): Promise<Notification> {
        return this.repository.create({
            recipientId: frontDeskId,
            title,
            message,
            type: NotificationType.APPOINTMENT,
            priority,
            link,
            metadata,
        });
    }
}
