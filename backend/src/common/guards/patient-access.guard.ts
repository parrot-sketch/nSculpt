/**
 * Patient Access Guard
 * 
 * CRITICAL: Re-exports RlsGuard for patient-specific access control.
 * 
 * The main RLS enforcement is done by RlsGuard in rls.guard.ts.
 * This file provides additional utilities and decorators.
 * 
 * RLS Access Rules (from RlsValidationService):
 * - ADMIN: Full access to all patients
 * - DOCTOR: Access to patients they have consultations/appointments with
 * - SURGEON: Access to patients in their surgical cases
 * - NURSE: Access to patients in their assigned cases
 * - PATIENT: Access only to their own record (via userId FK)
 * - FRONT_DESK: View access for scheduling purposes
 * 
 * Usage:
 * @UseGuards(RolesGuard, RlsGuard, PermissionsGuard)
 * @Controller('patients/:id/...')
 */

export { RlsGuard as PatientAccessGuard } from './rls.guard';

/**
 * Skip Patient Access Check Decorator Key
 * Reserved for future use if we need route-level RLS bypass
 */
export const SKIP_PATIENT_ACCESS_KEY = 'skipPatientAccess';
