import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InsuranceProvidersRepository } from '../repositories/insurance-providers.repository';
import { CreateInsuranceProviderDto } from '../dto/insurance-providers/create-insurance-provider.dto';
import { UpdateInsuranceProviderDto } from '../dto/insurance-providers/update-insurance-provider.dto';
import { InsuranceProviderQueryDto } from '../dto/insurance-providers/insurance-provider-query.dto';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { DataAccessLogService } from '../../audit/services/dataAccessLog.service';
import { Domain } from '@prisma/client';

/**
 * Insurance Providers Service
 * 
 * Business logic for insurance provider management.
 * Handles validation, domain events, and audit logging.
 */
@Injectable()
export class InsuranceProvidersService {
  constructor(
    private readonly insuranceProvidersRepository: InsuranceProvidersRepository,
    private readonly domainEventService: DomainEventService,
    private readonly correlationService: CorrelationService,
    private readonly dataAccessLogService: DataAccessLogService,
  ) {}

  /**
   * Create a new insurance provider
   * SC-006: Create New Insurance Provider
   */
  async createInsuranceProvider(createInsuranceProviderDto: CreateInsuranceProviderDto, adminId: string) {
    // Validate code uniqueness
    const existingProvider = await this.insuranceProvidersRepository.findByCode(createInsuranceProviderDto.code);
    if (existingProvider) {
      throw new ConflictException(`Insurance provider with code ${createInsuranceProviderDto.code} already exists`);
    }

    // Validate payerId uniqueness (if provided)
    if (createInsuranceProviderDto.payerId) {
      const existingPayer = await this.insuranceProvidersRepository.findByPayerId(createInsuranceProviderDto.payerId);
      if (existingPayer) {
        throw new ConflictException(`Insurance provider with payer ID ${createInsuranceProviderDto.payerId} already exists`);
      }
    }

    // Normalize code to uppercase
    const normalizedCode = createInsuranceProviderDto.code.toUpperCase();

    // Create insurance provider
    const provider = await this.insuranceProvidersRepository.create(
      {
        ...createInsuranceProviderDto,
        code: normalizedCode,
      },
      adminId,
    );

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'InsuranceProvider.Created',
      domain: Domain.BILLING,
      aggregateId: provider.id,
      aggregateType: 'InsuranceProvider',
      payload: {
        code: provider.code,
        name: provider.name,
        payerId: provider.payerId,
        createdBy: adminId,
      },
      createdBy: adminId,
      sessionId: context.sessionId || undefined,
      correlationId: context.correlationId || undefined,
    });

    // Log admin action
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'InsuranceProvider',
      resourceId: provider.id,
      action: 'CREATE',
      sessionId: context.sessionId,
      reason: `Admin created insurance provider: ${provider.code}`,
      accessedPHI: false,
      success: true,
    });

    return provider;
  }

  /**
   * Get insurance provider by ID
   */
  async getInsuranceProviderById(id: string, adminId: string) {
    const provider = await this.insuranceProvidersRepository.findById(id);
    if (!provider) {
      throw new NotFoundException(`Insurance provider with ID ${id} not found`);
    }

    // Log access
    const context = this.correlationService.getContext();
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'InsuranceProvider',
      resourceId: id,
      action: 'READ',
      sessionId: context.sessionId,
      reason: 'Admin viewed insurance provider details',
      accessedPHI: false,
      success: true,
    });

    return provider;
  }

  /**
   * List insurance providers with filters and pagination
   */
  async listInsuranceProviders(query: InsuranceProviderQueryDto, adminId: string) {
    const result = await this.insuranceProvidersRepository.findMany({
      search: query.search,
      active: query.active,
      skip: query.skip,
      take: query.take,
    });

    // Log access
    const context = this.correlationService.getContext();
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'InsuranceProvider',
      resourceId: 'list',
      action: 'READ',
      sessionId: context.sessionId,
      reason: 'Admin listed insurance providers',
      accessedPHI: false,
      success: true,
    });

    return result;
  }

  /**
   * Update insurance provider
   * SC-006: Update Insurance Provider Information
   */
  async updateInsuranceProvider(id: string, updateInsuranceProviderDto: UpdateInsuranceProviderDto, adminId: string) {
    const provider = await this.insuranceProvidersRepository.findById(id);
    if (!provider) {
      throw new NotFoundException(`Insurance provider with ID ${id} not found`);
    }

    // Update insurance provider
    const updatedProvider = await this.insuranceProvidersRepository.update(id, updateInsuranceProviderDto, adminId);

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'InsuranceProvider.Updated',
      domain: Domain.BILLING,
      aggregateId: id,
      aggregateType: 'InsuranceProvider',
      payload: {
        changes: updateInsuranceProviderDto,
        updatedBy: adminId,
      },
      createdBy: adminId,
      sessionId: context.sessionId || undefined,
      correlationId: context.correlationId || undefined,
    });

    // Log admin action
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'InsuranceProvider',
      resourceId: id,
      action: 'UPDATE',
      sessionId: context.sessionId,
      reason: `Admin updated insurance provider: ${provider.code}`,
      accessedPHI: false,
      success: true,
    });

    return updatedProvider;
  }

  /**
   * Deactivate insurance provider
   * SC-006: Deactivate Insurance Provider
   */
  async deactivateInsuranceProvider(id: string, adminId: string) {
    const provider = await this.insuranceProvidersRepository.findById(id);
    if (!provider) {
      throw new NotFoundException(`Insurance provider with ID ${id} not found`);
    }

    if (!provider.active) {
      throw new BadRequestException(`Insurance provider ${id} is already inactive`);
    }

    // Warn if provider has policies or fee schedules
    const providerWithCounts = await this.insuranceProvidersRepository.findById(id);
    if (providerWithCounts && (providerWithCounts._count.policies > 0 || providerWithCounts._count.feeSchedules > 0)) {
      // Still allow deactivation, but log warning
    }

    // Deactivate insurance provider
    await this.insuranceProvidersRepository.deactivate(id, adminId);

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'InsuranceProvider.Deactivated',
      domain: Domain.BILLING,
      aggregateId: id,
      aggregateType: 'InsuranceProvider',
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
      resourceType: 'InsuranceProvider',
      resourceId: id,
      action: 'DEACTIVATE',
      sessionId: context.sessionId,
      reason: `Admin deactivated insurance provider: ${provider.code}`,
      accessedPHI: false,
      success: true,
    });
  }
}




