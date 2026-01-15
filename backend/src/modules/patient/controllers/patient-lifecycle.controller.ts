import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  ParseIntPipe,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { PatientLifecycleService } from '../domain/services/patient-lifecycle.service';
import { PatientLifecycleState } from '../domain/patient-lifecycle-state.enum';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RlsGuard } from '../../../common/guards/rls.guard';
import { PermissionsGuard } from '../../../modules/auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../../modules/auth/decorators/permissions.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../../modules/auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../../modules/auth/services/identityContext.service';
import { LifecycleTransitionContext } from '../domain/services/patient-lifecycle.service';

/**
 * DTO for lifecycle transition request
 */
export class TransitionPatientDto {
  targetState: PatientLifecycleState;
  reason?: string;
  consultationId?: string;
  appointmentId?: string;
  consentId?: string;
  procedurePlanId?: string;
  surgicalCaseId?: string;
  [key: string]: any;
}

@Controller('patients/:id/lifecycle')
@UseGuards(RolesGuard, RlsGuard, PermissionsGuard)
@UseInterceptors(DataAccessLogInterceptor)
export class PatientLifecycleController {
  constructor(
    private readonly lifecycleService: PatientLifecycleService,
  ) { }

  /**
   * Transition patient to a new lifecycle state
   * 
   * POST /patients/:id/lifecycle/transition
   * 
   * This is the ONLY endpoint that should be used to change patient lifecycle state.
   * All validations, authorizations, and side effects are handled in PatientLifecycleService.
   * 
   * CRITICAL: This endpoint uses atomic transactions to ensure:
   * - State update
   * - Transition history record
   * - Domain event creation
   * - Audit log write
   * are all atomic (all succeed or all fail).
   * 
   * Optimistic locking prevents concurrent state corruption.
   */
  @Post('transition')
  @Roles('ADMIN', 'DOCTOR', 'NURSE', 'PATIENT')
  @Permissions('patients:*:write')
  async transition(
    @Param('id') patientId: string,
    @Body() transitionDto: TransitionPatientDto,
    @CurrentUser() user: UserIdentity,
    @Req() request: Request,
  ) {
    // Validate target state
    if (!transitionDto.targetState) {
      throw new BadRequestException('targetState is required');
    }

    // Build context from request body and request headers
    const context: LifecycleTransitionContext = {
      reason: transitionDto.reason,
      consultationId: transitionDto.consultationId,
      appointmentId: transitionDto.appointmentId,
      consentId: transitionDto.consentId,
      procedurePlanId: transitionDto.procedurePlanId,
      surgicalCaseId: transitionDto.surgicalCaseId,
      ipAddress: request.ip || request.headers['x-forwarded-for'] as string || undefined,
      userAgent: request.headers['user-agent'] || undefined,
    };

    // Determine actor role from user's actual roles (first role for simplicity)
    // The service will validate this against RBAC
    const actorRole = user.roles?.[0] || 'PATIENT';

    // Perform transition (atomic transaction)
    await this.lifecycleService.transitionPatient(
      patientId,
      transitionDto.targetState,
      {
        userId: user.id,
        role: actorRole,
      },
      context,
    );

    return {
      success: true,
      message: `Patient ${patientId} transitioned to ${transitionDto.targetState}`,
    };
  }

  /**
   * Get current lifecycle state for a patient
   * 
   * GET /patients/:id/lifecycle/state
   */
  @Get('state')
  @Roles('ADMIN', 'DOCTOR', 'NURSE', 'PATIENT')
  @Permissions('patients:*:read')
  async getCurrentState(@Param('id') patientId: string) {
    const state = await this.lifecycleService.getCurrentState(patientId);
    return {
      patientId,
      currentState: state,
    };
  }

  /**
   * Get lifecycle history for a patient
   * 
   * GET /patients/:id/lifecycle/history?skip=0&take=100
   * 
   * Returns the complete audit trail of lifecycle transitions for clinical defensibility.
   * This is the source of truth for patient lifecycle history.
   */
  @Get('history')
  @Roles('ADMIN', 'DOCTOR', 'NURSE')
  @Permissions('patients:*:read')
  async getHistory(
    @Param('id') patientId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const skipNum = skip ? parseInt(skip, 10) : undefined;
    const takeNum = take ? parseInt(take, 10) : undefined;

    if (skipNum !== undefined && (isNaN(skipNum) || skipNum < 0)) {
      throw new BadRequestException('skip must be a non-negative integer');
    }

    if (takeNum !== undefined && (isNaN(takeNum) || takeNum < 1 || takeNum > 1000)) {
      throw new BadRequestException('take must be between 1 and 1000');
    }

    return this.lifecycleService.getLifecycleHistory(patientId, skipNum, takeNum);
  }

  /**
   * Get allowed next states for a patient
   * 
   * GET /patients/:id/lifecycle/allowed-transitions
   * 
   * Returns all states that the patient can transition to from their current state.
   * This is useful for UI to show available actions.
   */
  @Get('allowed-transitions')
  @Roles('ADMIN', 'DOCTOR', 'NURSE', 'PATIENT')
  @Permissions('patients:*:read')
  async getAllowedTransitions(
    @Param('id') patientId: string,
    @CurrentUser() user: UserIdentity,
  ) {
    const allowedStates = await this.lifecycleService.getAllowedNextStates(patientId);
    const currentState = await this.lifecycleService.getCurrentState(patientId);

    return {
      patientId,
      currentState,
      allowedTransitions: allowedStates,
    };
  }
}
