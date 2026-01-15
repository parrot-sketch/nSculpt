import { Module } from '@nestjs/common';
import { LabOrderService } from './services/lab-order.service';
import { LabOrderController } from './controllers/lab-order.controller';
import { LabOrderRepository } from './repositories/lab-order.repository';
import { ConsultationRepository } from '../consultation/repositories/consultation.repository';
import { EMRModule } from '../emr/emr.module';
import { InventoryModule } from '../inventory/inventory.module';
import { DomainEventService } from '../../services/domainEvent.service';
import { CorrelationService } from '../../services/correlation.service';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { ConsultationModule } from '../consultation/consultation.module';

@Module({
  imports: [AuditModule, AuthModule, ConsultationModule, EMRModule, InventoryModule],
  controllers: [LabOrderController],
  providers: [
    LabOrderService,
    LabOrderRepository,
    ConsultationRepository,
    DomainEventService,
    CorrelationService,
  ],
  exports: [LabOrderService, LabOrderRepository],
})
export class OrdersModule {}

