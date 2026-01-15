import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { FeeSchedulesRepository } from '../repositories/fee-schedules.repository';
import { CreateFeeScheduleDto } from '../dto/fee-schedules/create-fee-schedule.dto';
import { UpdateFeeScheduleDto } from '../dto/fee-schedules/update-fee-schedule.dto';
import { FeeScheduleQueryDto } from '../dto/fee-schedules/fee-schedule-query.dto';
import { CreateFeeScheduleItemDto } from '../dto/fee-schedules/create-fee-schedule-item.dto';
import { UpdateFeeScheduleItemDto } from '../dto/fee-schedules/update-fee-schedule-item.dto';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { DataAccessLogService } from '../../audit/services/dataAccessLog.service';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { Domain } from '@prisma/client';

/**
 * Fee Schedules Service
 * 
 * Business logic for fee schedule management.
 * Handles validation, domain events, and audit logging.
 */
@Injectable()
export class FeeSchedulesService {
  private prisma: PrismaClient;

  constructor(
    private readonly feeSchedulesRepository: FeeSchedulesRepository,
    private readonly domainEventService: DomainEventService,
    private readonly correlationService: CorrelationService,
    private readonly dataAccessLogService: DataAccessLogService,
  ) {
    this.prisma = getPrismaClient();
  }

  /**
   * Create a new fee schedule
   * SC-007: Create New Fee Schedule
   */
  async createFeeSchedule(createFeeScheduleDto: CreateFeeScheduleDto, adminId: string) {
    // Validate insurance provider exists (if provided)
    if (createFeeScheduleDto.insuranceProviderId) {
      const provider = await this.prisma.insuranceProvider.findUnique({
        where: { id: createFeeScheduleDto.insuranceProviderId },
      });
      if (!provider) {
        throw new NotFoundException(`Insurance provider with ID ${createFeeScheduleDto.insuranceProviderId} not found`);
      }
    }

    // Validate effective dates
    const effectiveDate = new Date(createFeeScheduleDto.effectiveDate);
    if (createFeeScheduleDto.expirationDate) {
      const expirationDate = new Date(createFeeScheduleDto.expirationDate);
      if (expirationDate <= effectiveDate) {
        throw new BadRequestException('Expiration date must be after effective date');
      }
    }

    // Create fee schedule
    const feeSchedule = await this.feeSchedulesRepository.create(createFeeScheduleDto, adminId);

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'FeeSchedule.Created',
      domain: Domain.BILLING,
      aggregateId: feeSchedule.id,
      aggregateType: 'FeeSchedule',
      payload: {
        name: feeSchedule.name,
        scheduleType: feeSchedule.scheduleType,
        createdBy: adminId,
      },
      createdBy: adminId,
      sessionId: context.sessionId || undefined,
      correlationId: context.correlationId || undefined,
    });

    // Log admin action
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'FeeSchedule',
      resourceId: feeSchedule.id,
      action: 'CREATE',
      sessionId: context.sessionId,
      reason: `Admin created fee schedule: ${feeSchedule.name}`,
      accessedPHI: false,
      success: true,
    });

    return feeSchedule;
  }

  /**
   * Get fee schedule by ID
   */
  async getFeeScheduleById(id: string, adminId: string) {
    const feeSchedule = await this.feeSchedulesRepository.findById(id);
    if (!feeSchedule) {
      throw new NotFoundException(`Fee schedule with ID ${id} not found`);
    }

    // Log access
    const context = this.correlationService.getContext();
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'FeeSchedule',
      resourceId: id,
      action: 'READ',
      sessionId: context.sessionId,
      reason: 'Admin viewed fee schedule details',
      accessedPHI: false,
      success: true,
    });

    return feeSchedule;
  }

  /**
   * List fee schedules with filters and pagination
   */
  async listFeeSchedules(query: FeeScheduleQueryDto, adminId: string) {
    const result = await this.feeSchedulesRepository.findMany({
      search: query.search,
      active: query.active,
      scheduleType: query.scheduleType,
      insuranceProviderId: query.insuranceProviderId,
      skip: query.skip,
      take: query.take,
    });

    // Log access
    const context = this.correlationService.getContext();
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'FeeSchedule',
      resourceId: 'list',
      action: 'READ',
      sessionId: context.sessionId,
      reason: 'Admin listed fee schedules',
      accessedPHI: false,
      success: true,
    });

    return result;
  }

  /**
   * Update fee schedule
   * SC-007: Update Fee Schedule Information
   */
  async updateFeeSchedule(id: string, updateFeeScheduleDto: UpdateFeeScheduleDto, adminId: string) {
    const feeSchedule = await this.feeSchedulesRepository.findById(id);
    if (!feeSchedule) {
      throw new NotFoundException(`Fee schedule with ID ${id} not found`);
    }

    // Update fee schedule
    const updatedFeeSchedule = await this.feeSchedulesRepository.update(id, updateFeeScheduleDto, adminId);

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'FeeSchedule.Updated',
      domain: Domain.BILLING,
      aggregateId: id,
      aggregateType: 'FeeSchedule',
      payload: {
        changes: updateFeeScheduleDto,
        updatedBy: adminId,
      },
      createdBy: adminId,
      sessionId: context.sessionId || undefined,
      correlationId: context.correlationId || undefined,
    });

    // Log admin action
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'FeeSchedule',
      resourceId: id,
      action: 'UPDATE',
      sessionId: context.sessionId,
      reason: `Admin updated fee schedule: ${feeSchedule.name}`,
      accessedPHI: false,
      success: true,
    });

    return updatedFeeSchedule;
  }

  /**
   * Deactivate fee schedule
   * SC-007: Deactivate Fee Schedule
   */
  async deactivateFeeSchedule(id: string, adminId: string) {
    const feeSchedule = await this.feeSchedulesRepository.findById(id);
    if (!feeSchedule) {
      throw new NotFoundException(`Fee schedule with ID ${id} not found`);
    }

    if (!feeSchedule.active) {
      throw new BadRequestException(`Fee schedule ${id} is already inactive`);
    }

    // Deactivate fee schedule
    await this.feeSchedulesRepository.deactivate(id, adminId);

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'FeeSchedule.Deactivated',
      domain: Domain.BILLING,
      aggregateId: id,
      aggregateType: 'FeeSchedule',
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
      resourceType: 'FeeSchedule',
      resourceId: id,
      action: 'DEACTIVATE',
      sessionId: context.sessionId,
      reason: `Admin deactivated fee schedule: ${feeSchedule.name}`,
      accessedPHI: false,
      success: true,
    });
  }

  /**
   * Add item to fee schedule
   * SC-007: Add Fee Schedule Item
   */
  async addFeeScheduleItem(scheduleId: string, createItemDto: CreateFeeScheduleItemDto, adminId: string) {
    // Validate fee schedule exists
    const feeSchedule = await this.feeSchedulesRepository.findById(scheduleId);
    if (!feeSchedule) {
      throw new NotFoundException(`Fee schedule with ID ${scheduleId} not found`);
    }

    // Validate billing code exists
    const billingCode = await this.prisma.billingCode.findUnique({
      where: { id: createItemDto.billingCodeId },
    });
    if (!billingCode) {
      throw new NotFoundException(`Billing code with ID ${createItemDto.billingCodeId} not found`);
    }

    // Add item
    const item = await this.feeSchedulesRepository.addItem(scheduleId, createItemDto);

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'FeeScheduleItem.Created',
      domain: Domain.BILLING,
      aggregateId: item.id,
      aggregateType: 'FeeScheduleItem',
      payload: {
        scheduleId,
        billingCodeId: createItemDto.billingCodeId,
        amount: createItemDto.amount,
        createdBy: adminId,
      },
      createdBy: adminId,
      sessionId: context.sessionId || undefined,
      correlationId: context.correlationId || undefined,
    });

    // Log admin action
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'FeeScheduleItem',
      resourceId: item.id,
      action: 'CREATE',
      sessionId: context.sessionId,
      reason: `Admin added item to fee schedule: ${feeSchedule.name}`,
      accessedPHI: false,
      success: true,
    });

    return item;
  }

  /**
   * Update fee schedule item
   * SC-007: Update Fee Schedule Item
   */
  async updateFeeScheduleItem(itemId: string, updateItemDto: UpdateFeeScheduleItemDto, adminId: string) {
    const item = await this.feeSchedulesRepository.findItemById(itemId);
    if (!item) {
      throw new NotFoundException(`Fee schedule item with ID ${itemId} not found`);
    }

    // Update item
    const updatedItem = await this.feeSchedulesRepository.updateItem(itemId, updateItemDto);

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'FeeScheduleItem.Updated',
      domain: Domain.BILLING,
      aggregateId: itemId,
      aggregateType: 'FeeScheduleItem',
      payload: {
        changes: updateItemDto,
        updatedBy: adminId,
      },
      createdBy: adminId,
      sessionId: context.sessionId || undefined,
      correlationId: context.correlationId || undefined,
    });

    // Log admin action
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'FeeScheduleItem',
      resourceId: itemId,
      action: 'UPDATE',
      sessionId: context.sessionId,
      reason: `Admin updated fee schedule item`,
      accessedPHI: false,
      success: true,
    });

    return updatedItem;
  }

  /**
   * Remove fee schedule item
   * SC-007: Remove Fee Schedule Item
   */
  async removeFeeScheduleItem(itemId: string, adminId: string) {
    const item = await this.feeSchedulesRepository.findItemById(itemId);
    if (!item) {
      throw new NotFoundException(`Fee schedule item with ID ${itemId} not found`);
    }

    // Remove item
    await this.feeSchedulesRepository.removeItem(itemId);

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'FeeScheduleItem.Removed',
      domain: Domain.BILLING,
      aggregateId: itemId,
      aggregateType: 'FeeScheduleItem',
      payload: {
        scheduleId: item.scheduleId,
        removedBy: adminId,
      },
      createdBy: adminId,
      sessionId: context.sessionId || undefined,
      correlationId: context.correlationId || undefined,
    });

    // Log admin action
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'FeeScheduleItem',
      resourceId: itemId,
      action: 'DELETE',
      sessionId: context.sessionId,
      reason: `Admin removed fee schedule item`,
      accessedPHI: false,
      success: true,
    });
  }
}




