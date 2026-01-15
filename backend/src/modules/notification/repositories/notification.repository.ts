import { Injectable } from '@nestjs/common';
import { Prisma, Notification, NotificationType, NotificationPriority } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';

export interface CreateNotificationDto {
    recipientId: string;
    title: string;
    message: string;
    type?: NotificationType;
    priority?: NotificationPriority;
    link?: string;
    metadata?: any;
}

@Injectable()
export class NotificationRepository {
    private prisma = getPrismaClient();

    async create(data: CreateNotificationDto): Promise<Notification> {
        return this.prisma.notification.create({
            data: {
                recipient: { connect: { id: data.recipientId } },
                title: data.title,
                message: data.message,
                type: data.type || NotificationType.INFO,
                priority: data.priority || NotificationPriority.MEDIUM,
                link: data.link,
                metadata: data.metadata || Prisma.JsonNull,
            },
        });
    }

    async findByRecipient(recipientId: string, limit = 50, offset = 0): Promise<Notification[]> {
        return this.prisma.notification.findMany({
            where: { recipientId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });
    }

    async findUnreadByRecipient(recipientId: string): Promise<Notification[]> {
        return this.prisma.notification.findMany({
            where: { recipientId, isRead: false },
            orderBy: { createdAt: 'desc' },
        });
    }

    async markAsRead(id: string): Promise<Notification> {
        return this.prisma.notification.update({
            where: { id },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });
    }

    async markAllAsRead(recipientId: string): Promise<void> {
        await this.prisma.notification.updateMany({
            where: { recipientId, isRead: false },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });
    }

    async delete(id: string): Promise<void> {
        await this.prisma.notification.delete({
            where: { id },
        });
    }
}
