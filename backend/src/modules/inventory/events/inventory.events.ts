/**
 * Inventory Domain Events
 */

export enum InventoryEventType {
  ITEM_CREATED = 'InventoryItem.Created',
  ITEM_UPDATED = 'InventoryItem.Updated',
  INVENTORY_RECEIVED = 'Inventory.Received',
  INVENTORY_CONSUMED = 'Inventory.Consumed',
  INVENTORY_REVERSED = 'Inventory.Reversed',
  INVENTORY_ADJUSTED = 'Inventory.Adjusted',
  INVENTORY_TRANSFERRED = 'Inventory.Transferred',
  TRANSACTION_CREATED = 'InventoryTransaction.Created',
  USAGE_RECORDED = 'InventoryUsage.Recorded',
  STOCK_ADJUSTED = 'InventoryStock.Adjusted',
  INVENTORY_RECALLED = 'Inventory.Recalled',
}

export interface TransactionCreatedPayload {
  transactionId: string;
  itemId: string;
  transactionType: string;
  quantity: number;
  caseId?: string;
}

export interface UsageRecordedPayload {
  usageId: string;
  itemId: string;
  caseId: string;
  patientId: string;
  quantityUsed: number;
}




