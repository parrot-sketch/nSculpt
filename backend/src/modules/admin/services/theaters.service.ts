import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { TheatersRepository } from '../repositories/theaters.repository';
import { CreateTheaterDto } from '../dto/theaters/create-theater.dto';
import { UpdateTheaterDto } from '../dto/theaters/update-theater.dto';
import { TheaterQueryDto } from '../dto/theaters/theater-query.dto';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { DataAccessLogService } from '../../audit/services/dataAccessLog.service';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { Domain } from '@prisma/client';

/**
 * Theaters Service
 * 
 * Business logic for operating theater management.
 * Handles validation, domain events, and audit logging.
 */
@Injectable()
export class TheatersService {
  private prisma: PrismaClient;

  constructor(
    private readonly theatersRepository: TheatersRepository,
    private readonly domainEventService: DomainEventService,
    private readonly correlationService: CorrelationService,
    private readonly dataAccessLogService: DataAccessLogService,
  ) {
    this.prisma = getPrismaClient();
  }

  /**
   * Create a new operating theater
   * SC-002: Create New Operating Theater
   */
  async createTheater(createTheaterDto: CreateTheaterDto, adminId: string) {
    // Validate code uniqueness
    const existingTheater = await this.theatersRepository.findByCode(createTheaterDto.code);
    if (existingTheater) {
      throw new ConflictException(`Theater with code ${createTheaterDto.code} already exists`);
    }

    // Validate department exists
    const department = await this.prisma.department.findUnique({
      where: { id: createTheaterDto.departmentId },
    });
    if (!department) {
      throw new NotFoundException(`Department with ID ${createTheaterDto.departmentId} not found`);
    }

    // Normalize code to uppercase
    const normalizedCode = createTheaterDto.code.toUpperCase();

    // Create theater
    const theater = await this.theatersRepository.create(
      {
        ...createTheaterDto,
        code: normalizedCode,
      },
      adminId,
    );

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'OperatingTheater.Created',
      domain: Domain.THEATER,
      aggregateId: theater.id,
      aggregateType: 'OperatingTheater',
      payload: {
        code: theater.code,
        name: theater.name,
        departmentId: theater.departmentId,
        createdBy: adminId,
      },
      createdBy: adminId,
      sessionId: context.sessionId || undefined,
      correlationId: context.correlationId || undefined,
    });

    // Log admin action
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'OperatingTheater',
      resourceId: theater.id,
      action: 'CREATE',
      sessionId: context.sessionId,
      reason: `Admin created theater: ${theater.code}`,
      accessedPHI: false,
      success: true,
    });

    return theater;
  }

  /**
   * Get theater by ID
   */
  async getTheaterById(id: string, adminId: string) {
    const theater = await this.theatersRepository.findById(id);
    if (!theater) {
      throw new NotFoundException(`Theater with ID ${id} not found`);
    }

    // Log access
    const context = this.correlationService.getContext();
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'OperatingTheater',
      resourceId: id,
      action: 'READ',
      sessionId: context.sessionId,
      reason: 'Admin viewed theater details',
      accessedPHI: false,
      success: true,
    });

    return theater;
  }

  /**
   * List theaters with filters and pagination
   */
  async listTheaters(query: TheaterQueryDto, adminId: string) {
    const result = await this.theatersRepository.findMany({
      search: query.search,
      active: query.active,
      departmentId: query.departmentId,
      skip: query.skip,
      take: query.take,
    });

    // Log access
    const context = this.correlationService.getContext();
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'OperatingTheater',
      resourceId: 'list',
      action: 'READ',
      sessionId: context.sessionId,
      reason: 'Admin listed theaters',
      accessedPHI: false,
      success: true,
    });

    return result;
  }

  /**
   * Update theater
   * SC-002: Update Operating Theater Information
   */
  async updateTheater(id: string, updateTheaterDto: UpdateTheaterDto, adminId: string) {
    const theater = await this.theatersRepository.findById(id);
    if (!theater) {
      throw new NotFoundException(`Theater with ID ${id} not found`);
    }

    // Update theater
    const updatedTheater = await this.theatersRepository.update(id, updateTheaterDto, adminId);

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'OperatingTheater.Updated',
      domain: Domain.THEATER,
      aggregateId: id,
      aggregateType: 'OperatingTheater',
      payload: {
        changes: updateTheaterDto,
        updatedBy: adminId,
      },
      createdBy: adminId,
      sessionId: context.sessionId || undefined,
      correlationId: context.correlationId || undefined,
    });

    // Log admin action
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'OperatingTheater',
      resourceId: id,
      action: 'UPDATE',
      sessionId: context.sessionId,
      reason: `Admin updated theater: ${theater.code}`,
      accessedPHI: false,
      success: true,
    });

    return updatedTheater;
  }

  /**
   * Deactivate theater
   * SC-002: Deactivate Operating Theater
   */
  async deactivateTheater(id: string, adminId: string) {
    const theater = await this.theatersRepository.findById(id);
    if (!theater) {
      throw new NotFoundException(`Theater with ID ${id} not found`);
    }

    if (!theater.active) {
      throw new BadRequestException(`Theater ${id} is already inactive`);
    }

    // Warn if theater has reservations
    const theaterWithCounts = await this.theatersRepository.findById(id);
    if (theaterWithCounts && theaterWithCounts._count.reservations > 0) {
      // Still allow deactivation, but log warning
      // In real system, might want to require confirmation or prevent deactivation
    }

    // Deactivate theater
    await this.theatersRepository.deactivate(id, adminId);

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'OperatingTheater.Deactivated',
      domain: Domain.THEATER,
      aggregateId: id,
      aggregateType: 'OperatingTheater',
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
      resourceType: 'OperatingTheater',
      resourceId: id,
      action: 'DEACTIVATE',
      sessionId: context.sessionId,
      reason: `Admin deactivated theater: ${theater.code}`,
      accessedPHI: false,
      success: true,
    });
  }
}




