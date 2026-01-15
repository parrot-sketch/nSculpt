import { Module } from '@nestjs/common';
import { AdminController } from './controllers/admin.controller';
import { UsersController } from './controllers/users.controller';
import { RolesController } from './controllers/roles.controller';
import { PermissionsController } from './controllers/permissions.controller';
import { DepartmentsController } from './controllers/departments.controller';
import { TheatersController } from './controllers/theaters.controller';
import { CategoriesController } from './controllers/categories.controller';
import { VendorsController } from './controllers/vendors.controller';
import { BillingCodesController } from './controllers/billing-codes.controller';
import { InsuranceProvidersController } from './controllers/insurance-providers.controller';
import { FeeSchedulesController } from './controllers/fee-schedules.controller';
import { AuditController } from './controllers/audit.controller';
import { MedicalRecordsAdminController } from './controllers/medical-records-admin.controller';
import { SystemHealthController } from './controllers/system-health.controller';
import { ReportingController } from './controllers/reporting.controller';
import { AdminService } from './services/admin.service';
import { UsersService } from './services/users.service';
import { RolesService } from './services/roles.service';
import { PermissionsService } from './services/permissions.service';
import { DepartmentsService } from './services/departments.service';
import { TheatersService } from './services/theaters.service';
import { CategoriesService } from './services/categories.service';
import { VendorsService } from './services/vendors.service';
import { BillingCodesService } from './services/billing-codes.service';
import { InsuranceProvidersService } from './services/insurance-providers.service';
import { FeeSchedulesService } from './services/fee-schedules.service';
import { AuditService } from './services/audit.service';
import { MedicalRecordsAdminService } from './services/medical-records-admin.service';
import { SystemHealthService } from './services/system-health.service';
import { ReportingService } from './services/reporting.service';
import { UsersRepository } from './repositories/users.repository';
import { RolesRepository } from './repositories/roles.repository';
import { PermissionsRepository } from './repositories/permissions.repository';
import { DepartmentsRepository } from './repositories/departments.repository';
import { TheatersRepository } from './repositories/theaters.repository';
import { CategoriesRepository } from './repositories/categories.repository';
import { VendorsRepository } from './repositories/vendors.repository';
import { BillingCodesRepository } from './repositories/billing-codes.repository';
import { InsuranceProvidersRepository } from './repositories/insurance-providers.repository';
import { FeeSchedulesRepository } from './repositories/fee-schedules.repository';
import { AuditRepository } from './repositories/audit.repository';
import { MedicalRecordsAdminRepository } from './repositories/medical-records-admin.repository';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { MedicalRecordsModule } from '../medical-records/medicalRecords.module';
import { DomainEventService } from '../../services/domainEvent.service';
import { CorrelationService } from '../../services/correlation.service';

/**
 * Admin Module
 * 
 * Provides admin-only functionality for:
 * - User management
 * - Role management
 * - Permission management
 * - System monitoring
 * 
 * Security:
 * - All endpoints require ADMIN role
 * - Fine-grained permissions required
 * - All actions logged for audit
 */
@Module({
  imports: [AuthModule, AuditModule, MedicalRecordsModule],
  controllers: [
    AdminController,
    UsersController,
    RolesController,
    PermissionsController,
    DepartmentsController,
    TheatersController,
    CategoriesController,
    VendorsController,
    BillingCodesController,
    InsuranceProvidersController,
    FeeSchedulesController,
    AuditController,
    MedicalRecordsAdminController,
    SystemHealthController,
    ReportingController,
  ],
  providers: [
    AdminService,
    UsersService,
    RolesService,
    PermissionsService,
    DepartmentsService,
    TheatersService,
    CategoriesService,
    VendorsService,
    BillingCodesService,
    InsuranceProvidersService,
    FeeSchedulesService,
    AuditService,
    MedicalRecordsAdminService,
    SystemHealthService,
    ReportingService,
    UsersRepository,
    RolesRepository,
    PermissionsRepository,
    DepartmentsRepository,
    TheatersRepository,
    CategoriesRepository,
    VendorsRepository,
    BillingCodesRepository,
    InsuranceProvidersRepository,
    FeeSchedulesRepository,
    AuditRepository,
    MedicalRecordsAdminRepository,
    DomainEventService,
    CorrelationService,
  ],
  exports: [
    AdminService,
    UsersService,
    RolesService,
    PermissionsService,
    DepartmentsService,
    TheatersService,
    CategoriesService,
    VendorsService,
    BillingCodesService,
    InsuranceProvidersService,
    FeeSchedulesService,
    AuditService,
    MedicalRecordsAdminService,
    SystemHealthService,
    ReportingService,
  ],
})
export class AdminModule {}

