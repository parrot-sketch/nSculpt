import { Module } from '@nestjs/common';
import { PrescriptionService } from './services/prescription.service';
import { PrescriptionController } from './controllers/prescription.controller';
import { PrescriptionRepository } from './repositories/prescription.repository';
import { ConsultationRepository } from '../consultation/repositories/consultation.repository';
import { InventoryModule } from '../inventory/inventory.module';
import { DomainEventService } from '../../services/domainEvent.service';
import { CorrelationService } from '../../services/correlation.service';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { ConsultationModule } from '../consultation/consultation.module';

@Module({
  imports: [AuditModule, AuthModule, ConsultationModule, InventoryModule],
  controllers: [PrescriptionController],
  providers: [
    PrescriptionService,
    PrescriptionRepository,
    ConsultationRepository,
    DomainEventService,
    CorrelationService,
  ],
  exports: [PrescriptionService, PrescriptionRepository],
})
export class PrescriptionModule {}









