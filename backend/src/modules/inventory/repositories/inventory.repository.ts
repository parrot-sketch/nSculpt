import { Injectable } from '@nestjs/common';
import { PrismaClient, InventoryTransactionType } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { CreateItemDto } from '../dto/create-item.dto';
import { UpdateItemDto } from '../dto/update-item.dto';

@Injectable()
export class InventoryRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  async createItem(data: CreateItemDto) {
    return await this.prisma.inventoryItem.create({
      data: {
        itemNumber: data.itemNumber,
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        itemType: data.itemType,
        vendorId: data.vendorId,
        vendorPartNumber: data.vendorPartNumber,
        manufacturerName: data.manufacturerName,
        unitCost: data.unitCost,
        unitPrice: data.unitPrice,
        unitOfMeasure: data.unitOfMeasure,
        isBillable: data.isBillable ?? true,
      },
    });
  }

  async findItemById(id: string) {
    return await this.prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        category: true,
        vendor: true,
        stock: true,
      },
    });
  }

  async updateItem(id: string, data: UpdateItemDto) {
    return await this.prisma.inventoryItem.update({
      where: { id },
      data,
    });
  }

  async createTransaction(data: {
    transactionNumber: string;
    itemId: string;
    batchId?: string;
    transactionType: InventoryTransactionType;
    quantity: number;
    unitCost?: number;
    fromLocationId?: string;
    toLocationId?: string;
    referenceType?: string;
    referenceId?: string;
    triggeringEventId: string;
    caseId?: string;
    patientId?: string;
    batchNumber?: string;
    lotNumber?: string;
    serialNumber?: string;
    expirationDate?: Date;
    notes?: string;
    reason?: string;
    authorizedBy?: string;
  }) {
    return await this.prisma.inventoryTransaction.create({
      data,
    });
  }

  async createUsage(data: {
    itemId: string;
    batchId?: string;
    transactionId: string;
    caseId?: string;
    consultationId?: string;
    patientId: string;
    quantityUsed: number;
    unitCost?: number;
    batchNumber?: string;
    lotNumber?: string;
    serialNumber?: string;
    expirationDate?: Date;
    clinicalEventId: string;
    billingEventId?: string;
    theaterId?: string;
    locationId?: string;
    notes?: string;
    usedBy?: string;
  }) {
    return await this.prisma.inventoryUsage.create({
      data: {
        itemId: data.itemId,
        batchId: data.batchId,
        transactionId: data.transactionId,
        caseId: data.caseId,
        consultationId: data.consultationId,
        patientId: data.patientId,
        quantityUsed: data.quantityUsed,
        unitCost: data.unitCost,
        batchNumber: data.batchNumber,
        lotNumber: data.lotNumber,
        serialNumber: data.serialNumber,
        expirationDate: data.expirationDate,
        clinicalEventId: data.clinicalEventId,
        billingEventId: data.billingEventId,
        theaterId: data.theaterId,
        locationId: data.locationId,
        notes: data.notes,
        usedBy: data.usedBy,
      },
      include: {
        item: true,
        batch: true,
        case: true,
        consultation: true,
      },
    });
  }

  async findAllItems(skip?: number, take?: number) {
    return await this.prisma.inventoryItem.findMany({
      skip,
      take,
      include: {
        category: true,
      },
    });
  }

  /**
   * Find transaction by ID
   */
  async findTransactionById(id: string) {
    return await this.prisma.inventoryTransaction.findUnique({
      where: { id },
      include: {
        item: true,
        batch: true,
      },
    });
  }

  /**
   * Get available batches for an item (FIFO - oldest expiration first)
   * Returns batches with available quantity > 0, sorted by expiration date
   */
  async getAvailableBatches(
    itemId: string,
    locationId?: string,
  ): Promise<
    Array<{
      batchId: string;
      batchNumber: string;
      lotNumber: string | null;
      expirationDate: Date | null;
      availableQuantity: number;
      unitCost: number | null;
    }>
  > {
    // Get all batches for this item
    const batches = await this.prisma.inventoryBatch.findMany({
      where: {
        itemId,
        isActive: true,
      },
      orderBy: {
        expirationDate: {
          sort: 'asc',
          nulls: 'last', // Non-expiring items last
        },
      },
    });

    // Calculate available quantity per batch from transactions
    const batchAvailabilities = await Promise.all(
      batches.map(async (batch) => {
        const transactions = await this.prisma.inventoryTransaction.findMany({
          where: {
            batchId: batch.id,
            ...(locationId && {
              OR: [
                { toLocationId: locationId },
                { fromLocationId: locationId },
              ],
            }),
          },
        });

        // Calculate net quantity: receipts (+) - consumption/transfers out (-)
        let availableQuantity = Number(batch.receivedQuantity);

        for (const tx of transactions) {
          switch (tx.transactionType) {
            case 'RECEIPT':
            case 'RETURN':
            case 'TRANSFER_IN':
            case 'ADJUSTMENT':
              // Only count positive adjustments
              if (tx.transactionType === 'ADJUSTMENT' && Number(tx.quantity) < 0) {
                availableQuantity += Number(tx.quantity);
              } else {
                availableQuantity += Number(tx.quantity);
              }
              break;
            case 'CONSUMPTION':
            case 'WASTAGE':
            case 'TRANSFER_OUT':
              availableQuantity -= Number(tx.quantity);
              break;
            case 'REVERSAL':
              // Reversals need special handling - look up original transaction
              // For now, we'll handle in service layer
              break;
          }
        }

        return {
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          lotNumber: batch.lotNumber,
          expirationDate: batch.expirationDate,
          availableQuantity: Math.max(0, availableQuantity), // Can't be negative
          unitCost: Number(batch.unitCost),
        };
      }),
    );

    // Filter to only batches with available quantity > 0
    return batchAvailabilities.filter((b) => b.availableQuantity > 0);
  }

  /**
   * Create or update batch
   */
  async upsertBatch(data: {
    itemId: string;
    batchNumber: string;
    lotNumber?: string;
    manufactureDate?: Date;
    expirationDate?: Date;
    receivedQuantity: number;
    unitCost?: number;
    vendorId?: string;
    purchaseOrderNumber?: string;
  }) {
    return await this.prisma.inventoryBatch.upsert({
      where: {
        itemId_batchNumber: {
          itemId: data.itemId,
          batchNumber: data.batchNumber,
        },
      },
      create: {
        itemId: data.itemId,
        batchNumber: data.batchNumber,
        lotNumber: data.lotNumber,
        manufactureDate: data.manufactureDate,
        expirationDate: data.expirationDate,
        receivedQuantity: data.receivedQuantity,
        unitCost: data.unitCost,
        vendorId: data.vendorId,
        purchaseOrderNumber: data.purchaseOrderNumber,
      },
      update: {
        receivedQuantity: {
          increment: data.receivedQuantity,
        },
      },
    });
  }

  /**
   * Calculate current stock for an item/batch/location
   * Stock = SUM(receipts) - SUM(outgoing) from ledger
   */
  async calculateStock(
    itemId: string,
    batchId?: string,
    locationId?: string,
  ): Promise<number> {
    const where: any = {
      itemId,
      ...(batchId && { batchId }),
      ...(locationId && {
        OR: [{ toLocationId: locationId }, { fromLocationId: locationId }],
      }),
    };

    const transactions = await this.prisma.inventoryTransaction.findMany({
      where,
    });

    let stock = 0;

    for (const tx of transactions) {
      // Skip reversals - they're handled by their opposite quantity
      if (tx.transactionType === 'REVERSAL') {
        // Reversal quantity already has opposite sign, so just add it
        stock += Number(tx.quantity);
        continue;
      }

      switch (tx.transactionType) {
        case 'RECEIPT':
        case 'RETURN':
        case 'TRANSFER_IN':
          stock += Number(tx.quantity);
          break;
        case 'CONSUMPTION':
        case 'WASTAGE':
        case 'TRANSFER_OUT':
          stock -= Number(tx.quantity);
          break;
        case 'ADJUSTMENT':
          stock += Number(tx.quantity); // Adjustments can be positive or negative
          break;
      }
    }

    return Math.max(0, stock); // Stock can't be negative
  }

  /**
   * Generate unique transaction number
   */
  generateTransactionNumber(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `INV-TX-${timestamp}-${random}`;
  }
}




