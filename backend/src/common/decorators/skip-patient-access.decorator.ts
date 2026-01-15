import { SetMetadata } from '@nestjs/common';
import { SKIP_PATIENT_ACCESS_KEY } from '../guards/patient-access.guard';

/**
 * Skip Patient Access Decorator
 * 
 * Use this decorator on routes that should NOT have patient-level RLS checks.
 * 
 * Examples:
 * - Patient list endpoints (GET /patients)
 * - Patient creation endpoints (POST /patients)
 * - Lookup endpoints without patient context
 * 
 * Usage:
 * @SkipPatientAccess()
 * @Get()
 * async findAll() { ... }
 */
export const SkipPatientAccess = () => SetMetadata(SKIP_PATIENT_ACCESS_KEY, true);
