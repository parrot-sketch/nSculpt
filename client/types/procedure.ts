// Procedure Plan Types
// Based on backend Prisma schema

export type ProcedurePlanStatus = 
  | 'DRAFT'
  | 'QUOTED'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'COMPLETED'
  | 'CANCELLED';

export type ProcedureType = 
  | 'COSMETIC'
  | 'RECONSTRUCTIVE'
  | 'HYBRID';

export interface ProcedurePlan {
  id: string;
  planNumber: string;
  patientId: string;
  consultationId?: string;
  
  // Procedure details
  procedureName: string;
  procedureType: ProcedureType;
  description?: string;
  
  // Coding
  primaryCPTCode?: string;
  cptCodes: string[];
  diagnosisCodes: string[];
  
  // Pricing
  estimatedCost?: number;
  insuranceCoverage: boolean;
  insurancePortion?: number;
  patientPortion?: number;
  
  // Status
  status: ProcedurePlanStatus;
  
  // Dates
  createdAt: string;
  approvedAt?: string;
  scheduledAt?: string;
  completedAt?: string;
  
  // Context
  createdBy: string;
  approvedBy?: string;
  
  // Notes
  notes?: string;
  patientNotes?: string;
  
  // Relations (optional, loaded on demand)
  inventoryRequirements?: ProcedureInventoryRequirement[];
  consentInstance?: {
    id: string;
    status: string;
    signedAt?: string;
  };
  surgicalCase?: {
    id: string;
    caseNumber: string;
    status: string;
  };
}

export interface ProcedureInventoryRequirement {
  id: string;
  planId: string;
  inventoryItemId: string;
  quantity: number;
  
  // Specific requirements
  requiresSerialNumber: boolean;
  sizeRequirement?: string;
  shapeRequirement?: string;
  
  // Status
  isRequired: boolean;
  isPreAllocated: boolean;
  preAllocatedBatchId?: string;
  
  // Notes
  notes?: string;
  
  // Relations (optional, loaded on demand)
  inventoryItem?: {
    id: string;
    itemNumber: string;
    name: string;
    description?: string;
  };
}

export interface CreateProcedurePlanDto {
  patientId: string;
  consultationId?: string;
  procedureName: string;
  procedureType: ProcedureType;
  description?: string;
  primaryCPTCode?: string;
  cptCodes: string[];
  diagnosisCodes: string[];
  estimatedCost?: number;
  insuranceCoverage: boolean;
  insurancePortion?: number;
  patientPortion?: number;
  notes?: string;
  patientNotes?: string;
}

export interface UpdateProcedurePlanDto extends Partial<CreateProcedurePlanDto> {
  status?: ProcedurePlanStatus;
}

export interface AddInventoryRequirementDto {
  planId: string;
  inventoryItemId: string;
  quantity: number;
  requiresSerialNumber?: boolean;
  sizeRequirement?: string;
  shapeRequirement?: string;
  isRequired?: boolean;
  notes?: string;
}









