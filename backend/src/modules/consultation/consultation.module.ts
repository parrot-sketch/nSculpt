import { Module } from '@nestjs/common';
import { ConsultationService } from './services/consultation.service';
import { ConsultationController } from './controllers/consultation.controller';
import { ConsultationBookingController, PublicConsultationBookingController } from './controllers/consultation-booking.controller';
import { ConsultationRequestController } from './controllers/consultation-request.controller';
import { ConsultationRepository } from './repositories/consultation.repository';
import { ConsultationRequestRepository } from './repositories/consultation-request.repository';
import { ConsultationBookingService } from './services/consultation-booking.service';
import { ConsultationRequestService } from './services/consultation-request.service';
import { DomainEventService } from '../../services/domainEvent.service';
import { CorrelationService } from '../../services/correlation.service';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { AppointmentModule } from '../appointment/appointment.module';
import { forwardRef } from '@nestjs/common';
import { ProcedurePlanModule } from '../procedure-plan/procedure-plan.module';
import { FollowUpPlanModule } from '../follow-up-plan/follow-up-plan.module';

@Module({
  imports: [
    AuditModule,
    AuthModule,
    BillingModule,
    AppointmentModule,
    forwardRef(() => ProcedurePlanModule),
    forwardRef(() => FollowUpPlanModule),
  ],
  controllers: [
    ConsultationController,
    ConsultationBookingController,
    PublicConsultationBookingController,
    ConsultationRequestController,
  ],
  providers: [
    ConsultationService,
    ConsultationBookingService,
    ConsultationRequestService,
    ConsultationRepository,
    ConsultationRequestRepository,
    DomainEventService,
    CorrelationService,
  ],
  exports: [
    ConsultationService,
    ConsultationBookingService,
    ConsultationRequestService,
    ConsultationRepository,
    ConsultationRequestRepository,
  ],
})
export class ConsultationModule { }

