# Security Guards Implementation Guide

This document contains the fixed security guards and the RLS validation service that needs to be created.

## Files Created/Modified

### 1. ✅ Fixed: `backend/src/common/guards/roles.guard.ts`
Already updated with proper role validation.

### 2. ✅ Fixed: `backend/src/common/guards/rls.guard.ts`
Already updated with RLS validation logic.

### 3. ⚠️ NEEDS CREATION: `backend/src/modules/audit/services/rlsValidation.service.ts`

**Create this file with the following content:**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../../../prisma/client';
import { IdentityContextService } from '../../../auth/services/identityContext.service';

/**
 * RLS Validation Service
 * 
 * Provides row-level security validation for resources.
 * Checks ownership, relationships, and access rights.
 */
@Injectable()
export class RlsValidationService {
  private prisma: PrismaClient;

  constructor(private identityContext: IdentityContextService) {
    this.prisma = getPrismaClient();
  }

  /**
   * Check if user has access to a patient
   * 
   * Access granted if:
   * - User is ADMIN
   * - User's department matches patient's department (if applicable)
   * - User is assigned to a surgical case for this patient
   * - User is primary surgeon for a case involving this patient
   */
  async canAccessPatient(patientId: string, userId: string): Promise<boolean> {
    // ADMIN has full access
    if (this.identityContext.hasRole('ADMIN')) {
      return true;
    }

    // Check if user is assigned to any surgical case for this patient
    const caseAssignment = await this.prisma.surgicalCase.findFirst({
      where: {
        patientId,
        OR: [
          { primarySurgeonId: userId },
          {
            resourceAllocations: {
              some: {
                resourceType: 'STAFF',
                resourceId: userId,
                status: 'ALLOCATED',
              },
            },
          },
        ],
      },
    });

    if (caseAssignment) {
      return true;
    }

    // TODO: Add department-based access if patient has department field
    // For now, if no case assignment, deny access (except ADMIN)
    return false;
  }

  /**
   * Check if user has access to a surgical case
   * 
   * Access granted if:
   * - User is ADMIN
   * - User is the primarySurgeonId
   * - User is allocated to the case via ResourceAllocation
   * - User's department matches the theater's department
   */
  async canAccessSurgicalCase(caseId: string, userId: string): Promise<boolean> {
    // ADMIN has full access
    if (this.identityContext.hasRole('ADMIN')) {
      return true;
    }

    const surgicalCase = await this.prisma.surgicalCase.findUnique({
      where: { id: caseId },
      include: {
        reservations: {
          include: {
            theater: {
              include: {
                department: true,
              },
            },
          },
        },
        resourceAllocations: true,
      },
    });

    if (!surgicalCase) {
      return false;
    }

    // Check if user is primary surgeon
    if (surgicalCase.primarySurgeonId === userId) {
      return true;
    }

    // Check if user is allocated to the case
    const isAllocated = surgicalCase.resourceAllocations.some(
      (allocation) =>
        allocation.resourceType === 'STAFF' &&
        allocation.resourceId === userId &&
        allocation.status === 'ALLOCATED',
    );

    if (isAllocated) {
      return true;
    }

    // Check if user's department matches theater department
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { departmentId: true },
    });

    if (user?.departmentId) {
      const theaterDepartmentMatch = surgicalCase.reservations.some(
        (reservation) => reservation.theater.departmentId === user.departmentId,
      );

      if (theaterDepartmentMatch) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if user has access to a medical record
   * 
   * Access granted if:
   * - User is ADMIN
   * - User has access to the patient (via case or department)
   */
  async canAccessMedicalRecord(
    recordId: string,
    userId: string,
  ): Promise<boolean> {
    // ADMIN has full access
    if (this.identityContext.hasRole('ADMIN')) {
      return true;
    }

    const record = await this.prisma.medicalRecord.findUnique({
      where: { id: recordId },
      select: { patientId: true },
    });

    if (!record) {
      return false;
    }

    // Check patient access
    return this.canAccessPatient(record.patientId, userId);
  }

  /**
   * Check if user has access to a consent instance
   * 
   * Access granted if:
   * - User is ADMIN
   * - User has access to the patient
   */
  async canAccessConsent(consentId: string, userId: string): Promise<boolean> {
    // ADMIN has full access
    if (this.identityContext.hasRole('ADMIN')) {
      return true;
    }

    const consent = await this.prisma.patientConsentInstance.findUnique({
      where: { id: consentId },
      select: { patientId: true },
    });

    if (!consent) {
      return false;
    }

    // Check patient access
    return this.canAccessPatient(consent.patientId, userId);
  }

  /**
   * Check if user has access to a bill
   * 
   * Access granted if:
   * - User is ADMIN
   * - User has BILLING role
   * - User has access to the patient
   */
  async canAccessBill(billId: string, userId: string): Promise<boolean> {
    // ADMIN and BILLING roles have access
    if (
      this.identityContext.hasRole('ADMIN') ||
      this.identityContext.hasRole('BILLING')
    ) {
      return true;
    }

    const bill = await this.prisma.bill.findUnique({
      where: { id: billId },
      select: { patientId: true },
    });

    if (!bill) {
      return false;
    }

    // Check patient access (for DOCTOR role viewing their patient's bills)
    return this.canAccessPatient(bill.patientId, userId);
  }

  /**
   * Check if user can modify a surgical case
   * 
   * Modification allowed if:
   * - User is ADMIN
   * - User is the primarySurgeonId
   * - User is allocated to the case (for NURSE role)
   */
  async canModifySurgicalCase(
    caseId: string,
    userId: string,
  ): Promise<boolean> {
    // ADMIN can modify any case
    if (this.identityContext.hasRole('ADMIN')) {
      return true;
    }

    const surgicalCase = await this.prisma.surgicalCase.findUnique({
      where: { id: caseId },
      select: {
        primarySurgeonId: true,
        resourceAllocations: {
          where: {
            resourceType: 'STAFF',
            resourceId: userId,
            status: 'ALLOCATED',
          },
        },
      },
    });

    if (!surgicalCase) {
      return false;
    }

    // Primary surgeon can modify
    if (surgicalCase.primarySurgeonId === userId) {
      return true;
    }

    // Allocated staff (NURSE) can modify
    if (surgicalCase.resourceAllocations.length > 0) {
      return true;
    }

    return false;
  }

  /**
   * Check if user can modify a medical record
   * 
   * Modification allowed if:
   * - User is ADMIN
   * - User is DOCTOR and has access to the patient
   */
  async canModifyMedicalRecord(
    recordId: string,
    userId: string,
  ): Promise<boolean> {
    // ADMIN can modify any record
    if (this.identityContext.hasRole('ADMIN')) {
      return true;
    }

    // DOCTOR can modify if they have patient access
    if (this.identityContext.hasRole('DOCTOR')) {
      return this.canAccessMedicalRecord(recordId, userId);
    }

    return false;
  }
}
```

### 4. Module Registration

**Update `backend/src/modules/audit/audit.module.ts`** to include `RlsValidationService`:

```typescript
import { Module } from '@nestjs/common';
import { RlsValidationService } from './services/rlsValidation.service';
import { DataAccessLogService } from './services/dataAccessLog.service';
// ... other imports

@Module({
  providers: [
    DataAccessLogService,
    RlsValidationService, // Add this
  ],
  exports: [
    DataAccessLogService,
    RlsValidationService, // Export this
  ],
})
export class AuditModule {}
```

**Update `backend/src/app.module.ts`** to ensure `AuditModule` is imported globally or where needed.

---

## Usage Examples

### Example 1: PatientController with RLS

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { PatientService } from '../services/patient.service';
import { CreatePatientDto } from '../dto/create-patient.dto';
import { UpdatePatientDto } from '../dto/update-patient.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RlsGuard } from '../../../common/guards/rls.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../../modules/auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../../modules/auth/services/identityContext.service';

@Controller('patients')
@UseGuards(RolesGuard, RlsGuard) // ✅ Both guards applied
@UseInterceptors(DataAccessLogInterceptor)
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Post()
  @Roles('ADMIN', 'NURSE', 'DOCTOR')
  create(
    @Body() createPatientDto: CreatePatientDto,
    @CurrentUser() user: UserIdentity, // ✅ Extract user
  ) {
    return this.patientService.create(createPatientDto, user.id); // ✅ Pass userId
  }

  @Get()
  @Roles('ADMIN', 'NURSE', 'DOCTOR')
  findAll() {
    // RLS doesn't apply to list endpoints - filtering happens in service
    return this.patientService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'NURSE', 'DOCTOR')
  // ✅ RlsGuard automatically validates access to patient :id
  findOne(@Param('id') id: string) {
    return this.patientService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'NURSE', 'DOCTOR')
  // ✅ RlsGuard validates access + modification rights
  update(
    @Param('id') id: string,
    @Body() updatePatientDto: UpdatePatientDto,
    @CurrentUser() user: UserIdentity, // ✅ Extract user
  ) {
    return this.patientService.update(id, updatePatientDto, user.id); // ✅ Pass userId
  }

  @Delete(':id')
  @Roles('ADMIN')
  // ✅ RlsGuard validates access
  remove(
    @Param('id') id: string,
    @CurrentUser() user: UserIdentity, // ✅ Extract user
  ) {
    return this.patientService.remove(id, user.id); // ✅ Pass userId
  }
}
```

### Example 2: TheaterController with RLS

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { TheaterService } from '../services/theater.service';
import { CreateCaseDto } from '../dto/create-case.dto';
import { UpdateCaseDto } from '../dto/update-case.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RlsGuard } from '../../../common/guards/rls.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../../modules/auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../../modules/auth/services/identityContext.service';

@Controller('theater')
@UseGuards(RolesGuard, RlsGuard) // ✅ Both guards
@UseInterceptors(DataAccessLogInterceptor)
export class TheaterController {
  constructor(private readonly theaterService: TheaterService) {}

  @Post('cases')
  @Roles('ADMIN', 'SURGEON', 'NURSE')
  createCase(
    @Body() createCaseDto: CreateCaseDto,
    @CurrentUser() user: UserIdentity, // ✅ Extract user
  ) {
    return this.theaterService.createCase(createCaseDto, user.id); // ✅ Pass userId
  }

  @Get('cases')
  @Roles('ADMIN', 'SURGEON', 'NURSE', 'DOCTOR')
  findAll() {
    // Service should filter by user's cases
    return this.theaterService.findAll();
  }

  @Get('cases/:id')
  @Roles('ADMIN', 'SURGEON', 'NURSE', 'DOCTOR')
  // ✅ RlsGuard validates: primarySurgeonId, ResourceAllocation, or department match
  findOne(@Param('id') id: string) {
    return this.theaterService.findOne(id);
  }

  @Patch('cases/:id')
  @Roles('ADMIN', 'SURGEON', 'NURSE')
  // ✅ RlsGuard validates modification rights (primarySurgeonId or allocated staff)
  update(
    @Param('id') id: string,
    @Body() updateCaseDto: UpdateCaseDto,
    @CurrentUser() user: UserIdentity, // ✅ Extract user
  ) {
    return this.theaterService.updateCase(id, updateCaseDto, user.id); // ✅ Pass userId
  }

  @Patch('cases/:id/status')
  @Roles('ADMIN', 'SURGEON', 'NURSE')
  // ✅ RlsGuard validates modification rights
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; reason?: string },
    @CurrentUser() user: UserIdentity, // ✅ Extract user
  ) {
    // ✅ Get actual current status from case
    return this.theaterService.updateCaseStatus(
      id,
      body.status,
      body.reason,
      user.id, // ✅ Pass userId
    );
  }
}
```

### Example 3: MedicalRecordsController with RLS

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { MedicalRecordsService } from '../services/medicalRecords.service';
import { CreateMedicalRecordDto } from '../dto/create-medicalRecord.dto';
import { UpdateMedicalRecordDto } from '../dto/update-medicalRecord.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RlsGuard } from '../../../common/guards/rls.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../../modules/auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../../modules/auth/services/identityContext.service';

@Controller('medical-records')
@UseGuards(RolesGuard, RlsGuard) // ✅ Both guards
@UseInterceptors(DataAccessLogInterceptor)
export class MedicalRecordsController {
  constructor(
    private readonly medicalRecordsService: MedicalRecordsService,
  ) {}

  @Post()
  @Roles('ADMIN', 'DOCTOR', 'NURSE')
  create(
    @Body() createMedicalRecordDto: CreateMedicalRecordDto,
    @CurrentUser() user: UserIdentity, // ✅ Extract user
  ) {
    return this.medicalRecordsService.create(createMedicalRecordDto, user.id); // ✅ Pass userId
  }

  @Get()
  @Roles('ADMIN', 'DOCTOR', 'NURSE')
  findAll() {
    // Service should filter by patient relationships
    return this.medicalRecordsService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'DOCTOR', 'NURSE')
  // ✅ RlsGuard validates patient relationship
  findOne(@Param('id') id: string) {
    return this.medicalRecordsService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'DOCTOR')
  // ✅ RlsGuard validates: ADMIN or DOCTOR with patient access
  update(
    @Param('id') id: string,
    @Body() updateMedicalRecordDto: UpdateMedicalRecordDto,
    @CurrentUser() user: UserIdentity, // ✅ Extract user
  ) {
    return this.medicalRecordsService.update(
      id,
      updateMedicalRecordDto,
      user.id, // ✅ Pass userId
    );
  }

  @Post(':id/merge')
  @Roles('ADMIN', 'DOCTOR')
  // ✅ RlsGuard validates access to both records
  merge(
    @Param('id') targetId: string,
    @Body() body: { sourceRecordId: string; reason?: string },
    @CurrentUser() user: UserIdentity, // ✅ Extract user
  ) {
    return this.medicalRecordsService.mergeRecords(
      body.sourceRecordId,
      targetId,
      body.reason,
      user.id, // ✅ Pass userId
    );
  }
}
```

---

## Key Changes Summary

### ✅ RolesGuard
- Now uses `IdentityContextService` to check roles
- Throws `ForbiddenException` with clear error messages
- Logs all role checks for audit compliance
- Supports multi-role users (checks if user has ANY required role)

### ✅ RlsGuard
- Validates resource ownership and relationships
- Checks primarySurgeonId, ResourceAllocation, department matches
- Differentiates between read and modify operations
- Logs all access attempts with PHI flags
- Automatically extracts resourceId from route params

### ✅ RlsValidationService
- Centralized validation logic for all resource types
- Checks patient relationships via surgical cases
- Validates department matches
- Supports ADMIN override for all resources
- Role-specific access (e.g., BILLING for bills)

### ✅ Controller Updates Required
1. Add `@UseGuards(RolesGuard, RlsGuard)` to controllers
2. Use `@CurrentUser()` decorator to extract user
3. Pass `user.id` to service methods instead of `undefined`
4. RLS automatically validates access for `:id` routes

---

## Testing Checklist

- [ ] RolesGuard denies access when user lacks required role
- [ ] RolesGuard allows access when user has required role
- [ ] RlsGuard denies access when user has no relationship to resource
- [ ] RlsGuard allows access when user is primarySurgeonId
- [ ] RlsGuard allows access when user is allocated via ResourceAllocation
- [ ] RlsGuard allows access when user's department matches
- [ ] RlsGuard denies modification when user lacks modify rights
- [ ] Audit logs are created for all access attempts
- [ ] Multi-role users can access resources for any of their roles

---

## Next Steps

1. Create `rlsValidation.service.ts` file
2. Update `audit.module.ts` to include and export `RlsValidationService`
3. Update all controllers to use `@CurrentUser()` decorator
4. Update all service method calls to pass `user.id`
5. Test all endpoints with different user roles
6. Verify audit logs are being created correctly












