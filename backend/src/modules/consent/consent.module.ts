import { Module } from '@nestjs/common';
import { ConsentService } from './services/consent.service';
import { ConsentContentService } from './services/consent-content.service';
import { StructuredDataValidatorService } from './services/structured-data-validator.service';
import { ConsentTemplateUploadService } from './services/consent-template-upload.service';
import { ConsentStateMachineService } from './services/consent-state-machine.service';
import { ConsentController } from './controllers/consent.controller';
import { ConsentTemplateController } from './controllers/consent-template.controller';
import { ConsentRepository } from './repositories/consent.repository';
import { DomainEventService } from '../../services/domainEvent.service';
import { CorrelationService } from '../../services/correlation.service';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { EMRModule } from '../emr/emr.module';
// PDF Workflow Services and Controllers
import { PDFConsentService } from './services/pdf-consent.service';
import { PDFConsentTemplateService } from './services/pdf-consent-template.service';
import { PDFProcessingService } from './services/pdf-processing.service';
import { PDFConsentRepository } from './repositories/pdf-consent.repository';
import { PDFConsentController } from './controllers/pdf-consent.controller';
import { PDFConsentTemplateController } from './controllers/pdf-consent-template.controller';

@Module({
  imports: [AuditModule, AuthModule, EMRModule],
  controllers: [
    ConsentController,
    ConsentTemplateController,
    PDFConsentController,
    PDFConsentTemplateController,
  ],
  providers: [
    ConsentService,
    ConsentContentService,
    StructuredDataValidatorService,
    ConsentTemplateUploadService,
    ConsentStateMachineService,
    ConsentRepository,
    // PDF Workflow Providers
    PDFConsentService,
    PDFConsentTemplateService,
    PDFProcessingService,
    PDFConsentRepository,
    DomainEventService,
    CorrelationService,
  ],
  exports: [
    ConsentService,
    ConsentRepository,
    ConsentContentService,
    ConsentStateMachineService,
    // PDF Workflow Exports
    PDFConsentService,
    PDFConsentRepository,
  ],
})
export class ConsentModule {}

