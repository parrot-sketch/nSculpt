// Domain types matching Prisma schema

// ============================================================================
// Theater & Surgical Cases
// ============================================================================

export interface SurgicalCase {
  id: string;
  caseNumber: string;
  patientId: string;
  procedureName: string;
  procedureCode?: string;
  description?: string;
  estimatedDurationMinutes?: number;
  priority: number; // 1-10, lower is more urgent
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'POSTPONED';
  scheduledStartAt: string;
  scheduledEndAt: string;
  actualStartAt?: string;
  actualEndAt?: string;
  primarySurgeonId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  reservations?: TheaterReservation[];
  resourceAllocations?: ResourceAllocation[];
}

export interface OperatingTheater {
  id: string;
  code: string;
  name: string;
  description?: string;
  departmentId: string;
  capacity?: number;
  active: boolean;
}

export interface TheaterReservation {
  id: string;
  theaterId: string;
  caseId?: string;
  reservedFrom: string;
  reservedUntil: string;
  reservationType: 'CASE' | 'MAINTENANCE' | 'BLOCK_TIME' | 'EMERGENCY';
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  notes?: string;
  theater?: OperatingTheater;
  case?: SurgicalCase;
}

export interface ResourceAllocation {
  id: string;
  reservationId: string;
  theaterId: string;
  caseId?: string;
  resourceType: 'STAFF' | 'EQUIPMENT' | 'INVENTORY' | 'SUPPLY';
  resourceId: string;
  resourceName: string;
  role?: string; // For staff: "SURGEON", "NURSE", "ANESTHESIOLOGIST"
  quantity: number;
  allocatedFrom: string;
  allocatedUntil: string;
  status: 'ALLOCATED' | 'RELEASED' | 'CANCELLED';
}

export interface CaseStatusHistory {
  id: string;
  caseId: string;
  fromStatus?: string;
  toStatus: string;
  reason?: string;
  changedBy?: string;
  changedAt: string;
}

// ============================================================================
// Medical Records
// ============================================================================

export interface MedicalRecord {
  id: string;
  recordNumber: string;
  patientId: string;
  dateOfBirth?: string;
  gender?: string;
  bloodType?: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'MERGED';
  mergedInto?: string;
  createdAt: string;
  updatedAt: string;
  notes?: ClinicalNote[];
  attachments?: MedicalRecordAttachment[];
}

export interface ClinicalNote {
  id: string;
  recordId: string;
  noteType: 'PROGRESS' | 'OPERATIVE' | 'CONSULTATION' | 'DISCHARGE';
  category?: string; // SOAP, HPI, etc.
  content: string;
  contentHash: string;
  encounterDate?: string;
  authoredAt: string;
  authoredBy: string;
  isAmendment: boolean;
  amendsNoteId?: string;
  amendmentReason?: string;
}

export interface MedicalRecordAttachment {
  id: string;
  recordId: string;
  fileName: string;
  filePath: string;
  fileSize: string; // BigInt as string
  mimeType: string;
  fileHash: string;
  accessLevel: 'PUBLIC' | 'RESTRICTED' | 'CONFIDENTIAL';
  description?: string;
}

// ============================================================================
// Inventory
// ============================================================================

export interface InventoryItem {
  id: string;
  itemNumber: string;
  name: string;
  description?: string;
  categoryId: string;
  itemType: 'EQUIPMENT' | 'SUPPLY' | 'IMPLANT' | 'CONSUMABLE';
  vendorId?: string;
  vendorPartNumber?: string;
  manufacturerName?: string;
  unitCost?: string; // Decimal as string
  unitPrice?: string;
  unitOfMeasure: string;
  reorderPoint?: string;
  reorderQuantity?: string;
  maxStock?: string;
  trackSerialNumber: boolean;
  trackLotNumber: boolean;
  trackExpiration: boolean;
  isEquipment: boolean;
  isBillable: boolean;
  active: boolean;
  category?: InventoryCategory;
  stock?: InventoryStock[];
}

export interface InventoryCategory {
  id: string;
  code: string;
  name: string;
  description?: string;
  parentId?: string;
  active: boolean;
}

export interface InventoryStock {
  id: string;
  itemId: string;
  batchId?: string;
  locationId?: string;
  quantityOnHand: string; // Decimal
  quantityReserved: string;
  quantityAvailable: string;
  lastComputedAt: string;
  item?: InventoryItem;
  batch?: InventoryBatch;
}

export interface InventoryBatch {
  id: string;
  itemId: string;
  batchNumber: string;
  lotNumber?: string;
  manufactureDate?: string;
  expirationDate?: string;
  receivedDate: string;
  receivedQuantity: string;
  unitCost?: string;
  isExpired: boolean;
  isActive: boolean;
}

export interface InventoryTransaction {
  id: string;
  transactionNumber: string;
  itemId: string;
  batchId?: string;
  transactionType: 'RECEIPT' | 'RESERVATION' | 'CONSUMPTION' | 'RETURN' | 'WASTAGE' | 'ADJUSTMENT' | 'TRANSFER' | 'ALLOCATION' | 'DEALLOCATION';
  quantity: string;
  unitCost?: string;
  fromLocationId?: string;
  toLocationId?: string;
  referenceType?: string;
  referenceId?: string;
  caseId?: string;
  patientId?: string;
  batchNumber?: string;
  lotNumber?: string;
  serialNumber?: string;
  expirationDate?: string;
  transactionDate: string;
}

export interface InventoryUsage {
  id: string;
  itemId: string;
  batchId?: string;
  transactionId: string;
  caseId: string;
  patientId: string;
  quantityUsed: string;
  unitCost?: string;
  batchNumber?: string;
  lotNumber?: string;
  serialNumber?: string;
  expirationDate?: string;
  theaterId?: string;
  usedAt: string;
  usedBy?: string;
}

// ============================================================================
// Billing
// ============================================================================

export interface Bill {
  id: string;
  billNumber: string;
  patientId: string;
  insurancePolicyId?: string;
  billDate: string;
  dueDate: string;
  subtotal: string;
  tax: string;
  discount: string;
  totalAmount: string;
  paidAmount: string;
  balance: string;
  status: 'DRAFT' | 'PENDING' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'WRITTEN_OFF';
  sentAt?: string;
  paidAt?: string;
  notes?: string;
  lineItems?: BillLineItem[];
  policy?: InsurancePolicy;
}

export interface BillLineItem {
  id: string;
  billId: string;
  billingCodeId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
  serviceDate: string;
  triggeringEventId: string;
  caseId?: string;
  recordId?: string;
  usageId?: string;
  procedureCode?: string;
  procedureName?: string;
  notes?: string;
  billingCode?: BillingCode;
}

export interface BillingCode {
  id: string;
  code: string;
  codeType: 'CPT' | 'ICD10' | 'HCPCS';
  description: string;
  category?: string;
  defaultCharge?: string;
  active: boolean;
}

export interface InsuranceProvider {
  id: string;
  code: string;
  name: string;
  payerId?: string;
  active: boolean;
}

export interface InsurancePolicy {
  id: string;
  providerId: string;
  patientId: string;
  policyNumber: string;
  groupNumber?: string;
  planName?: string;
  effectiveDate: string;
  expirationDate?: string;
  coverageType: 'PRIMARY' | 'SECONDARY' | 'TERTIARY';
  planType?: string;
  active: boolean;
  provider?: InsuranceProvider;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  patientId: string;
  amount: string;
  paymentDate: string;
  paymentMethod: 'CASH' | 'CHECK' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'ACH' | 'WIRE' | 'INSURANCE';
  paymentSource: 'PATIENT' | 'INSURANCE' | 'THIRD_PARTY';
  insuranceClaimId?: string;
  referenceNumber?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'VOIDED';
  processedAt?: string;
  notes?: string;
}

export interface InsuranceClaim {
  id: string;
  claimNumber: string;
  externalClaimId?: string;
  patientId: string;
  insurancePolicyId: string;
  billId: string;
  claimType: 'PRIMARY' | 'SECONDARY' | 'TERTIARY';
  totalBilled: string;
  totalPaid: string;
  patientResponsibility: string;
  serviceFromDate: string;
  serviceToDate: string;
  submittedAt?: string;
  respondedAt?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'DENIED' | 'PAID' | 'PARTIAL';
  rejectionReason?: string;
}

// ============================================================================
// Consent
// ============================================================================

export interface ConsentTemplate {
  id: string;
  templateCode: string;
  name: string;
  description?: string;
  procedureCode?: string;
  version: string;
  isActive: boolean;
  effectiveFrom: string;
  effectiveUntil?: string;
}

export interface PatientConsentInstance {
  id: string;
  instanceNumber: string;
  templateId: string;
  templateVersion: string;
  patientId: string;
  status: 'DRAFT' | 'SIGNED' | 'REVOKED' | 'EXPIRED' | 'SUPERSEDED';
  signedAt?: string;
  revokedAt?: string;
  expiresAt?: string;
  relatedCaseId?: string;
  relatedRecordId?: string;
  presentedBy: string;
  witnessedBy?: string;
  signedBy?: string;
  revokedBy?: string;
  notes?: string;
}

// ============================================================================
// Patient (from backend)
// ============================================================================

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  // Add more fields as needed
}












