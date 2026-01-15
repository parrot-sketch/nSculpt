import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ClsModule } from 'nestjs-cls';
import cookieParser from 'cookie-parser';
import appConfig from './config/app.config';
import prismaConfig from './config/prisma.config';
import { PrismaModule } from './prisma/prisma.module';
import { CorrelationMiddleware } from './middleware/correlation.middleware';
import { CorrelationService } from './services/correlation.service';
import { DomainEventService } from './services/domainEvent.service';
import { UserContextInterceptor } from './middleware/user-context.interceptor';

// Feature modules
import { PatientModule } from './modules/patient/patient.module';
import { AppointmentModule } from './modules/appointment/appointment.module';
import { ConsultationModule } from './modules/consultation/consultation.module';
import { ProcedurePlanModule } from './modules/procedure-plan/procedure-plan.module';
import { FollowUpPlanModule } from './modules/follow-up-plan/follow-up-plan.module';
import { EMRModule } from './modules/emr/emr.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PrescriptionModule } from './modules/prescription/prescription.module';
import { TheaterModule } from './modules/theater/theater.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { BillingModule } from './modules/billing/billing.module';
import { ConsentModule } from './modules/consent/consent.module';
import { MedicalRecordsModule } from './modules/medical-records/medicalRecords.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { DoctorModule } from './modules/doctor/doctor.module';
import { EncounterModule } from './modules/encounter/encounter.module';
import { ClinicalModule } from './modules/clinical/clinical.module';
import { AccessControlModule } from './modules/access-control/access-control.module';
import { ClinicalServiceModule } from './modules/clinical-service/clinical-service.module';
import { NotificationModule } from './modules/notification/notification.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, prismaConfig],
    }),
    // Serve static files from uploads directory
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '../..', 'uploads'), // From /app/dist/src to /app/uploads
      serveRoot: '/uploads',
      serveStaticOptions: {
        index: false, // Don't serve index.html
        dotfiles: 'deny', // Deny access to dotfiles
      },
    }),
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    PrismaModule, // Global DB Access
    AuditModule, // Import AuditModule first so DataAccessLogService is available
    AuthModule, // Import AuthModule for authentication and authorization
    NotificationModule, // Global Notification Service
    AdminModule, // Admin functionality (user, role, permission management)
    DoctorModule, // Doctor workflows and patient management
    PatientModule,
    EncounterModule,
    ClinicalModule,
    AccessControlModule,
    AppointmentModule, // Appointment booking (payment-required) - before Consultation
    ConsultationModule,
    ProcedurePlanModule, // Procedure plan management
    FollowUpPlanModule, // Follow-up plan management
    EMRModule,
    OrdersModule,
    PrescriptionModule,
    TheaterModule,
    InventoryModule,
    BillingModule,
    ConsentModule,
    MedicalRecordsModule,
    ClinicalServiceModule,
  ],
  controllers: [HealthController],
  providers: [
    CorrelationService,
    DomainEventService,
    {
      provide: 'APP_INTERCEPTOR',
      useClass: UserContextInterceptor,
    }
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(cookieParser())
      .forRoutes('*')
      .apply(CorrelationMiddleware)
      .forRoutes('*');
  }
}

