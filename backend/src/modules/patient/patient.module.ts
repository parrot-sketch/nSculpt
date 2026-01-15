import { Module } from '@nestjs/common';
import { PatientService } from './services/patient.service';
import { PatientController } from './controllers/patient.controller';
import { PatientPublicController } from './controllers/patient-public.controller';
import { PatientLifecycleController } from './controllers/patient-lifecycle.controller';
import { PatientIntakeController } from './controllers/patient-intake.controller';
import { PatientInvitationController } from './controllers/patient-invitation.controller';
import { PatientRepository } from './repositories/patient.repository';
import { PatientIntakeRepository } from './repositories/patient-intake.repository';
import { PatientIntakeService } from './services/patient-intake.service';
import { PatientInvitationService } from './services/patient-invitation.service';
import { PatientFieldPermissionService } from './services/patient-field-permission.service';
import { PatientWorkflowService } from './services/patient-workflow.service';
import { PatientCoreService } from './services/patient-core.service';
import { PatientManagementService } from './services/patient-management.service';
import { PatientSelfService } from './services/patient-self.service';
import { PatientLifecycleService } from './domain/services/patient-lifecycle.service';
import { DomainEventService } from '../../services/domainEvent.service';
import { CorrelationService } from '../../services/correlation.service';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { ConsentModule } from '../consent/consent.module';

@Module({
  imports: [AuditModule, AuthModule, ConsentModule],
  controllers: [
    PatientController,
    PatientPublicController,
    PatientLifecycleController,
    PatientIntakeController,
    PatientInvitationController,
  ],
  providers: [
    PatientService,
    PatientCoreService,
    PatientManagementService,
    PatientSelfService,
    PatientRepository,
    PatientIntakeRepository,
    PatientIntakeService,
    PatientInvitationService,
    PatientFieldPermissionService,
    PatientWorkflowService,
    PatientLifecycleService,
    DomainEventService,
    CorrelationService,
  ],
  exports: [
    PatientService,
    PatientCoreService,
    PatientManagementService,
    PatientSelfService,
    PatientRepository,
    PatientIntakeService,
    PatientInvitationService,
    PatientWorkflowService,
    PatientLifecycleService,
  ],
})
export class PatientModule { }

