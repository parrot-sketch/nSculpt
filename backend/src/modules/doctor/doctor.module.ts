import { Module } from '@nestjs/common';
import { DoctorController } from './controllers/doctor.controller';
import { ConsultationController } from './controllers/consultation.controller';
import { DoctorService } from './services/doctor.service';
import { DoctorRepository } from './repositories/doctor.repository';
import { DomainEventService } from '../../services/domainEvent.service';
import { CorrelationService } from '../../services/correlation.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { PatientModule } from '../patient/patient.module';

// Application Layer
import { CreateConsultationUseCase } from './application/use-cases/create-consultation.use-case';
import { UpdateConsultationUseCase } from './application/use-cases/update-consultation.use-case';
import { CompleteConsultationUseCase } from './application/use-cases/complete-consultation.use-case';
import { GetConsultationQuery } from './application/queries/get-consultation.query';
import { ListConsultationsQuery } from './application/queries/list-consultations.query';

// Domain Layer
import { ConsultationStateMachineService } from './domain/services/consultation-state-machine.service';

// Infrastructure Layer
import { ConsultationRepository } from './infrastructure/repositories/consultation.repository';

/**
 * Doctor Module
 * 
 * Handles doctor-specific workflows for aesthetic surgery center:
 * - Doctor profile management
 * - Doctor-patient assignments
 * - Patient notes
 * - Consultations
 * - Consent management
 * - Image sharing
 * - Doctor-to-doctor consultations
 */
@Module({
  imports: [AuthModule, AuditModule, PatientModule],
  controllers: [DoctorController, ConsultationController],
  providers: [
    // Services
    DoctorService,
    DoctorRepository,
    DomainEventService,
    CorrelationService,
    
    // Domain Services
    ConsultationStateMachineService,
    
    // Infrastructure
    ConsultationRepository,
    
    // Application Layer - Use Cases
    CreateConsultationUseCase,
    UpdateConsultationUseCase,
    CompleteConsultationUseCase,
    
    // Application Layer - Queries
    GetConsultationQuery,
    ListConsultationsQuery,
  ],
  exports: [
    DoctorService,
    DoctorRepository,
    ConsultationRepository,
  ],
})
export class DoctorModule {}

