import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { BillingCodesRepository } from '../repositories/billing-codes.repository';
import { CreateBillingCodeDto } from '../dto/billing-codes/create-billing-code.dto';
import { UpdateBillingCodeDto } from '../dto/billing-codes/update-billing-code.dto';
import { BillingCodeQueryDto } from '../dto/billing-codes/billing-code-query.dto';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { DataAccessLogService } from '../../audit/services/dataAccessLog.service';
import { Domain } from '@prisma/client';

/**
 * Billing Codes Service
 * 
 * Business logic for billing code management.
 * Handles validation, domain events, and audit logging.
 */
@Injectable()
export class BillingCodesService {
  constructor(
    private readonly billingCodesRepository: BillingCodesRepository,
    private readonly domainEventService: DomainEventService,
    private readonly correlationService: CorrelationService,
    private readonly dataAccessLogService: DataAccessLogService,
  ) {}

  /**
   * Create a new billing code
   * SC-005: Create New Billing Code
   */
  async createBillingCode(createBillingCodeDto: CreateBillingCodeDto, adminId: string) {
    // Validate code uniqueness
    const existingCode = await this.billingCodesRepository.findByCode(createBillingCodeDto.code);
    if (existingCode) {
      throw new ConflictException(`Billing code ${createBillingCodeDto.code} already exists`);
    }

    // Create billing code
    const billingCode = await this.billingCodesRepository.create(createBillingCodeDto, adminId);

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'BillingCode.Created',
      domain: Domain.BILLING,
      aggregateId: billingCode.id,
      aggregateType: 'BillingCode',
      payload: {
        code: billingCode.code,
        codeType: billingCode.codeType,
        createdBy: adminId,
      },
      createdBy: adminId,
      sessionId: context.sessionId || undefined,
      correlationId: context.correlationId || undefined,
    });

    // Log admin action
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'BillingCode',
      resourceId: billingCode.id,
      action: 'CREATE',
      sessionId: context.sessionId,
      reason: `Admin created billing code: ${billingCode.code}`,
      accessedPHI: false,
      success: true,
    });

    return billingCode;
  }

  /**
   * Get billing code by ID
   */
  async getBillingCodeById(id: string, adminId: string) {
    const billingCode = await this.billingCodesRepository.findById(id);
    if (!billingCode) {
      throw new NotFoundException(`Billing code with ID ${id} not found`);
    }

    // Log access
    const context = this.correlationService.getContext();
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'BillingCode',
      resourceId: id,
      action: 'READ',
      sessionId: context.sessionId,
      reason: 'Admin viewed billing code details',
      accessedPHI: false,
      success: true,
    });

    return billingCode;
  }

  /**
   * List billing codes with filters and pagination
   */
  async listBillingCodes(query: BillingCodeQueryDto, adminId: string) {
    const result = await this.billingCodesRepository.findMany({
      search: query.search,
      active: query.active,
      codeType: query.codeType,
      category: query.category,
      skip: query.skip,
      take: query.take,
    });

    // Log access
    const context = this.correlationService.getContext();
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'BillingCode',
      resourceId: 'list',
      action: 'READ',
      sessionId: context.sessionId,
      reason: 'Admin listed billing codes',
      accessedPHI: false,
      success: true,
    });

    return result;
  }

  /**
   * Update billing code
   * SC-005: Update Billing Code Information
   */
  async updateBillingCode(id: string, updateBillingCodeDto: UpdateBillingCodeDto, adminId: string) {
    const billingCode = await this.billingCodesRepository.findById(id);
    if (!billingCode) {
      throw new NotFoundException(`Billing code with ID ${id} not found`);
    }

    // Update billing code
    const updatedBillingCode = await this.billingCodesRepository.update(id, updateBillingCodeDto, adminId);

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'BillingCode.Updated',
      domain: Domain.BILLING,
      aggregateId: id,
      aggregateType: 'BillingCode',
      payload: {
        changes: updateBillingCodeDto,
        updatedBy: adminId,
      },
      createdBy: adminId,
      sessionId: context.sessionId || undefined,
      correlationId: context.correlationId || undefined,
    });

    // Log admin action
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'BillingCode',
      resourceId: id,
      action: 'UPDATE',
      sessionId: context.sessionId,
      reason: `Admin updated billing code: ${billingCode.code}`,
      accessedPHI: false,
      success: true,
    });

    return updatedBillingCode;
  }

  /**
   * Deactivate billing code
   * SC-005: Deactivate Billing Code
   */
  async deactivateBillingCode(id: string, adminId: string) {
    const billingCode = await this.billingCodesRepository.findById(id);
    if (!billingCode) {
      throw new NotFoundException(`Billing code with ID ${id} not found`);
    }

    if (!billingCode.active) {
      throw new BadRequestException(`Billing code ${id} is already inactive`);
    }

    // Warn if billing code has bill line items
    const billingCodeWithCounts = await this.billingCodesRepository.findById(id);
    if (billingCodeWithCounts && billingCodeWithCounts._count.billLineItems > 0) {
      // Still allow deactivation, but log warning
    }

    // Deactivate billing code
    await this.billingCodesRepository.deactivate(id, adminId);

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'BillingCode.Deactivated',
      domain: Domain.BILLING,
      aggregateId: id,
      aggregateType: 'BillingCode',
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
      resourceType: 'BillingCode',
      resourceId: id,
      action: 'DEACTIVATE',
      sessionId: context.sessionId,
      reason: `Admin deactivated billing code: ${billingCode.code}`,
      accessedPHI: false,
      success: true,
    });
  }
}




