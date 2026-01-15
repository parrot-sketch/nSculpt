import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  ParseIntPipe,
  Optional,
} from '@nestjs/common';
import { ConsultationService } from '../services/consultation.service';
import { CreateConsultationDto } from '../dto/create-consultation.dto';
import { UpdateConsultationDto } from '../dto/update-consultation.dto';
import { FinalizePlanDto } from '../dto/finalize-plan.dto';
import { ScheduleFollowUpDto } from '../dto/schedule-follow-up.dto';
import { ReferConsultationDto } from '../dto/refer-consultation.dto';
import { OverrideStateDto } from '../dto/override-state.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RlsGuard } from '../../../common/guards/rls.guard';
import { PermissionsGuard } from '../../../modules/auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../../modules/auth/decorators/permissions.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../../modules/auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../../modules/auth/services/identityContext.service';
import { ConsultationStatus } from '../types/consultation-status';

@Controller('consultations')
@UseGuards(RolesGuard, RlsGuard, PermissionsGuard)
@UseInterceptors(DataAccessLogInterceptor)
export class ConsultationController {
  constructor(private readonly consultationService: ConsultationService) { }

  /**
   * Create a new consultation
   * Only ADMIN and FRONT_DESK can create consultations
   */
  @Post()
  @Roles('ADMIN', 'FRONT_DESK')
  @Permissions('consultations:*:write')
  create(
    @Body() createConsultationDto: CreateConsultationDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.consultationService.createConsultation(
      createConsultationDto,
      user.id,
    );
  }

  /**
   * Get all consultations with pagination
   */
  @Get()
  @Roles('ADMIN', 'FRONT_DESK', 'NURSE', 'DOCTOR', 'SURGEON')
  @Permissions('consultations:*:read')
  findAll(
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('patientId') patientId?: string,
    @Query('doctorId') doctorId?: string,
    @Query('status') status?: ConsultationStatus,
    @CurrentUser() user?: UserIdentity,
  ) {
    return this.consultationService.findAll(
      skip ? Number(skip) : undefined,
      take ? Number(take) : undefined,
      {
        patientId,
        doctorId,
        status,
      },
      user?.id,
    );
  }

  /**
   * Get a single consultation by ID
   */
  @Get(':id')
  @Roles('ADMIN', 'FRONT_DESK', 'NURSE', 'DOCTOR', 'SURGEON')
  @Permissions('consultations:*:read')
  findOne(@Param('id') id: string, @CurrentUser() user?: UserIdentity) {
    return this.consultationService.findOne(id, user?.id);
  }

  /**
   * Update consultation details
   */
  @Patch(':id')
  @Roles('ADMIN', 'DOCTOR', 'SURGEON')
  @Permissions('consultations:*:write')
  update(
    @Param('id') id: string,
    @Body() updateConsultationDto: UpdateConsultationDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.consultationService.update(id, updateConsultationDto, user.id);
  }

  /**
   * Check in patient
   * Transitions from SCHEDULED to CHECKED_IN
   * Creates billing entry for consultation fee
   */
  @Post(':id/check-in')
  @Roles('ADMIN', 'FRONT_DESK')
  @Permissions('consultations:*:write')
  checkIn(@Param('id') id: string, @CurrentUser() user: UserIdentity) {
    return this.consultationService.checkIn(id, user.id);
  }

  /**
   * Start triage
   * Transitions from CHECKED_IN to IN_TRIAGE
   */
  @Post(':id/triage')
  @Roles('ADMIN', 'NURSE')
  @Permissions('consultations:*:write')
  startTriage(@Param('id') id: string, @CurrentUser() user: UserIdentity) {
    return this.consultationService.startTriage(id, user.id);
  }

  /**
   * Start consultation
   * Transitions from IN_TRIAGE to IN_CONSULTATION
   */
  @Post(':id/start')
  @Roles('ADMIN', 'DOCTOR', 'SURGEON')
  @Permissions('consultations:*:write')
  startConsultation(@Param('id') id: string, @CurrentUser() user: UserIdentity) {
    return this.consultationService.startConsultation(id, user.id);
  }

  /**
   * Finalize plan
   * Transitions from IN_CONSULTATION to PLAN_CREATED
   */
  @Post(':id/plan')
  @Roles('ADMIN', 'DOCTOR', 'SURGEON')
  @Permissions('consultations:*:write')
  finalizePlan(
    @Param('id') id: string,
    @Body() finalizePlanDto: FinalizePlanDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.consultationService.finalizePlan(id, finalizePlanDto, user.id);
  }

  /**
   * Close consultation
   * Transitions from PLAN_CREATED to CLOSED
   */
  @Post(':id/close')
  @Roles('ADMIN', 'DOCTOR', 'SURGEON')
  @Permissions('consultations:*:write')
  closeConsultation(@Param('id') id: string, @CurrentUser() user: UserIdentity) {
    return this.consultationService.closeConsultation(id, user.id);
  }

  /**
   * Schedule follow-up
   * Transitions from PLAN_CREATED to FOLLOW_UP
   */
  @Post(':id/follow-up')
  @Roles('ADMIN', 'DOCTOR', 'SURGEON')
  @Permissions('consultations:*:write')
  scheduleFollowUp(
    @Param('id') id: string,
    @Body() scheduleFollowUpDto: ScheduleFollowUpDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.consultationService.scheduleFollowUp(
      id,
      scheduleFollowUpDto,
      user.id,
    );
  }

  /**
   * Refer patient
   * Transitions from PLAN_CREATED to REFERRED
   */
  @Post(':id/refer')
  @Roles('ADMIN', 'DOCTOR', 'SURGEON')
  @Permissions('consultations:*:write')
  referPatient(
    @Param('id') id: string,
    @Body() referConsultationDto: ReferConsultationDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.consultationService.referPatient(
      id,
      referConsultationDto,
      user.id,
    );
  }

  /**
   * Schedule surgery request
   * Transitions from PLAN_CREATED to SURGERY_SCHEDULED
   */
  @Post(':id/schedule-surgery')
  @Roles('ADMIN', 'DOCTOR', 'SURGEON')
  @Permissions('consultations:*:write')
  scheduleSurgeryRequest(
    @Param('id') id: string,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.consultationService.scheduleSurgeryRequest(id, user.id);
  }

  /**
   * Override state (ADMIN only)
   * Allows ADMIN to bypass state machine rules
   * Must be audited
   */
  @Post(':id/override-state')
  @Roles('ADMIN')
  @Permissions('consultations:*:write')
  overrideState(
    @Param('id') id: string,
    @Body() overrideStateDto: OverrideStateDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.consultationService.overrideState(id, overrideStateDto, user.id);
  }

  /**
   * Archive consultation (soft delete)
   */
  @Post(':id/archive')
  @Roles('ADMIN')
  @Permissions('consultations:*:delete')
  archive(@Param('id') id: string, @CurrentUser() user: UserIdentity) {
    return this.consultationService.archive(id, user.id);
  }

  /**
   * Get consultations with outcomes for a patient
   * Returns consultations that have been finalized (have consultationOutcome)
   */
  @Get('patient/:patientId/outcomes')
  @Roles('ADMIN', 'FRONT_DESK', 'NURSE', 'DOCTOR', 'SURGEON', 'PATIENT')
  @Permissions('consultations:*:read')
  getConsultationOutcomes(
    @Param('patientId') patientId: string,
    @CurrentUser() user?: UserIdentity,
  ) {
    return this.consultationService.getConsultationOutcomes(patientId, user?.id);
  }
}




