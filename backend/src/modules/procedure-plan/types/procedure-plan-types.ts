/**
 * ProcedurePlanType enum
 * 
 * Matches the enum defined in Prisma schema (procedure-plan.prisma)
 */
export enum ProcedurePlanType {
  SURGICAL = 'SURGICAL',
  NON_SURGICAL = 'NON_SURGICAL',
  CONSERVATIVE = 'CONSERVATIVE',
  SERIES = 'SERIES',
}

/**
 * ProcedurePlanStatus enum
 * 
 * Matches the enum defined in Prisma schema (procedure-plan.prisma)
 */
export enum ProcedurePlanStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ON_HOLD = 'ON_HOLD',
}
