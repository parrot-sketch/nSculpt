import { Module } from '@nestjs/common';
import { EMRNoteService } from './services/emr-note.service';
import { EMRNoteController } from './controllers/emr-note.controller';
import { EMRNoteRepository } from './repositories/emr-note.repository';
import { ConsultationRepository } from '../consultation/repositories/consultation.repository';
import { DomainEventService } from '../../services/domainEvent.service';
import { CorrelationService } from '../../services/correlation.service';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { ConsultationModule } from '../consultation/consultation.module';

@Module({
  imports: [AuditModule, AuthModule, ConsultationModule],
  controllers: [EMRNoteController],
  providers: [
    EMRNoteService,
    EMRNoteRepository,
    ConsultationRepository,
    DomainEventService,
    CorrelationService,
  ],
  exports: [EMRNoteService, EMRNoteRepository],
})
export class EMRModule {}









