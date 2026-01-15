import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { CategoriesRepository } from '../repositories/categories.repository';
import { CreateCategoryDto } from '../dto/categories/create-category.dto';
import { UpdateCategoryDto } from '../dto/categories/update-category.dto';
import { CategoryQueryDto } from '../dto/categories/category-query.dto';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { DataAccessLogService } from '../../audit/services/dataAccessLog.service';
import { Domain } from '@prisma/client';

/**
 * Categories Service
 * 
 * Business logic for inventory category management.
 * Handles validation, domain events, and audit logging.
 */
@Injectable()
export class CategoriesService {
  constructor(
    private readonly categoriesRepository: CategoriesRepository,
    private readonly domainEventService: DomainEventService,
    private readonly correlationService: CorrelationService,
    private readonly dataAccessLogService: DataAccessLogService,
  ) {}

  /**
   * Create a new inventory category
   * SC-003: Create New Inventory Category
   */
  async createCategory(createCategoryDto: CreateCategoryDto, adminId: string) {
    // Validate code uniqueness
    const existingCategory = await this.categoriesRepository.findByCode(createCategoryDto.code);
    if (existingCategory) {
      throw new ConflictException(`Category with code ${createCategoryDto.code} already exists`);
    }

    // Validate parent category exists (if provided)
    if (createCategoryDto.parentId) {
      const parent = await this.categoriesRepository.findById(createCategoryDto.parentId);
      if (!parent) {
        throw new NotFoundException(`Parent category with ID ${createCategoryDto.parentId} not found`);
      }
      if (!parent.active) {
        throw new BadRequestException(`Parent category is inactive`);
      }
    }

    // Normalize code to uppercase
    const normalizedCode = createCategoryDto.code.toUpperCase();

    // Create category
    const category = await this.categoriesRepository.create(
      {
        ...createCategoryDto,
        code: normalizedCode,
      },
      adminId,
    );

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'InventoryCategory.Created',
      domain: Domain.INVENTORY,
      aggregateId: category.id,
      aggregateType: 'InventoryCategory',
      payload: {
        code: category.code,
        name: category.name,
        parentId: category.parentId,
        createdBy: adminId,
      },
      createdBy: adminId,
      sessionId: context.sessionId || undefined,
      correlationId: context.correlationId || undefined,
    });

    // Log admin action
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'InventoryCategory',
      resourceId: category.id,
      action: 'CREATE',
      sessionId: context.sessionId,
      reason: `Admin created category: ${category.code}`,
      accessedPHI: false,
      success: true,
    });

    return category;
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: string, adminId: string) {
    const category = await this.categoriesRepository.findById(id);
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Log access
    const context = this.correlationService.getContext();
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'InventoryCategory',
      resourceId: id,
      action: 'READ',
      sessionId: context.sessionId,
      reason: 'Admin viewed category details',
      accessedPHI: false,
      success: true,
    });

    return category;
  }

  /**
   * List categories with filters and pagination
   */
  async listCategories(query: CategoryQueryDto, adminId: string) {
    const result = await this.categoriesRepository.findMany({
      search: query.search,
      active: query.active,
      parentId: query.parentId,
      skip: query.skip,
      take: query.take,
    });

    // Log access
    const context = this.correlationService.getContext();
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'InventoryCategory',
      resourceId: 'list',
      action: 'READ',
      sessionId: context.sessionId,
      reason: 'Admin listed categories',
      accessedPHI: false,
      success: true,
    });

    return result;
  }

  /**
   * Update category
   * SC-003: Update Inventory Category Information
   */
  async updateCategory(id: string, updateCategoryDto: UpdateCategoryDto, adminId: string) {
    const category = await this.categoriesRepository.findById(id);
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Update category
    const updatedCategory = await this.categoriesRepository.update(id, updateCategoryDto, adminId);

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'InventoryCategory.Updated',
      domain: Domain.INVENTORY,
      aggregateId: id,
      aggregateType: 'InventoryCategory',
      payload: {
        changes: updateCategoryDto,
        updatedBy: adminId,
      },
      createdBy: adminId,
      sessionId: context.sessionId || undefined,
      correlationId: context.correlationId || undefined,
    });

    // Log admin action
    await this.dataAccessLogService.log({
      userId: adminId,
      resourceType: 'InventoryCategory',
      resourceId: id,
      action: 'UPDATE',
      sessionId: context.sessionId,
      reason: `Admin updated category: ${category.code}`,
      accessedPHI: false,
      success: true,
    });

    return updatedCategory;
  }

  /**
   * Deactivate category
   * SC-003: Deactivate Inventory Category
   */
  async deactivateCategory(id: string, adminId: string) {
    const category = await this.categoriesRepository.findById(id);
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    if (!category.active) {
      throw new BadRequestException(`Category ${id} is already inactive`);
    }

    // Warn if category has items or children
    const categoryWithCounts = await this.categoriesRepository.findById(id);
    if (categoryWithCounts && (categoryWithCounts._count.items > 0 || categoryWithCounts._count.children > 0)) {
      // Still allow deactivation, but log warning
      // In real system, might want to require confirmation or prevent deactivation
    }

    // Deactivate category
    await this.categoriesRepository.deactivate(id, adminId);

    // Emit domain event
    const context = this.correlationService.getContext();
    await this.domainEventService.createEvent({
      eventType: 'InventoryCategory.Deactivated',
      domain: Domain.INVENTORY,
      aggregateId: id,
      aggregateType: 'InventoryCategory',
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
      resourceType: 'InventoryCategory',
      resourceId: id,
      action: 'DEACTIVATE',
      sessionId: context.sessionId,
      reason: `Admin deactivated category: ${category.code}`,
      accessedPHI: false,
      success: true,
    });
  }
}




