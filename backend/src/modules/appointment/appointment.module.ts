import { Module, forwardRef } from '@nestjs/common';
import { AppointmentController } from './controllers/appointment.controller';
import { AppointmentService } from './services/appointment.service';
import { AppointmentBookingService } from './services/appointment-booking.service';
import { AppointmentRepository } from './repositories/appointment.repository';
import { AppointmentBookingRepository } from './repositories/appointment-booking.repository';
import { AppointmentCoreService } from './services/appointment-core.service';
import { AppointmentCoordinationService } from './services/appointment-coordination.service';
import { AppointmentOperationsService } from './services/appointment-operations.service';
import { DomainEventService } from '../../services/domainEvent.service';
import { CorrelationService } from '../../services/correlation.service';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { PatientModule } from '../patient/patient.module';
import { BillingModule } from '../billing/billing.module';
import { AppointmentFloorService } from './services/appointment-floor.service';
import { AppointmentBillingService } from './services/appointment-billing.service';
import { AppointmentNotificationListener } from './listeners/appointment-notification.listener';

@Module({
  imports: [
    AuditModule,
    AuthModule,
    BillingModule,
    forwardRef(() => PatientModule), // For PatientLifecycleService
  ],
  controllers: [AppointmentController],
  providers: [
    AppointmentService,
    AppointmentBookingService,
    AppointmentFloorService,
    AppointmentBillingService,
    AppointmentCoreService,
    AppointmentCoordinationService,
    AppointmentOperationsService,
    AppointmentRepository,
    AppointmentBookingRepository,
    DomainEventService,
    CorrelationService,
    AppointmentNotificationListener,
  ],
  exports: [
    AppointmentService,
    AppointmentBookingService,
    AppointmentFloorService,
    AppointmentBillingService,
    AppointmentCoreService,
    AppointmentCoordinationService,
    AppointmentOperationsService,
    AppointmentRepository,
    AppointmentBookingRepository,
  ],
})
export class AppointmentModule { }

