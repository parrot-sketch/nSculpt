import {
    Controller,
    Get,
    Patch,
    Post,
    Param,
    Query,
    UseGuards,
    ParseIntPipe,
    DefaultValuePipe
} from '@nestjs/common';
import { NotificationService } from '../services/notification.service';
import { CurrentUser } from '../../auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../auth/services/identityContext.service';

@Controller('notifications')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    @Get()
    async getNotifications(
        @CurrentUser() user: UserIdentity,
        @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
        @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    ) {
        return this.notificationService.getNotifications(user.id, limit, offset);
    }

    @Get('unread')
    async getUnreadNotifications(@CurrentUser() user: UserIdentity) {
        return this.notificationService.getUnreadNotifications(user.id);
    }

    @Patch(':id/read')
    async markAsRead(@Param('id') id: string) {
        return this.notificationService.markAsRead(id);
    }

    @Post('read-all')
    async markAllAsRead(@CurrentUser() user: UserIdentity) {
        return this.notificationService.markAllAsRead(user.id);
    }

    @Patch('delete/:id')
    async deleteNotification(@Param('id') id: string) {
        return this.notificationService.deleteNotification(id);
    }
}
