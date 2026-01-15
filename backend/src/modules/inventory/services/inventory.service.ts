import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InventoryRepository } from '../repositories/inventory.repository';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { IdentityContextService } from '../../../modules/auth/services/identityContext.service';
import { CreateItemDto } from '../dto/create-item.dto';
import { UpdateItemDto } from '../dto/update-item.dto';
import { ReceiveStockDto } from '../dto/receive-stock.dto';
import { ConsumeStockDto } from '../dto/consume-stock.dto';
import { ReverseTransactionDto } from '../dto/reverse-transaction.dto';
import { AdjustStockDto } from '../dto/adjust-stock.dto';
import { TransferStockDto } from '../dto/transfer-stock.dto';
import { InventoryEventType } from '../events/inventory.events';
import { Domain, InventoryTransactionType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InventoryService {
  constructor(
    private readonly inventoryRepository: InventoryRepository,
    private readonly domainEventService: DomainEventService,
    private readonly correlationService: CorrelationService,
    private readonly identityContext: IdentityContextService,
  ) {}

  async create(createItemDto: CreateItemDto, userId: string) {
    const item = await this.inventoryRepository.createItem(createItemDto);

    const context = this.correlationService.getContext();

    await this.domainEventService.createEvent({
      eventType: InventoryEventType.ITEM_CREATED,
      domain: Domain.INVENTORY,
      aggregateId: item.id,
      aggregateType: 'InventoryItem',
      payload: {
        itemId: item.id,
        itemNumber: item.itemNumber,
        name: item.name,
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return item;
  }

  async findOne(id: string) {
    const item = await this.inventoryRepository.findItemById(id);
    if (!item) {
      throw new NotFoundException(`Inventory item with ID ${id} not found`);
    }
    return item;
  }

  async update(id: string, updateItemDto: UpdateItemDto, userId: string) {
    await this.findOne(id);
    const updatedItem = await this.inventoryRepository.updateItem(id, updateItemDto);

    const context = this.correlationService.getContext();

    await this.domainEventService.createEvent({
      eventType: InventoryEventType.ITEM_UPDATED,
      domain: Domain.INVENTORY,
      aggregateId: id,
      aggregateType: 'InventoryItem',
      payload: {
        itemId: id,
        changes: updateItemDto,
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return updatedItem;
  }

  async createTransaction(data: {
    itemId: string;
    transactionType: string;
    quantity: number;
    caseId?: string;
    patientId?: string;
    triggeringEventId: string;
  }, userId?: string) {
    const transactionNumber = `TXN-${Date.now()}-${uuidv4().substring(0, 8)}`;

    const transaction = await this.inventoryRepository.createTransaction({
      transactionNumber,
      itemId: data.itemId,
      transactionType: data.transactionType as any,
      quantity: data.quantity,
      triggeringEventId: data.triggeringEventId,
      caseId: data.caseId,
      patientId: data.patientId,
      authorizedBy: userId,
    });

    return transaction;
  }

  async findAll(skip?: number, take?: number, userId?: string) {
    // Inventory is less sensitive - all authorized users can view
    // But filter by department if needed
    if (!userId) {
      return [];
    }

    // ADMIN and INVENTORY_MANAGER see all items
    if (
      this.identityContext.hasRole('ADMIN') ||
      this.identityContext.hasRole('INVENTORY_MANAGER')
    ) {
      return this.inventoryRepository.findAllItems(skip, take);
    }

    // Others can view all items (already checked by RolesGuard)
    return this.inventoryRepository.findAllItems(skip, take);
  }

  /**
   * Receive stock (Phase 1)
   * Creates receipt transaction and batch if needed
   */
  async receiveStock(receiveStockDto: ReceiveStockDto, userId: string) {
    // Verify item exists
    const item = await this.inventoryRepository.findItemById(
      receiveStockDto.itemId,
    );
    if (!item) {
      throw new NotFoundException(
        `Inventory item with ID ${receiveStockDto.itemId} not found`,
      );
    }

    // Get correlation context
    const context = this.correlationService.getContext();

    // Create domain event for receipt
    const receiptEvent = await this.domainEventService.createEvent({
      eventType: InventoryEventType.INVENTORY_RECEIVED,
      domain: Domain.INVENTORY,
      aggregateId: receiveStockDto.itemId,
      aggregateType: 'InventoryItem',
      payload: {
        itemId: receiveStockDto.itemId,
        quantity: receiveStockDto.quantity,
        batchNumber: receiveStockDto.batchNumber,
        lotNumber: receiveStockDto.lotNumber,
        expirationDate: receiveStockDto.expirationDate,
        unitCost: receiveStockDto.unitCost,
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    // Create or update batch if batch tracking is required
    let batchId: string | undefined;
    if (
      receiveStockDto.batchNumber &&
      (item.trackLotNumber || item.trackBatch)
    ) {
      const batch = await this.inventoryRepository.upsertBatch({
        itemId: receiveStockDto.itemId,
        batchNumber: receiveStockDto.batchNumber,
        lotNumber: receiveStockDto.lotNumber,
        manufactureDate: receiveStockDto.manufactureDate
          ? new Date(receiveStockDto.manufactureDate)
          : undefined,
        expirationDate: receiveStockDto.expirationDate
          ? new Date(receiveStockDto.expirationDate)
          : undefined,
        receivedQuantity: receiveStockDto.quantity,
        unitCost: receiveStockDto.unitCost,
        vendorId: receiveStockDto.vendorId,
        purchaseOrderNumber: receiveStockDto.purchaseOrderNumber,
      });
      batchId = batch.id;
    }

    // Create receipt transaction
    const transactionNumber =
      this.inventoryRepository.generateTransactionNumber();
    const transaction = await this.inventoryRepository.createTransaction({
      transactionNumber,
      itemId: receiveStockDto.itemId,
      batchId,
      transactionType: InventoryTransactionType.RECEIPT,
      quantity: receiveStockDto.quantity,
      unitCost: receiveStockDto.unitCost,
      toLocationId: receiveStockDto.toLocationId,
      referenceType: 'PURCHASE_ORDER',
      referenceId: receiveStockDto.purchaseOrderNumber,
      triggeringEventId: receiptEvent.id,
      batchNumber: receiveStockDto.batchNumber,
      lotNumber: receiveStockDto.lotNumber,
      expirationDate: receiveStockDto.expirationDate
        ? new Date(receiveStockDto.expirationDate)
        : undefined,
      notes: receiveStockDto.notes,
      authorizedBy: userId,
    });

    return transaction;
  }

  /**
   * Consume stock (Phase 1)
   * Uses FIFO (First In, First Out) - oldest expiration first
   * Creates consumption transaction and usage record
   */
  async consumeStock(consumeStockDto: ConsumeStockDto, userId: string) {
    // Verify item exists
    const item = await this.inventoryRepository.findItemById(
      consumeStockDto.itemId,
    );
    if (!item) {
      throw new NotFoundException(
        `Inventory item with ID ${consumeStockDto.itemId} not found`,
      );
    }

    // Calculate available stock
    const availableStock = await this.inventoryRepository.calculateStock(
      consumeStockDto.itemId,
      undefined,
      consumeStockDto.fromLocationId,
    );

    if (availableStock < consumeStockDto.quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${availableStock}, Requested: ${consumeStockDto.quantity}`,
      );
    }

    // Get available batches (FIFO - sorted by expiration date)
    const availableBatches =
      await this.inventoryRepository.getAvailableBatches(
        consumeStockDto.itemId,
        consumeStockDto.fromLocationId,
      );

    if (availableBatches.length === 0) {
      throw new BadRequestException('No available stock batches found');
    }

    // Get correlation context
    const context = this.correlationService.getContext();

    // Create domain event for consumption
    const consumptionEvent = await this.domainEventService.createEvent({
      eventType: InventoryEventType.INVENTORY_CONSUMED,
      domain: Domain.INVENTORY,
      aggregateId: consumeStockDto.itemId,
      aggregateType: 'InventoryItem',
      payload: {
        itemId: consumeStockDto.itemId,
        quantity: consumeStockDto.quantity,
        consultationId: consumeStockDto.consultationId,
        caseId: consumeStockDto.caseId,
        patientId: consumeStockDto.patientId,
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    // Consume from batches using FIFO
    let remainingQuantity = consumeStockDto.quantity;
    const transactions = [];

    for (const batch of availableBatches) {
      if (remainingQuantity <= 0) break;

      const quantityFromBatch = Math.min(
        remainingQuantity,
        batch.availableQuantity,
      );

      // Create consumption transaction for this batch
      const transactionNumber =
        this.inventoryRepository.generateTransactionNumber();
      const transaction = await this.inventoryRepository.createTransaction({
        transactionNumber,
        itemId: consumeStockDto.itemId,
        batchId: batch.batchId,
        transactionType: InventoryTransactionType.CONSUMPTION,
        quantity: quantityFromBatch,
        unitCost: batch.unitCost,
        fromLocationId: consumeStockDto.fromLocationId,
        referenceType: consumeStockDto.consultationId
          ? 'CONSULTATION'
          : consumeStockDto.caseId
            ? 'SURGICAL_CASE'
            : undefined,
        referenceId: consumeStockDto.consultationId || consumeStockDto.caseId,
        triggeringEventId: consumptionEvent.id,
        caseId: consumeStockDto.caseId,
        patientId: consumeStockDto.patientId,
        batchNumber: batch.batchNumber,
        lotNumber: batch.lotNumber,
        expirationDate: batch.expirationDate,
        notes: consumeStockDto.notes,
        reason: consumeStockDto.reason,
        authorizedBy: userId,
      });

      transactions.push(transaction);
      remainingQuantity -= quantityFromBatch;
    }

    if (remainingQuantity > 0) {
      throw new BadRequestException(
        `Could not consume full quantity. Remaining: ${remainingQuantity}`,
      );
    }

    return transactions;
  }

  /**
   * Reverse a transaction (Phase 1)
   * Creates a reversal entry, not an edit
   */
  async reverseTransaction(
    reverseTransactionDto: ReverseTransactionDto,
    userId: string,
  ) {
    // Find the original transaction
    const originalTx = await this.inventoryRepository.findTransactionById(
      reverseTransactionDto.transactionId,
    );
    if (!originalTx) {
      throw new NotFoundException(
        `Transaction with ID ${reverseTransactionDto.transactionId} not found`,
      );
    }

    // Get correlation context
    const context = this.correlationService.getContext();

    // Create domain event for reversal
    const reversalEvent = await this.domainEventService.createEvent({
      eventType: InventoryEventType.INVENTORY_REVERSED,
      domain: Domain.INVENTORY,
      aggregateId: originalTx.itemId,
      aggregateType: 'InventoryTransaction',
      payload: {
        originalTransactionId: originalTx.id,
        itemId: originalTx.itemId,
        quantity: Number(originalTx.quantity),
        reason: reverseTransactionDto.reason,
      },
      correlationId: context.correlationId || undefined,
      causationId: originalTx.triggeringEventId,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    // Create reversal transaction (opposite quantity)
    const transactionNumber =
      this.inventoryRepository.generateTransactionNumber();
    const reversalTx = await this.inventoryRepository.createTransaction({
      transactionNumber,
      itemId: originalTx.itemId,
      batchId: originalTx.batchId || undefined,
      transactionType: InventoryTransactionType.REVERSAL,
      quantity: -Number(originalTx.quantity), // Opposite sign
      unitCost: Number(originalTx.unitCost),
      fromLocationId: originalTx.toLocationId || undefined,
      toLocationId: originalTx.fromLocationId || undefined,
      referenceType: 'REVERSAL',
      referenceId: originalTx.id,
      triggeringEventId: reversalEvent.id,
      caseId: originalTx.caseId || undefined,
      patientId: originalTx.patientId || undefined,
      batchNumber: originalTx.batchNumber || undefined,
      lotNumber: originalTx.lotNumber || undefined,
      expirationDate: originalTx.expirationDate || undefined,
      reason: reverseTransactionDto.reason,
      authorizedBy: userId,
    });

    return reversalTx;
  }

  /**
   * Adjust stock (Phase 1)
   * ADMIN only - for stock count corrections
   */
  async adjustStock(adjustStockDto: AdjustStockDto, userId: string) {
    // Role check: Only ADMIN can adjust stock
    if (!this.identityContext.hasRole('ADMIN')) {
      throw new ForbiddenException('Only ADMIN can adjust stock');
    }

    // Verify item exists
    const item = await this.inventoryRepository.findItemById(
      adjustStockDto.itemId,
    );
    if (!item) {
      throw new NotFoundException(
        `Inventory item with ID ${adjustStockDto.itemId} not found`,
      );
    }

    // Get correlation context
    const context = this.correlationService.getContext();

    // Create domain event for adjustment
    const adjustmentEvent = await this.domainEventService.createEvent({
      eventType: InventoryEventType.INVENTORY_ADJUSTED,
      domain: Domain.INVENTORY,
      aggregateId: adjustStockDto.itemId,
      aggregateType: 'InventoryItem',
      payload: {
        itemId: adjustStockDto.itemId,
        quantityAdjustment: adjustStockDto.quantityAdjustment,
        reason: adjustStockDto.reason,
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    // Create adjustment transaction
    const transactionNumber =
      this.inventoryRepository.generateTransactionNumber();
    const transaction = await this.inventoryRepository.createTransaction({
      transactionNumber,
      itemId: adjustStockDto.itemId,
      batchId: adjustStockDto.batchId,
      transactionType: InventoryTransactionType.ADJUSTMENT,
      quantity: adjustStockDto.quantityAdjustment,
      toLocationId: adjustStockDto.locationId,
      referenceType: 'ADJUSTMENT',
      triggeringEventId: adjustmentEvent.id,
      reason: adjustStockDto.reason,
      authorizedBy: userId,
    });

    return transaction;
  }

  /**
   * Transfer stock between locations (Phase 1)
   */
  async transferStock(transferStockDto: TransferStockDto, userId: string) {
    // Verify item exists
    const item = await this.inventoryRepository.findItemById(
      transferStockDto.itemId,
    );
    if (!item) {
      throw new NotFoundException(
        `Inventory item with ID ${transferStockDto.itemId} not found`,
      );
    }

    // Verify sufficient stock at source location
    const availableStock = await this.inventoryRepository.calculateStock(
      transferStockDto.itemId,
      transferStockDto.batchId,
      transferStockDto.fromLocationId,
    );

    if (availableStock < transferStockDto.quantity) {
      throw new BadRequestException(
        `Insufficient stock at source location. Available: ${availableStock}, Requested: ${transferStockDto.quantity}`,
      );
    }

    // Get correlation context
    const context = this.correlationService.getContext();

    // Create domain event for transfer
    const transferEvent = await this.domainEventService.createEvent({
      eventType: InventoryEventType.INVENTORY_TRANSFERRED,
      domain: Domain.INVENTORY,
      aggregateId: transferStockDto.itemId,
      aggregateType: 'InventoryItem',
      payload: {
        itemId: transferStockDto.itemId,
        quantity: transferStockDto.quantity,
        fromLocationId: transferStockDto.fromLocationId,
        toLocationId: transferStockDto.toLocationId,
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    // Create transfer transactions (OUT from source, IN to destination)
    const transactionNumber =
      this.inventoryRepository.generateTransactionNumber();

    const [transferOut, transferIn] = await Promise.all([
      // Transfer OUT from source
      this.inventoryRepository.createTransaction({
        transactionNumber: `${transactionNumber}-OUT`,
        itemId: transferStockDto.itemId,
        batchId: transferStockDto.batchId,
        transactionType: InventoryTransactionType.TRANSFER_OUT,
        quantity: transferStockDto.quantity,
        fromLocationId: transferStockDto.fromLocationId,
        referenceType: 'TRANSFER',
        referenceId: transferEvent.id,
        triggeringEventId: transferEvent.id,
        reason: transferStockDto.reason,
        notes: transferStockDto.notes,
        authorizedBy: userId,
      }),
      // Transfer IN to destination
      this.inventoryRepository.createTransaction({
        transactionNumber: `${transactionNumber}-IN`,
        itemId: transferStockDto.itemId,
        batchId: transferStockDto.batchId,
        transactionType: InventoryTransactionType.TRANSFER_IN,
        quantity: transferStockDto.quantity,
        toLocationId: transferStockDto.toLocationId,
        referenceType: 'TRANSFER',
        referenceId: transferEvent.id,
        triggeringEventId: transferEvent.id,
        reason: transferStockDto.reason,
        notes: transferStockDto.notes,
        authorizedBy: userId,
      }),
    ]);

    return { transferOut, transferIn };
  }

  /**
   * Get current stock for an item
   * Calculated from ledger
   */
  async getStock(
    itemId: string,
    batchId?: string,
    locationId?: string,
  ): Promise<number> {
    return await this.inventoryRepository.calculateStock(
      itemId,
      batchId,
      locationId,
    );
  }

  /**
   * Phase 2: Consume stock for clinical use (prescription, surgery, etc.)
   * Enhanced version that creates InventoryUsage record
   */
  async consumeStockForClinicalUse(
    data: {
      itemId: string;
      quantity: number;
      consultationId?: string;
      caseId?: string;
      patientId: string;
      fromLocationId?: string;
      reason?: string;
      notes?: string;
    },
    userId: string,
    clinicalEventId: string,
  ): Promise<{ transactions: any[]; usage: any }> {
    // Consume stock using FIFO
    const transactions = await this.consumeStock(
      {
        itemId: data.itemId,
        quantity: data.quantity,
        consultationId: data.consultationId,
        caseId: data.caseId,
        patientId: data.patientId,
        fromLocationId: data.fromLocationId,
        reason: data.reason,
        notes: data.notes,
      },
      userId,
    );

    // Create inventory usage record
    let usage = null;
    if (transactions && transactions.length > 0) {
      // Get batch information from first transaction
      const firstTx = transactions[0];
      
      usage = await this.inventoryRepository.createUsage({
        itemId: data.itemId,
        batchId: firstTx.batchId || undefined,
        transactionId: firstTx.id,
        caseId: data.caseId,
        consultationId: data.consultationId,
        patientId: data.patientId,
        quantityUsed: data.quantity,
        batchNumber: firstTx.batchNumber || undefined,
        lotNumber: firstTx.lotNumber || undefined,
        expirationDate: firstTx.expirationDate || undefined,
        clinicalEventId,
        usedBy: userId,
        notes: data.notes,
      });
    }

    return { transactions, usage };
  }
}

