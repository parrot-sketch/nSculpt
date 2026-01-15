import { Module } from '@nestjs/common';
import { BillingService } from './services/billing.service';
import { BillingController } from './controllers/billing.controller';
import { BillingRepository } from './repositories/billing.repository';
import { DomainEventService } from '../../services/domainEvent.service';
import { CorrelationService } from '../../services/correlation.service';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [BillingController],
  providers: [BillingService, BillingRepository, DomainEventService, CorrelationService],
  exports: [BillingService, BillingRepository],
})
export class BillingModule {}

