import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DepartmentsRepository } from '../repositories/departments.repository';
import { CreateDepartmentDto } from '../dto/departments/create-department.dto';
import { UpdateDepartmentDto } from '../dto/departments/update-department.dto';
import { DepartmentQueryDto } from '../dto/departments/department-query.dto';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { DataAccessLogService } from '../../audit/services/dataAccessLog.service';
import { Domain } from '@prisma/client';

/**
 * Departments Service
 * 
 * Business logic for department management.
 * Handles validation, domain events, and audit logging.
 */
@Injectable()
export class DepartmentsService {
  constructor(
    private readonly departmentsRepository: DepartmentsRepository,
    private readonly domainEventService: DomainEventService,
    private readonly correlationService: CorrelationService,
    private readonly dataAccessLogService: DataAccessLogService,
  ) {}

  /**
   * Create a new department
   * SC-001: Create New Department
   */
  async createDepartment(createDepartmentDto: CreateDepartmentDto, adminId: string) {
    // Validate code uniqueness
    const existingDepartment = await this.departmentsRepository.findByCode(createDepartmentDto.code);
    if (existingDepartment) {
      throw new ConflictException(`Department with code ${createDepartmentDto.code} already exists`);
    }

    // Normalize code to uppercase
    const normalizedCode = createDepartmentDto.code.toUpperCase();

    // Create department
    const department = await this.departmentsRepository.create(
      {
        ...createDepartmentDto,
        code: normalizedCode,
      },
      adminId,
    );

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'Department.Created',
      domain: Domain.THEATER,
      aggregateId: department.id,
      aggregateType: 'Department',
      payload: {
        code: department.code,
        name: department.name,
        createdBy: adminId,
      },
      createdBy: adminId,
      sessionId: context.sessionId || undefined,
      correlationId: context.correlationId || undefined,
    });

    // Log admin action
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'Department',
      resourceId: department.id,
      action: 'CREATE',
      sessionId: context.sessionId,
      reason: `Admin created department: ${department.code}`,
      accessedPHI: false,
      success: true,
    });

    return department;
  }

  /**
   * Get department by ID
   */
  async getDepartmentById(id: string, adminId: string) {
    const department = await this.departmentsRepository.findById(id);
    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    // Log access
    const context = this.correlationService.getContext();
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'Department',
      resourceId: id,
      action: 'READ',
      sessionId: context.sessionId,
      reason: 'Admin viewed department details',
      accessedPHI: false,
      success: true,
    });

    return department;
  }

  /**
   * List departments with filters and pagination
   */
  async listDepartments(query: DepartmentQueryDto, adminId: string) {
    const result = await this.departmentsRepository.findMany({
      search: query.search,
      active: query.active,
      skip: query.skip,
      take: query.take,
    });

    // Log access
    const context = this.correlationService.getContext();
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'Department',
      resourceId: 'list',
      action: 'READ',
      sessionId: context.sessionId,
      reason: 'Admin listed departments',
      accessedPHI: false,
      success: true,
    });

    return result;
  }

  /**
   * Update department
   * SC-001: Update Department Information
   */
  async updateDepartment(id: string, updateDepartmentDto: UpdateDepartmentDto, adminId: string) {
    const department = await this.departmentsRepository.findById(id);
    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    // Update department
    const updatedDepartment = await this.departmentsRepository.update(id, updateDepartmentDto, adminId);

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'Department.Updated',
      domain: Domain.THEATER,
      aggregateId: id,
      aggregateType: 'Department',
      payload: {
        changes: updateDepartmentDto,
        updatedBy: adminId,
      },
      createdBy: adminId,
      sessionId: context.sessionId || undefined,
      correlationId: context.correlationId || undefined,
    });

    // Log admin action
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'Department',
      resourceId: id,
      action: 'UPDATE',
      sessionId: context.sessionId,
      reason: `Admin updated department: ${department.code}`,
      accessedPHI: false,
      success: true,
    });

    return updatedDepartment;
  }

  /**
   * Deactivate department
   * SC-001: Deactivate Department
   */
  async deactivateDepartment(id: string, adminId: string) {
    const department = await this.departmentsRepository.findById(id);
    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    if (!department.active) {
      throw new BadRequestException(`Department ${id} is already inactive`);
    }

    // Warn if department has users or theaters
    const departmentWithCounts = await this.departmentsRepository.findById(id);
    if (departmentWithCounts && (departmentWithCounts._count.users > 0 || departmentWithCounts._count.theaters > 0)) {
      // Still allow deactivation, but log warning
      // In real system, might want to require confirmation or prevent deactivation
    }

    // Deactivate department
    await this.departmentsRepository.deactivate(id, adminId);

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'Department.Deactivated',
      domain: Domain.THEATER,
      aggregateId: id,
      aggregateType: 'Department',
      payload: {
        deactivatedBy: adminId,
      },
      createdBy: adminId,
      sessionId: context.sessionId || undefined,
      correlationId: context.correlationId || undefined,
    });

    // Log admin action
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'Department',
      resourceId: id,
      action: 'DEACTIVATE',
      sessionId: context.sessionId,
      reason: `Admin deactivated department: ${department.code}`,
      accessedPHI: false,
      success: true,
    });
  }
}




