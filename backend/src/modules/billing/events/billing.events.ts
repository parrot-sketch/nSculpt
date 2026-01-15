/**
 * Billing Domain Events
 */

export enum BillingEventType {
  BILL_CREATED = 'Bill.Created',
  BILL_LINE_ITEM_CREATED = 'BillLineItem.Created',
  BILL_STATUS_CHANGED = 'Bill.StatusChanged',
  PAYMENT_RECORDED = 'Payment.Recorded',
  ADJUSTMENT_CREATED = 'BillingAdjustment.Created',
  CLAIM_SUBMITTED = 'InsuranceClaim.Submitted',
}

export interface BillCreatedPayload {
  billId: string;
  billNumber: string;
  patientId: string;
  totalAmount: number;
}

export interface LineItemCreatedPayload {
  lineItemId: string;
  billId: string;
  billingCodeId: string;
  quantity: number;
  unitPrice: number;
  triggeringEventId: string;
}












