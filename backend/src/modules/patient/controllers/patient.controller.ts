import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  ParseIntPipe,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { PatientService } from '../services/patient.service';
import { CreatePatientDto } from '../dto/create-patient.dto';
import { UpdatePatientDto } from '../dto/update-patient.dto';
import { UpdatePatientSelfDto } from '../dto/update-patient-self.dto';
import { MergePatientDto } from '../dto/merge-patient.dto';
import { RestrictPatientDto } from '../dto/restrict-patient.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RlsGuard } from '../../../common/guards/rls.guard';
import { PermissionsGuard } from '../../../modules/auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../../modules/auth/decorators/permissions.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../../modules/auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../../modules/auth/services/identityContext.service';

@Controller('patients')
@UseGuards(RolesGuard, RlsGuard, PermissionsGuard)
@UseInterceptors(DataAccessLogInterceptor)
export class PatientController {
  constructor(private readonly patientService: PatientService) { }

  @Post()
  @Roles('ADMIN', 'NURSE', 'DOCTOR', 'FRONT_DESK')
  @Permissions('patients:*:write')
  create(
    @Body() createPatientDto: CreatePatientDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.patientService.create(createPatientDto, user);
  }

  @Get()
  @Roles('ADMIN', 'NURSE', 'DOCTOR', 'FRONT_DESK')
  @Permissions('patients:*:read')
  findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
    @CurrentUser() user?: UserIdentity,
  ) {
    // Parse optional query parameters
    const skipNum = skip ? parseInt(skip, 10) : undefined;
    const takeNum = take ? parseInt(take, 10) : undefined;

    // If search query provided, use search endpoint
    if (search) {
      return this.patientService.search(search, skipNum, takeNum);
    }

    // Filter by user's access (department, assigned cases, or ADMIN)
    return this.patientService.findAll(skipNum, takeNum, user?.id);
  }

  /**
   * Get current patient's profile
   * GET /api/v1/patients/me
   */
  @Get('me')
  @Roles('PATIENT', 'ADMIN', 'DOCTOR', 'NURSE', 'FRONT_DESK')
  @Permissions('patients:self:read')
  async getMyProfile(@CurrentUser() user: UserIdentity) {
    return this.patientService.getPatientByUserId(user.id, user.email);
  }

  /**
   * Update current patient's profile (self-service)
   * PATCH /api/v1/patients/me
   */
  @Patch('me')
  @Roles('PATIENT', 'ADMIN', 'DOCTOR', 'NURSE', 'FRONT_DESK')
  @Permissions('patients:self:write')
  async updateMyProfile(
    @Body() updateDto: UpdatePatientSelfDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.patientService.updatePatientSelf(user.id, user.email, updateDto);
  }

  @Get(':id')
  @Roles('ADMIN', 'NURSE', 'DOCTOR', 'FRONT_DESK')
  @Permissions('patients:*:read')
  // RlsGuard validates access to this patient
  findOne(
    @Param('id') id: string,
    @CurrentUser() user?: UserIdentity,
  ) {
    return this.patientService.findOne(id, user?.id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'NURSE', 'DOCTOR')
  @Permissions('patients:*:write')
  // RlsGuard validates access + modification rights
  update(
    @Param('id') id: string,
    @Body() updatePatientDto: UpdatePatientDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.patientService.update(id, updatePatientDto, user.id);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @Permissions('patients:*:delete')
  // RlsGuard validates access
  remove(
    @Param('id') id: string,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.patientService.remove(id, user.id);
  }

  /**
   * Merge two patients (duplicate resolution)
   * 
   * This is a sensitive operation that should only be performed by ADMIN users.
   * The source patient (duplicate) will be merged into the target patient (primary).
   * 
   * Process:
   * - Source patient is archived and marked as merged
   * - Merge history record is created for audit
   * - Domain event is emitted
   * 
   * @param id - Target patient ID (primary patient that will remain active)
   * @param mergeDto - Contains sourcePatientId and optional reason
   * @param user - Current user (must be ADMIN)
   */
  @Post(':id/merge')
  @Roles('ADMIN')
  @Permissions('patients:*:write')
  // RlsGuard validates access to both patients
  async merge(
    @Param('id') targetId: string,
    @Body() mergeDto: MergePatientDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.patientService.mergePatients(
      mergeDto.sourcePatientId,
      targetId,
      mergeDto.reason,
      user.id,
    );
  }

  /**
   * Restrict a patient (mark as privacy-sensitive)
   * 
   * This is a sensitive operation that should only be performed by ADMIN users.
   * Restricting a patient marks them as privacy-sensitive (VIP, celebrity, etc.).
   * 
   * Process:
   * - Patient is marked as restricted
   * - Reason is recorded for audit
   * - Domain event is emitted
   * 
   * @param id - Patient ID to restrict
   * @param restrictDto - Contains reason (required for audit)
   * @param user - Current user (must be ADMIN)
   */
  @Post(':id/restrict')
  @Roles('ADMIN')
  @Permissions('patients:*:write')
  // RlsGuard validates access
  async restrict(
    @Param('id') id: string,
    @Body() restrictDto: RestrictPatientDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.patientService.restrictPatient(id, restrictDto.reason, user.id);
  }

  /**
   * Unrestrict a patient (remove privacy restriction)
   * 
   * This is a sensitive operation that should only be performed by ADMIN users.
   * Unrestricting a patient removes the privacy-sensitive flag.
   * 
   * Process:
   * - Patient restriction is removed
   * - Audit fields are cleared
   * - Domain event is emitted
   * 
   * @param id - Patient ID to unrestrict
   * @param user - Current user (must be ADMIN)
   */
  @Post(':id/unrestrict')
  @Roles('ADMIN')
  @Permissions('patients:*:write')
  // RlsGuard validates access
  async unrestrict(
    @Param('id') id: string,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.patientService.unrestrictPatient(id, user.id);
  }

  /**
   * GET /api/v1/patients/:id/consents
   * Get all consents for a patient
   * Patient-centric consent retrieval with role-based sanitization
   */
  @Get(':id/consents')
  @Roles('ADMIN', 'DOCTOR', 'NURSE', 'FRONT_DESK')
  @Permissions('patients:*:read', 'consent:*:read')
  async getConsents(
    @Param('id') id: string,
    @Query('includeArchived') includeArchived?: string,
    @CurrentUser() user?: UserIdentity,
  ) {
    return this.patientService.getConsentsByPatient(
      id,
      user?.id || '',
      includeArchived === 'true',
    );
  }

  /**
   * GET /api/v1/patients/:id/consents/active
   * Get active consents for a patient
   */
  @Get(':id/consents/active')
  @Roles('ADMIN', 'DOCTOR', 'NURSE', 'FRONT_DESK')
  @Permissions('patients:*:read', 'consent:*:read')
  async getActiveConsents(
    @Param('id') id: string,
    @CurrentUser() user?: UserIdentity,
  ) {
    return this.patientService.getActiveConsents(id, user?.id || '');
  }

  /**
   * GET /api/v1/patients/:id/consents/revoked
   * Get revoked consents for a patient
   */
  @Get(':id/consents/revoked')
  @Roles('ADMIN', 'DOCTOR', 'NURSE')
  @Permissions('patients:*:read', 'consent:*:read')
  async getRevokedConsents(
    @Param('id') id: string,
    @CurrentUser() user?: UserIdentity,
  ) {
    return this.patientService.getRevokedConsents(id, user?.id || '');
  }
}

