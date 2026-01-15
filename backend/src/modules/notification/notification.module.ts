import { Module, Global } from '@nestjs/common';
import { NotificationService } from './services/notification.service';
import { NotificationRepository } from './repositories/notification.repository';
import { NotificationController } from './controllers/notification.controller';

@Global()
@Module({
    controllers: [NotificationController],
    providers: [NotificationService, NotificationRepository],
    exports: [NotificationService],
})
export class NotificationModule { }
