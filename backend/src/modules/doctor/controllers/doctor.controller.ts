import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  ParseIntPipe,
} from '@nestjs/common';
import { DoctorService } from '../services/doctor.service';
import { AssignPatientDto, UnassignPatientDto } from '../dto/assign-patient.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RlsGuard } from '../../../common/guards/rls.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../auth/services/identityContext.service';

/**
 * Doctor Controller
 * 
 * Handles doctor-specific endpoints:
 * - Profile management
 * - Patient assignments
 * - Dashboard statistics
 * - Consultations
 * - Surgeries
 */
@Controller('doctors')
@UseGuards(RolesGuard, RlsGuard, PermissionsGuard)
@UseInterceptors(DataAccessLogInterceptor)
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) { }

  /**
   * GET /api/v1/doctors/profile
   * Get current doctor's profile
   */
  @Get('profile')
  @Roles('DOCTOR', 'SURGEON')
  @Permissions('medical_records:read')
  getProfile(@CurrentUser() user: UserIdentity) {
    return this.doctorService.getProfile(user.id);
  }

  /**
   * GET /api/v1/doctors
   * Get all doctors
   */
  @Get()
  @Roles('ADMIN', 'DOCTOR', 'SURGEON', 'NURSE', 'FRONT_DESK', 'PATIENT')
  @Permissions('doctors:read')
  getAllDoctors(@CurrentUser() user: UserIdentity) {
    return this.doctorService.getAllDoctors(user.id);
  }

  /**
   * GET /api/v1/doctors/patients
   * Get assigned patients
   */
  @Get('patients')
  @Roles('DOCTOR', 'SURGEON')
  @Permissions('patients:*:read')
  getAssignedPatients(
    @CurrentUser() user: UserIdentity,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const skipNum = skip ? parseInt(skip, 10) : undefined;
    const takeNum = take ? parseInt(take, 10) : undefined;
    return this.doctorService.getAssignedPatients(user.id, skipNum, takeNum);
  }

  /**
   * GET /api/v1/doctors/consultations
   * Get doctor's consultations
   */
  @Get('consultations')
  @Roles('DOCTOR', 'SURGEON')
  @Permissions('medical_records:read')
  getConsultations(
    @CurrentUser() user: UserIdentity,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const skipNum = skip ? parseInt(skip, 10) : undefined;
    const takeNum = take ? parseInt(take, 10) : undefined;
    return this.doctorService.getConsultations(user.id, skipNum, takeNum);
  }

  /**
   * GET /api/v1/doctors/surgeries
   * Get upcoming surgeries
   */
  @Get('surgeries')
  @Roles('DOCTOR', 'SURGEON')
  @Permissions('theater:read')
  getUpcomingSurgeries(@CurrentUser() user: UserIdentity) {
    return this.doctorService.getUpcomingSurgeries(user.id);
  }

  /**
   * GET /api/v1/doctors/dashboard/stats
   * Get dashboard statistics
   */
  @Get('dashboard/stats')
  @Roles('DOCTOR', 'SURGEON')
  @Permissions('medical_records:read')
  getDashboardStats(@CurrentUser() user: UserIdentity) {
    return this.doctorService.getDashboardStats(user.id);
  }

  /**
   * POST /api/v1/doctors/patients/assign
   * Assign patient to doctor
   */
  @Post('patients/assign')
  @Roles('DOCTOR', 'SURGEON', 'ADMIN', 'NURSE')
  @Permissions('patients:*:write')
  assignPatient(
    @Body() assignDto: AssignPatientDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.doctorService.assignPatient(assignDto, user.id);
  }

  /**
   * POST /api/v1/doctors/patients/unassign
   * Unassign patient from doctor
   */
  @Post('patients/unassign')
  @Roles('DOCTOR', 'SURGEON', 'ADMIN')
  @Permissions('patients:*:write')
  unassignPatient(
    @Body() unassignDto: UnassignPatientDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.doctorService.unassignPatient(unassignDto, user.id);
  }
}

