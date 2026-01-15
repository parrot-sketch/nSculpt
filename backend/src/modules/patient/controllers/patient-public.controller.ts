import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  ConflictException,
} from '@nestjs/common';
import { PatientService } from '../services/patient.service';
import { SelfRegisterPatientDto } from '../dto/self-register-patient.dto';
import { Public } from '../../auth/decorators/public.decorator';

/**
 * Public Patient Controller
 * 
 * Handles patient-facing endpoints that don't require authentication:
 * - Self-registration (privacy-first workflow)
 * - Password reset
 * - Account verification
 * 
 * These endpoints are public but still rate-limited and validated.
 */
@Controller('public/patients')
@Public()
export class PatientPublicController {
  constructor(private readonly patientService: PatientService) {}

  /**
   * POST /api/public/patients/register
   * 
   * Patient self-registration endpoint (privacy-first).
   * 
   * Process:
   * 1. Patient enters their own information
   * 2. Patient record is created
   * 3. Patient user account is created (for portal access)
   * 4. Confirmation email is sent
   * 5. Patient receives credentials
   * 
   * Privacy Benefits:
   * - Patient controls their own data entry
   * - Front desk doesn't see sensitive information
   * - HIPAA compliance improved
   * - Reduced data entry errors
   * 
   * @param registerDto Patient registration data
   * @returns Patient record and account credentials
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async selfRegister(@Body() registerDto: SelfRegisterPatientDto) {
    try {
      return await this.patientService.selfRegister(registerDto);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      // Generic error for security (don't leak system details)
      throw new ConflictException(
        'Registration failed. Please check your information and try again.',
      );
    }
  }
}

