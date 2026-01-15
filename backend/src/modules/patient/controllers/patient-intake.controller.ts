import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { PatientIntakeService } from '../services/patient-intake.service';
import { CreatePatientIntakeDto } from '../dto/create-patient-intake.dto';
import { UpdatePatientIntakeDto } from '../dto/update-patient-intake.dto';
import { SubmitPatientIntakeDto } from '../dto/submit-patient-intake.dto';
import { VerifyPatientIntakeDto } from '../dto/verify-patient-intake.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RlsGuard } from '../../../common/guards/rls.guard';
import { PermissionsGuard } from '../../../modules/auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../../modules/auth/decorators/permissions.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../../modules/auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../../modules/auth/services/identityContext.service';

/**
 * Patient Intake Controller
 * 
 * Clinical Intent: Manages patient intake form workflow
 * 
 * All endpoints are intent-based (not generic CRUD):
 * - POST /patients/:id/intake/start - Patient begins filling out intake forms
 * - PATCH /patients/:id/intake/:intakeId - Patient saves progress
 * - POST /patients/:id/intake/:intakeId/submit - Patient submits completed forms
 * - POST /patients/:id/intake/:intakeId/verify - Staff verifies intake forms
 */
@Controller('patients/:patientId/intake')
@UseGuards(RolesGuard, RlsGuard, PermissionsGuard)
@UseInterceptors(DataAccessLogInterceptor)
export class PatientIntakeController {
  constructor(private readonly intakeService: PatientIntakeService) { }

  /**
   * Start Intake (Clinical Intent: Patient begins filling out intake forms)
   * 
   * POST /patients/:patientId/intake/start
   * 
   * Workflow:
   * 1. Patient creates intake record with initial data
   * 2. Lifecycle transitions: VERIFIED → INTAKE_IN_PROGRESS
   * 
   * Authorization: PATIENT (their own intake) or ADMIN/NURSE (on behalf of patient)
   */
  @Post('start')
  @Roles('PATIENT', 'ADMIN', 'NURSE')
  @Permissions('patients:*:write')
  async startIntake(
    @Param('patientId') patientId: string,
    @Body() createDto: CreatePatientIntakeDto,
    @CurrentUser() user: UserIdentity,
    @Req() request: Request,
  ) {
    // Determine actor role from user's actual roles
    const actorRole = user.roles?.[0] || 'PATIENT';

    // Extract IP and user agent from request
    const context = {
      ipAddress: request.ip || (request.headers['x-forwarded-for'] as string) || undefined,
      userAgent: request.headers['user-agent'] || undefined,
    };

    return this.intakeService.startIntake(
      patientId,
      createDto,
      {
        userId: user.id,
        role: actorRole,
      },
      context,
    );
  }

  /**
   * Save Draft (Clinical Intent: Patient saves progress on intake forms)
   * 
   * PATCH /patients/:patientId/intake/:intakeId
   * 
   * Workflow:
   * 1. Patient updates intake record with new data
   * 2. Status changes to IN_PROGRESS if was DRAFT
   * 3. NO lifecycle transition (stays in INTAKE_IN_PROGRESS)
   * 
   * Authorization: PATIENT (their own intake) or ADMIN/NURSE (on behalf of patient)
   */
  @Patch(':intakeId')
  @Roles('PATIENT', 'ADMIN', 'NURSE')
  @Permissions('patients:*:write')
  async saveDraft(
    @Param('patientId') patientId: string,
    @Param('intakeId') intakeId: string,
    @Body() updateDto: UpdatePatientIntakeDto,
    @CurrentUser() user: UserIdentity,
    @Req() request: Request,
  ) {
    const actorRole = user.roles?.[0] || 'PATIENT';

    const context = {
      ipAddress: request.ip || (request.headers['x-forwarded-for'] as string) || undefined,
      userAgent: request.headers['user-agent'] || undefined,
    };

    return this.intakeService.saveDraft(
      patientId,
      intakeId,
      updateDto,
      {
        userId: user.id,
        role: actorRole,
      },
      context,
    );
  }

  /**
   * Submit Intake (Clinical Intent: Patient submits completed intake forms for staff review)
   * 
   * POST /patients/:patientId/intake/:intakeId/submit
   * 
   * Workflow:
   * 1. Patient marks intake as COMPLETED
   * 2. Lifecycle transitions: INTAKE_IN_PROGRESS → INTAKE_COMPLETED
   * 
   * Authorization: PATIENT (their own intake) or ADMIN (on behalf of patient)
   */
  @Post(':intakeId/submit')
  @Roles('PATIENT', 'ADMIN')
  @Permissions('patients:*:write')
  async submitIntake(
    @Param('patientId') patientId: string,
    @Param('intakeId') intakeId: string,
    @Body() submitDto: SubmitPatientIntakeDto,
    @CurrentUser() user: UserIdentity,
    @Req() request: Request,
  ) {
    const actorRole = user.roles?.[0] || 'PATIENT';

    const context = {
      ipAddress: request.ip || (request.headers['x-forwarded-for'] as string) || undefined,
      userAgent: request.headers['user-agent'] || undefined,
    };

    return this.intakeService.submitIntake(
      patientId,
      intakeId,
      submitDto,
      {
        userId: user.id,
        role: actorRole,
      },
      context,
    );
  }

  /**
   * Verify Intake (Clinical Intent: Nurse/Admin reviews and verifies intake forms)
   * 
   * POST /patients/:patientId/intake/:intakeId/verify
   * 
   * Workflow:
   * 1. Staff marks intake as VERIFIED
   * 2. Lifecycle transitions: INTAKE_COMPLETED → INTAKE_VERIFIED
   * 
   * Authorization: NURSE or ADMIN only
   */
  @Post(':intakeId/verify')
  @Roles('NURSE', 'ADMIN')
  @Permissions('patients:*:write')
  async verifyIntake(
    @Param('patientId') patientId: string,
    @Param('intakeId') intakeId: string,
    @Body() verifyDto: VerifyPatientIntakeDto,
    @CurrentUser() user: UserIdentity,
    @Req() request: Request,
  ) {
    const actorRole = user.roles?.[0] || 'NURSE';

    const context = {
      ipAddress: request.ip || (request.headers['x-forwarded-for'] as string) || undefined,
      userAgent: request.headers['user-agent'] || undefined,
    };

    return this.intakeService.verifyIntake(
      patientId,
      intakeId,
      verifyDto,
      {
        userId: user.id,
        role: actorRole,
      },
      context,
    );
  }

  /**
   * Get Active Intake (Clinical Intent: Get current active intake for patient)
   * 
   * GET /patients/:patientId/intake/active
   * 
   * Returns the current active intake (DRAFT or IN_PROGRESS) for the patient.
   */
  @Get('active')
  @Roles('PATIENT', 'ADMIN', 'NURSE', 'DOCTOR')
  @Permissions('patients:*:read')
  async getActiveIntake(@Param('patientId') patientId: string) {
    const activeIntake = await this.intakeService.getActiveIntake(patientId);
    if (!activeIntake) {
      return { data: null, message: 'No active intake found for patient' };
    }
    return { data: activeIntake };
  }

  /**
   * Get Intake by ID (Clinical Intent: Get specific intake record)
   * 
   * GET /patients/:patientId/intake/:intakeId
   */
  @Get(':intakeId')
  @Roles('PATIENT', 'ADMIN', 'NURSE', 'DOCTOR')
  @Permissions('patients:*:read')
  async getIntakeById(
    @Param('patientId') patientId: string,
    @Param('intakeId') intakeId: string,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.intakeService.getIntakeById(intakeId, {
      userId: user.id,
      role: user.roles?.[0] || 'PATIENT',
    });
  }

  /**
   * Get Intake History (Clinical Intent: Get all intake records for patient)
   * 
   * GET /patients/:patientId/intake/history?skip=0&take=50
   */
  @Get('history')
  @Roles('PATIENT', 'ADMIN', 'NURSE', 'DOCTOR')
  @Permissions('patients:*:read')
  async getIntakeHistory(
    @Param('patientId') patientId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const skipNum = skip ? parseInt(skip, 10) : undefined;
    const takeNum = take ? parseInt(take, 10) : undefined;

    if (skipNum !== undefined && (isNaN(skipNum) || skipNum < 0)) {
      throw new Error('skip must be a non-negative integer');
    }

    if (takeNum !== undefined && (isNaN(takeNum) || takeNum < 1 || takeNum > 1000)) {
      throw new Error('take must be between 1 and 1000');
    }

    return this.intakeService.getIntakeHistory(patientId, skipNum, takeNum);
  }
}
