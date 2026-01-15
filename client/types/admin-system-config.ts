/**
 * System Configuration Types
 * 
 * Types for system configuration entities managed in admin.
 */

// ============================================================================
// Departments
// ============================================================================

export interface Department {
  id: string;
  code: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDepartmentRequest {
  code: string;
  name: string;
  description?: string;
  active?: boolean;
}

export interface UpdateDepartmentRequest {
  name?: string;
  description?: string;
  active?: boolean;
}

export interface DepartmentQueryParams {
  search?: string;
  active?: boolean;
  skip?: number;
  take?: number;
}

export interface DepartmentsListResponse {
  data: Department[];
  total: number;
  skip: number;
  take: number;
}

// ============================================================================
// Operating Theaters
// ============================================================================

export interface OperatingTheater {
  id: string;
  code: string;
  name: string;
  description?: string;
  departmentId: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  department?: Department;
}

export interface CreateTheaterRequest {
  code: string;
  name: string;
  description?: string;
  departmentId: string;
  active?: boolean;
}

export interface UpdateTheaterRequest {
  name?: string;
  description?: string;
  departmentId?: string;
  active?: boolean;
}

export interface TheaterQueryParams {
  search?: string;
  departmentId?: string;
  active?: boolean;
  skip?: number;
  take?: number;
}

export interface TheatersListResponse {
  data: OperatingTheater[];
  total: number;
  skip: number;
  take: number;
}

// ============================================================================
// Inventory Categories
// ============================================================================

export interface InventoryCategory {
  id: string;
  code: string;
  name: string;
  description?: string;
  parentId?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  parent?: InventoryCategory;
}

export interface CreateCategoryRequest {
  code: string;
  name: string;
  description?: string;
  parentId?: string;
  active?: boolean;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  parentId?: string;
  active?: boolean;
}

export interface CategoryQueryParams {
  search?: string;
  parentId?: string;
  active?: boolean;
  skip?: number;
  take?: number;
}

export interface CategoriesListResponse {
  data: InventoryCategory[];
  total: number;
  skip: number;
  take: number;
}

// ============================================================================
// Vendors
// ============================================================================

export interface Vendor {
  id: string;
  code: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVendorRequest {
  code: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  active?: boolean;
}

export interface UpdateVendorRequest {
  name?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  active?: boolean;
}

export interface VendorQueryParams {
  search?: string;
  active?: boolean;
  skip?: number;
  take?: number;
}

export interface VendorsListResponse {
  data: Vendor[];
  total: number;
  skip: number;
  take: number;
}

// ============================================================================
// Billing Codes
// ============================================================================

export interface BillingCode {
  id: string;
  code: string;
  codeType: 'CPT' | 'ICD10' | 'HCPCS';
  description: string;
  category?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBillingCodeRequest {
  code: string;
  codeType: 'CPT' | 'ICD10' | 'HCPCS';
  description: string;
  category?: string;
  active?: boolean;
}

export interface UpdateBillingCodeRequest {
  description?: string;
  category?: string;
  active?: boolean;
}

export interface BillingCodeQueryParams {
  search?: string;
  codeType?: 'CPT' | 'ICD10' | 'HCPCS';
  active?: boolean;
  skip?: number;
  take?: number;
}

export interface BillingCodesListResponse {
  data: BillingCode[];
  total: number;
  skip: number;
  take: number;
}

// ============================================================================
// Insurance Providers
// ============================================================================

export interface InsuranceProvider {
  id: string;
  code: string;
  name: string;
  payerId?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInsuranceProviderRequest {
  code: string;
  name: string;
  payerId?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  active?: boolean;
}

export interface UpdateInsuranceProviderRequest {
  name?: string;
  payerId?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  active?: boolean;
}

export interface InsuranceProviderQueryParams {
  search?: string;
  active?: boolean;
  skip?: number;
  take?: number;
}

export interface InsuranceProvidersListResponse {
  data: InsuranceProvider[];
  total: number;
  skip: number;
  take: number;
}

// ============================================================================
// Fee Schedules
// ============================================================================

export interface FeeScheduleItem {
  id: string;
  feeScheduleId: string;
  billingCodeId: string;
  amount: string;
  effectiveFrom: string;
  effectiveUntil?: string;
  createdAt: string;
  updatedAt: string;
  billingCode?: BillingCode;
}

export interface FeeSchedule {
  id: string;
  code: string;
  name: string;
  description?: string;
  insuranceProviderId?: string;
  effectiveFrom: string;
  effectiveUntil?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  insuranceProvider?: InsuranceProvider;
  items?: FeeScheduleItem[];
}

export interface CreateFeeScheduleRequest {
  code: string;
  name: string;
  description?: string;
  insuranceProviderId?: string;
  effectiveFrom: string;
  effectiveUntil?: string;
  active?: boolean;
}

export interface UpdateFeeScheduleRequest {
  name?: string;
  description?: string;
  insuranceProviderId?: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
  active?: boolean;
}

export interface CreateFeeScheduleItemRequest {
  billingCodeId: string;
  amount: string;
  effectiveFrom: string;
  effectiveUntil?: string;
}

export interface UpdateFeeScheduleItemRequest {
  amount?: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
}

export interface FeeScheduleQueryParams {
  search?: string;
  insuranceProviderId?: string;
  active?: boolean;
  skip?: number;
  take?: number;
}

export interface FeeSchedulesListResponse {
  data: FeeSchedule[];
  total: number;
  skip: number;
  take: number;
}









