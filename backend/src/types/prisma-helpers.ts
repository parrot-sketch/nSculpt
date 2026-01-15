/**
 * Prisma Type Helpers
 * 
 * This module provides utilities to extract and transform Prisma types
 * for use in DTOs, services, and API responses.
 * 
 * Goal: Make Prisma schema the single source of truth for types.
 * 
 * Usage:
 *   import { MedicalRecordCreateInput, MedicalRecordUpdateInput } from '@/types/prisma-helpers';
 */

import { Prisma } from '@prisma/client';

// ============================================================================
// Medical Records
// ============================================================================

/**
 * Extract create input type from Prisma
 * Use this as the base type for CreateMedicalRecordDto
 */
export type MedicalRecordCreateInput = Prisma.MedicalRecordCreateInput;

/**
 * Extract update input type from Prisma
 * Use this as the base type for UpdateMedicalRecordDto
 */
export type MedicalRecordUpdateInput = Prisma.MedicalRecordUpdateInput;

/**
 * Extract the base model type (without relations)
 * Use this for API responses
 */
export type MedicalRecord = Prisma.MedicalRecordGetPayload<{}>;

/**
 * MedicalRecord with relations (notes, attachments, etc.)
 * Use this when you need the full object with relations
 */
export type MedicalRecordWithRelations = Prisma.MedicalRecordGetPayload<{
  include: {
    notes: true;
    attachments: true;
    mergeHistory: true;
  };
}>;

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Pick specific fields from a Prisma input type
 * Useful when DTO should only expose certain fields
 * 
 * Example:
 *   type CreateDto = PickPrismaFields<MedicalRecordCreateInput, 'recordNumber' | 'patientId'>;
 */
export type PickPrismaFields<T, K extends keyof T> = Pick<T, K>;

/**
 * Omit specific fields from a Prisma input type
 * Useful when DTO should exclude internal/auto-generated fields
 * 
 * Example:
 *   type CreateDto = OmitPrismaFields<MedicalRecordCreateInput, 'id' | 'createdAt'>;
 */
export type OmitPrismaFields<T, K extends keyof T> = Omit<T, K>;

/**
 * Make specific fields optional in a Prisma input type
 * Useful for update DTOs
 * 
 * Example:
 *   type UpdateDto = PartialPrismaFields<MedicalRecordUpdateInput, 'status' | 'mergedInto'>;
 */
export type PartialPrismaFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// ============================================================================
// Future: Add more models as needed
// ============================================================================

// Example pattern for other models:
// export type UserCreateInput = Prisma.UserCreateInput;
// export type UserUpdateInput = Prisma.UserUpdateInput;
// export type User = Prisma.UserGetPayload<{}>;










