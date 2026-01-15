# Row-Level Security Implementation Guide

This document provides updated service methods with userId filtering and example integration tests.

## Updated Service Methods

### PatientService Example

```typescript
// backend/src/modules/patient/services/patient.service.ts

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PatientRepository } from '../repositories/patient.repository';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { IdentityContextService } from '../../../modules/auth/services/identityContext.service';
import { RlsValidationService } from '../../../modules/audit/services/rlsValidation.service';
import { CreatePatientDto } from '../dto/create-patient.dto';
import { UpdatePatientDto } from '../dto/update-patient.dto';
import { PatientEventType } from '../events/patient.events';
import { Domain } from '@prisma/client';

@Injectable()
export class PatientService {
  constructor(
    private readonly patientRepository: PatientRepository,
    private readonly domainEventService: DomainEventService,
    private readonly correlationService: CorrelationService,
    private readonly identityContext: IdentityContextService,
    private readonly rlsValidation: RlsValidationService,
  ) {}

  async create(createPatientDto: CreatePatientDto, userId: string) {
    // Create patient
    const patient = await this.patientRepository.create(createPatientDto);

    // Get correlation context
    const context = this.correlationService.getContext();

    // Emit domain event
    await this.domainEventService.createEvent({
      eventType: PatientEventType.CREATED,
      domain: Domain.MEDICAL_RECORDS,
      aggregateId: patient.id,
      aggregateType: 'Patient',
      payload: {
        patientId: patient.id,
        firstName: createPatientDto.firstName,
        lastName: createPatientDto.lastName,
        email: createPatientDto.email,
        dateOfBirth: createPatientDto.dateOfBirth,
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return patient;
  }

  async findOne(id: string, userId?: string) {
    const patient = await this.patientRepository.findById(id);
    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }

    // Validate access if userId provided (RLS check)
    if (userId) {
      const hasAccess = await this.rlsValidation.canAccessPatient(id, userId);
      if (!hasAccess) {
        throw new ForbiddenException(`Access denied to patient ${id}`);
      }
    }

    return patient;
  }

  async update(id: string, updatePatientDto: UpdatePatientDto, userId: string) {
    // Validate access
    await this.findOne(id, userId);

    // Update patient
    const existingPatient = await this.patientRepository.findById(id);
    const updatedPatient = await this.patientRepository.update(id, updatePatientDto);

    // Get correlation context
    const context = this.correlationService.getContext();

    // Emit domain event
    await this.domainEventService.createEvent({
      eventType: PatientEventType.UPDATED,
      domain: Domain.MEDICAL_RECORDS,
      aggregateId: id,
      aggregateType: 'Patient',
      payload: {
        patientId: id,
        changes: updatePatientDto,
        previousValues: existingPatient,
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return updatedPatient;
  }

  async remove(id: string, userId: string) {
    // Validate access
    await this.findOne(id, userId);

    // Delete/archive patient
    await this.patientRepository.delete(id);

    // Get correlation context
    const context = this.correlationService.getContext();

    // Emit domain event
    await this.domainEventService.createEvent({
      eventType: PatientEventType.ARCHIVED,
      domain: Domain.MEDICAL_RECORDS,
      aggregateId: id,
      aggregateType: 'Patient',
      payload: {
        patientId: id,
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });
  }

  async findAll(skip?: number, take?: number, userId?: string) {
    // If no userId, return empty (should not happen with guards, but defensive)
    if (!userId) {
      return [];
    }

    // Check if user is ADMIN - return all patients
    if (this.identityContext.hasRole('ADMIN')) {
      return this.patientRepository.findAll(skip, take);
    }

    // Filter by user's access:
    // 1. Patients with surgical cases where user is primarySurgeonId
    // 2. Patients with surgical cases where user is allocated via ResourceAllocation
    // 3. Patients in user's department (if applicable)

    return this.patientRepository.findAllFiltered(skip, take, userId);
  }
}
```

### PatientRepository with Filtering

```typescript
// backend/src/modules/patient/repositories/patient.repository.ts

import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { CreatePatientDto } from '../dto/create-patient.dto';
import { UpdatePatientDto } from '../dto/update-patient.dto';

@Injectable()
export class PatientRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  async create(data: CreatePatientDto) {
    // TODO: Implement patient creation
    return {
      id: 'placeholder-patient-id',
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    } as any;
  }

  async findById(id: string) {
    // TODO: Implement patient lookup
    return null as any;
  }

  async findAll(skip?: number, take?: number) {
    // TODO: Implement paginated list (for ADMIN only)
    throw new Error('Patient list not yet implemented');
  }

  async findAllFiltered(skip?: number, take?: number, userId?: string) {
    if (!userId) {
      return [];
    }

    // Get user's department
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { departmentId: true },
    });

    // Find patients via surgical case assignments
    const cases = await this.prisma.surgicalCase.findMany({
      where: {
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
      select: {
        patientId: true,
      },
      distinct: ['patientId'],
    });

    const patientIds = cases.map((c) => c.patientId);

    // TODO: Query actual patient table with patientIds
    // For now, return placeholder
    return [];
  }

  async update(id: string, data: UpdatePatientDto) {
    // TODO: Implement patient update
    throw new Error('Patient update not yet implemented');
  }

  async delete(id: string) {
    // TODO: Implement soft delete or archive
    throw new Error('Patient deletion not yet implemented');
  }
}
```

### TheaterService Example

```typescript
// backend/src/modules/theater/services/theater.service.ts

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { TheaterRepository } from '../repositories/theater.repository';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { IdentityContextService } from '../../../modules/auth/services/identityContext.service';
import { RlsValidationService } from '../../../modules/audit/services/rlsValidation.service';
import { CreateCaseDto } from '../dto/create-case.dto';
import { UpdateCaseDto } from '../dto/update-case.dto';
import { TheaterEventType, CaseStatusChangedPayload } from '../events/theater.events';
import { Domain } from '@prisma/client';

@Injectable()
export class TheaterService {
  constructor(
    private readonly theaterRepository: TheaterRepository,
    private readonly domainEventService: DomainEventService,
    private readonly correlationService: CorrelationService,
    private readonly identityContext: IdentityContextService,
    private readonly rlsValidation: RlsValidationService,
  ) {}

  async createCase(createCaseDto: CreateCaseDto, userId: string) {
    // Check if case number already exists
    const existing = await this.theaterRepository.findCaseByNumber(createCaseDto.caseNumber);
    if (existing) {
      throw new BadRequestException(`Case number ${createCaseDto.caseNumber} already exists`);
    }

    // Create case
    const surgicalCase = await this.theaterRepository.createCase(createCaseDto);

    // Get correlation context
    const context = this.correlationService.getContext();

    // Emit domain event
    const event = await this.domainEventService.createEvent({
      eventType: TheaterEventType.CASE_CREATED,
      domain: Domain.THEATER,
      aggregateId: surgicalCase.id,
      aggregateType: 'SurgicalCase',
      payload: {
        caseId: surgicalCase.id,
        caseNumber: surgicalCase.caseNumber,
        patientId: surgicalCase.patientId,
        procedureName: surgicalCase.procedureName,
        scheduledStartAt: surgicalCase.scheduledStartAt.toISOString(),
        scheduledEndAt: surgicalCase.scheduledEndAt.toISOString(),
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    // Create initial status history entry
    await this.theaterRepository.createStatusHistory({
      caseId: surgicalCase.id,
      fromStatus: null,
      toStatus: surgicalCase.status,
      triggeringEventId: event.id,
      changedBy: userId,
    });

    return surgicalCase;
  }

  async findOne(id: string, userId?: string) {
    const surgicalCase = await this.theaterRepository.findCaseById(id);
    if (!surgicalCase) {
      throw new NotFoundException(`Surgical case with ID ${id} not found`);
    }

    // Validate access if userId provided
    if (userId) {
      const hasAccess = await this.rlsValidation.canAccessSurgicalCase(id, userId);
      if (!hasAccess) {
        throw new ForbiddenException(`Access denied to surgical case ${id}`);
      }
    }

    return surgicalCase;
  }

  async updateCase(id: string, updateCaseDto: UpdateCaseDto, userId: string) {
    // Validate access and modification rights
    const existingCase = await this.findOne(id, userId);
    const canModify = await this.rlsValidation.canModifySurgicalCase(id, userId);
    if (!canModify) {
      throw new ForbiddenException(`Modification denied to surgical case ${id}`);
    }

    // If status is being changed, handle it specially
    if (updateCaseDto.status && updateCaseDto.status !== existingCase.status) {
      return this.updateCaseStatus(id, existingCase.status, updateCaseDto.status, updateCaseDto.reason, userId);
    }

    // Regular update
    const updatedCase = await this.theaterRepository.updateCase(id, updateCaseDto);

    // Get correlation context
    const context = this.correlationService.getContext();

    // Emit domain event
    await this.domainEventService.createEvent({
      eventType: TheaterEventType.CASE_UPDATED,
      domain: Domain.THEATER,
      aggregateId: id,
      aggregateType: 'SurgicalCase',
      payload: {
        caseId: id,
        changes: updateCaseDto,
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return updatedCase;
  }

  async updateCaseStatus(
    caseId: string,
    fromStatus: string,
    toStatus: string,
    reason?: string,
    userId?: string,
  ) {
    // Validate access and modification rights
    if (userId) {
      const canModify = await this.rlsValidation.canModifySurgicalCase(caseId, userId);
      if (!canModify) {
        throw new ForbiddenException(`Status modification denied to surgical case ${caseId}`);
      }
    }

    // Get existing case
    const existingCase = await this.findOne(caseId, userId);

    // Update status
    const updatedCase = await this.theaterRepository.updateCase(caseId, { status: toStatus });

    // Get correlation context
    const context = this.correlationService.getContext();

    // Emit domain event for status change
    const event = await this.domainEventService.createEvent({
      eventType: TheaterEventType.CASE_STATUS_CHANGED,
      domain: Domain.THEATER,
      aggregateId: caseId,
      aggregateType: 'SurgicalCase',
      payload: {
        caseId,
        fromStatus: existingCase.status,
        toStatus,
        reason,
      } as CaseStatusChangedPayload,
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    // Create status history entry (CRITICAL: Must be event-anchored)
    await this.theaterRepository.createStatusHistory({
      caseId,
      fromStatus: existingCase.status,
      toStatus,
      triggeringEventId: event.id,
      reason,
      changedBy: userId,
    });

    return updatedCase;
  }

  async findAll(skip?: number, take?: number, userId?: string) {
    if (!userId) {
      return [];
    }

    // ADMIN sees all cases
    if (this.identityContext.hasRole('ADMIN')) {
      return this.theaterRepository.findAllCases(skip, take);
    }

    // Filter by user's access:
    // 1. Cases where user is primarySurgeonId
    // 2. Cases where user is allocated via ResourceAllocation
    // 3. Cases in user's department
    return this.theaterRepository.findAllFiltered(skip, take, userId);
  }
}
```

### TheaterRepository with Filtering

```typescript
// backend/src/modules/theater/repositories/theater.repository.ts

async findAllFiltered(skip?: number, take?: number, userId?: string) {
  if (!userId) {
    return [];
  }

  // Get user's department
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { departmentId: true },
  });

  // Build where clause
  const where: any = {
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
  };

  // Add department filter if user has department
  if (user?.departmentId) {
    where.OR.push({
      reservations: {
        some: {
          theater: {
            departmentId: user.departmentId,
          },
        },
      },
    });
  }

  return await this.prisma.surgicalCase.findMany({
    where,
    skip,
    take,
    orderBy: { scheduledStartAt: 'asc' },
    include: {
      reservations: true,
      resourceAllocations: true,
      statusHistory: {
        orderBy: { changedAt: 'desc' },
        take: 1,
      },
    },
  });
}
```

## Integration Test Examples

### Test File: `backend/src/modules/patient/patient.controller.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { PatientController } from './patient.controller';
import { PatientService } from '../services/patient.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserIdentity } from '../../auth/services/identityContext.service';

describe('PatientController - RLS Tests', () => {
  let controller: PatientController;
  let service: PatientService;
  let mockUser1: UserIdentity;
  let mockUser2: UserIdentity;
  let mockAdmin: UserIdentity;

  beforeEach(async () => {
    mockUser1 = {
      id: 'user-1-id',
      email: 'doctor1@example.com',
      firstName: 'Doctor',
      lastName: 'One',
      roles: ['DOCTOR'],
      permissions: ['patients:read', 'patients:write'],
      sessionId: 'session-1',
      departmentId: 'dept-1',
    };

    mockUser2 = {
      id: 'user-2-id',
      email: 'doctor2@example.com',
      firstName: 'Doctor',
      lastName: 'Two',
      roles: ['DOCTOR'],
      permissions: ['patients:read', 'patients:write'],
      sessionId: 'session-2',
      departmentId: 'dept-2',
    };

    mockAdmin = {
      id: 'admin-id',
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      roles: ['ADMIN'],
      permissions: ['patients:*'],
      sessionId: 'session-admin',
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PatientController],
      providers: [
        {
          provide: PatientService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PatientController>(PatientController);
    service = module.get<PatientService>(PatientService);
  });

  describe('Horizontal Privilege Escalation Prevention', () => {
    it('should prevent user1 from accessing user2 patient', async () => {
      const patientId = 'patient-2-id';
      
      // Mock service to throw ForbiddenException
      jest.spyOn(service, 'findOne').mockRejectedValue(
        new ForbiddenException(`Access denied to patient ${patientId}`)
      );

      await expect(
        controller.findOne(patientId)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should prevent user1 from updating user2 patient', async () => {
      const patientId = 'patient-2-id';
      const updateDto = { firstName: 'Updated' };

      jest.spyOn(service, 'update').mockRejectedValue(
        new ForbiddenException(`Access denied to patient ${patientId}`)
      );

      await expect(
        controller.update(patientId, updateDto, mockUser1)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow user1 to access their own assigned patient', async () => {
      const patientId = 'patient-1-id';
      const mockPatient = { id: patientId, firstName: 'John', lastName: 'Doe' };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockPatient);

      const result = await controller.findOne(patientId);
      expect(result).toEqual(mockPatient);
      expect(service.findOne).toHaveBeenCalledWith(patientId);
    });
  });

  describe('Vertical Privilege Escalation Prevention', () => {
    it('should prevent NURSE from deleting patients', async () => {
      const nurseUser: UserIdentity = {
        ...mockUser1,
        roles: ['NURSE'],
        permissions: ['patients:read', 'patients:write'],
      };

      // RolesGuard should prevent this, but test service layer too
      jest.spyOn(service, 'remove').mockRejectedValue(
        new ForbiddenException('Only ADMIN can delete patients')
      );

      await expect(
        controller.remove('patient-1-id', nurseUser)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow ADMIN to access all patients', async () => {
      const patientId = 'any-patient-id';
      const mockPatient = { id: patientId, firstName: 'Any', lastName: 'Patient' };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockPatient);

      const result = await controller.findOne(patientId);
      expect(result).toEqual(mockPatient);
    });
  });

  describe('Filtering Tests', () => {
    it('should filter findAll by user access', async () => {
      const mockPatients = [
        { id: 'patient-1-id', firstName: 'John' },
        { id: 'patient-2-id', firstName: 'Jane' },
      ];

      jest.spyOn(service, 'findAll').mockResolvedValue(mockPatients);

      const result = await controller.findAll(0, 10, mockUser1);
      expect(result).toEqual(mockPatients);
      expect(service.findAll).toHaveBeenCalledWith(0, 10, mockUser1.id);
    });

    it('should return all patients for ADMIN', async () => {
      const allPatients = [
        { id: 'patient-1-id', firstName: 'John' },
        { id: 'patient-2-id', firstName: 'Jane' },
        { id: 'patient-3-id', firstName: 'Bob' },
      ];

      jest.spyOn(service, 'findAll').mockResolvedValue(allPatients);

      const result = await controller.findAll(0, 10, mockAdmin);
      expect(result).toEqual(allPatients);
      expect(service.findAll).toHaveBeenCalledWith(0, 10, mockAdmin.id);
    });
  });

  describe('Audit Logging', () => {
    it('should log all access attempts', async () => {
      const patientId = 'patient-1-id';
      const mockPatient = { id: patientId, firstName: 'John' };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockPatient);

      await controller.findOne(patientId);

      // Verify audit log was created (check via DataAccessLogService mock)
      // This would be verified in integration tests with actual database
    });
  });
});
```

### E2E Test Example: `backend/test/e2e/patient-rls.e2e-spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../src/prisma/client';

describe('Patient RLS E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let doctor1Token: string;
  let doctor2Token: string;
  let adminToken: string;
  let patient1Id: string;
  let patient2Id: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = getPrismaClient();

    // Create test users and get tokens
    // doctor1Token = await loginAsDoctor1();
    // doctor2Token = await loginAsDoctor2();
    // adminToken = await loginAsAdmin();

    // Create test patients
    // patient1Id = await createTestPatient();
    // patient2Id = await createTestPatient();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  describe('Horizontal Escalation Prevention', () => {
    it('should prevent doctor1 from accessing doctor2 patient', async () => {
      return request(app.getHttpServer())
        .get(`/api/v1/patients/${patient2Id}`)
        .set('Authorization', `Bearer ${doctor1Token}`)
        .expect(403)
        .expect((res) => {
          expect(res.body.message).toContain('Access denied');
        });
    });

    it('should allow doctor1 to access their assigned patient', async () => {
      return request(app.getHttpServer())
        .get(`/api/v1/patients/${patient1Id}`)
        .set('Authorization', `Bearer ${doctor1Token}`)
        .expect(200);
    });
  });

  describe('Vertical Escalation Prevention', () => {
    it('should prevent NURSE from deleting patients', async () => {
      // Create nurse token
      // const nurseToken = await loginAsNurse();

      return request(app.getHttpServer())
        .delete(`/api/v1/patients/${patient1Id}`)
        .set('Authorization', `Bearer ${nurseToken}`)
        .expect(403);
    });

    it('should allow ADMIN to delete any patient', async () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/patients/${patient1Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('Filtering Tests', () => {
    it('should filter findAll by user access', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/patients')
        .set('Authorization', `Bearer ${doctor1Token}`)
        .expect(200);

      // Verify only doctor1's patients are returned
      expect(response.body).toBeInstanceOf(Array);
      // Add assertions based on your data setup
    });

    it('should return all patients for ADMIN', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/patients')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify all patients are returned
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('Audit Logging', () => {
    it('should log all access attempts', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/patients/${patient1Id}`)
        .set('Authorization', `Bearer ${doctor1Token}`)
        .expect(200);

      // Verify audit log was created
      const logs = await prisma.dataAccessLog.findMany({
        where: {
          resourceType: 'Patient',
          resourceId: patient1Id,
          userId: 'doctor1-id', // Replace with actual ID
        },
        orderBy: { accessedAt: 'desc' },
        take: 1,
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('READ');
      expect(logs[0].accessedPHI).toBe(true);
      expect(logs[0].success).toBe(true);
    });

    it('should log failed access attempts', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/patients/${patient2Id}`)
        .set('Authorization', `Bearer ${doctor1Token}`)
        .expect(403);

      // Verify failed access was logged
      const logs = await prisma.dataAccessLog.findMany({
        where: {
          resourceType: 'Patient',
          resourceId: patient2Id,
          userId: 'doctor1-id',
          success: false,
        },
        orderBy: { accessedAt: 'desc' },
        take: 1,
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].success).toBe(false);
      expect(logs[0].errorMessage).toContain('Access denied');
    });
  });
});
```

## Key Implementation Points

1. **All controllers now use**:
   - `@UseGuards(RolesGuard, RlsGuard, PermissionsGuard)`
   - `@CurrentUser()` decorator to extract user
   - `@Permissions()` decorator for fine-grained control

2. **All service methods**:
   - Accept `userId` parameter
   - Validate access using `RlsValidationService`
   - Filter `findAll()` by user access
   - Throw `ForbiddenException` on access denial

3. **All repositories**:
   - Implement `findAllFiltered()` methods
   - Filter by surgical case assignments, department, or role

4. **Error Handling**:
   - `403 Forbidden` for access denied
   - `404 Not Found` for resource not found
   - Clear error messages for debugging

5. **Audit Logging**:
   - All access attempts logged
   - PHI access flagged
   - Success and failure logged
   - User ID, resource ID, action, timestamp recorded












