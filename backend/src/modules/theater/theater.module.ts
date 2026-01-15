import { Module } from '@nestjs/common';
import { TheaterService } from './services/theater.service';
import { TheaterController } from './controllers/theater.controller';
import { TheaterRepository } from './repositories/theater.repository';
import { InventoryModule } from '../inventory/inventory.module';
import { DomainEventService } from '../../services/domainEvent.service';
import { CorrelationService } from '../../services/correlation.service';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuditModule, AuthModule, InventoryModule],
  controllers: [TheaterController],
  providers: [TheaterService, TheaterRepository, DomainEventService, CorrelationService],
  exports: [TheaterService, TheaterRepository],
})
export class TheaterModule {}

