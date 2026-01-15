import { Module } from '@nestjs/common';
import { MedicalRecordsService } from './services/medicalRecords.service';
import { MedicalRecordsController } from './controllers/medicalRecords.controller';
import { MedicalRecordsRepository } from './repositories/medicalRecords.repository';
import { DomainEventService } from '../../services/domainEvent.service';
import { CorrelationService } from '../../services/correlation.service';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [MedicalRecordsController],
  providers: [MedicalRecordsService, MedicalRecordsRepository, DomainEventService, CorrelationService],
  exports: [MedicalRecordsService, MedicalRecordsRepository],
})
export class MedicalRecordsModule {}

