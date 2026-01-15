import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { VendorsRepository } from '../repositories/vendors.repository';
import { CreateVendorDto } from '../dto/vendors/create-vendor.dto';
import { UpdateVendorDto } from '../dto/vendors/update-vendor.dto';
import { VendorQueryDto } from '../dto/vendors/vendor-query.dto';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { DataAccessLogService } from '../../audit/services/dataAccessLog.service';
import { Domain } from '@prisma/client';

/**
 * Vendors Service
 * 
 * Business logic for vendor management.
 * Handles validation, domain events, and audit logging.
 */
@Injectable()
export class VendorsService {
  constructor(
    private readonly vendorsRepository: VendorsRepository,
    private readonly domainEventService: DomainEventService,
    private readonly correlationService: CorrelationService,
    private readonly dataAccessLogService: DataAccessLogService,
  ) {}

  /**
   * Create a new vendor
   * SC-004: Create New Vendor
   */
  async createVendor(createVendorDto: CreateVendorDto, adminId: string) {
    // Validate code uniqueness
    const existingVendor = await this.vendorsRepository.findByCode(createVendorDto.code);
    if (existingVendor) {
      throw new ConflictException(`Vendor with code ${createVendorDto.code} already exists`);
    }

    // Normalize code to uppercase
    const normalizedCode = createVendorDto.code.toUpperCase();

    // Create vendor
    const vendor = await this.vendorsRepository.create(
      {
        ...createVendorDto,
        code: normalizedCode,
      },
      adminId,
    );

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'Vendor.Created',
      domain: Domain.INVENTORY,
      aggregateId: vendor.id,
      aggregateType: 'Vendor',
      payload: {
        code: vendor.code,
        name: vendor.name,
        createdBy: adminId,
      },
      createdBy: adminId,
      sessionId: context.sessionId || undefined,
      correlationId: context.correlationId || undefined,
    });

    // Log admin action
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'Vendor',
      resourceId: vendor.id,
      action: 'CREATE',
      sessionId: context.sessionId,
      reason: `Admin created vendor: ${vendor.code}`,
      accessedPHI: false,
      success: true,
    });

    return vendor;
  }

  /**
   * Get vendor by ID
   */
  async getVendorById(id: string, adminId: string) {
    const vendor = await this.vendorsRepository.findById(id);
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    // Log access
    const context = this.correlationService.getContext();
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'Vendor',
      resourceId: id,
      action: 'READ',
      sessionId: context.sessionId,
      reason: 'Admin viewed vendor details',
      accessedPHI: false,
      success: true,
    });

    return vendor;
  }

  /**
   * List vendors with filters and pagination
   */
  async listVendors(query: VendorQueryDto, adminId: string) {
    const result = await this.vendorsRepository.findMany({
      search: query.search,
      active: query.active,
      skip: query.skip,
      take: query.take,
    });

    // Log access
    const context = this.correlationService.getContext();
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'Vendor',
      resourceId: 'list',
      action: 'READ',
      sessionId: context.sessionId,
      reason: 'Admin listed vendors',
      accessedPHI: false,
      success: true,
    });

    return result;
  }

  /**
   * Update vendor
   * SC-004: Update Vendor Information
   */
  async updateVendor(id: string, updateVendorDto: UpdateVendorDto, adminId: string) {
    const vendor = await this.vendorsRepository.findById(id);
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    // Update vendor
    const updatedVendor = await this.vendorsRepository.update(id, updateVendorDto, adminId);

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'Vendor.Updated',
      domain: Domain.INVENTORY,
      aggregateId: id,
      aggregateType: 'Vendor',
      payload: {
        changes: updateVendorDto,
        updatedBy: adminId,
      },
      createdBy: adminId,
      sessionId: context.sessionId || undefined,
      correlationId: context.correlationId || undefined,
    });

    // Log admin action
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'Vendor',
      resourceId: id,
      action: 'UPDATE',
      sessionId: context.sessionId,
      reason: `Admin updated vendor: ${vendor.code}`,
      accessedPHI: false,
      success: true,
    });

    return updatedVendor;
  }

  /**
   * Deactivate vendor
   * SC-004: Deactivate Vendor
   */
  async deactivateVendor(id: string, adminId: string) {
    const vendor = await this.vendorsRepository.findById(id);
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    if (!vendor.active) {
      throw new BadRequestException(`Vendor ${id} is already inactive`);
    }

    // Warn if vendor has items
    const vendorWithCounts = await this.vendorsRepository.findById(id);
    if (vendorWithCounts && vendorWithCounts._count.items > 0) {
      // Still allow deactivation, but log warning
    }

    // Deactivate vendor
    await this.vendorsRepository.deactivate(id, adminId);

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'Vendor.Deactivated',
      domain: Domain.INVENTORY,
      aggregateId: id,
      aggregateType: 'Vendor',
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
      resourceType: 'Vendor',
      resourceId: id,
      action: 'DEACTIVATE',
      sessionId: context.sessionId,
      reason: `Admin deactivated vendor: ${vendor.code}`,
      accessedPHI: false,
      success: true,
    });
  }
}




