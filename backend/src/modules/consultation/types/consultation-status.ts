/**
 * ConsultationStatus enum
 * 
 * Matches the enum defined in Prisma schema (foundation.prisma)
 * This is a workaround until Prisma properly exports the enum from @prisma/client
 */
export enum ConsultationStatus {
  SCHEDULED = 'SCHEDULED',
  CHECKED_IN = 'CHECKED_IN',
  IN_TRIAGE = 'IN_TRIAGE',
  IN_CONSULTATION = 'IN_CONSULTATION',
  PLAN_CREATED = 'PLAN_CREATED',
  CLOSED = 'CLOSED',
  FOLLOW_UP = 'FOLLOW_UP',
  REFERRED = 'REFERRED',
  SURGERY_SCHEDULED = 'SURGERY_SCHEDULED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}






