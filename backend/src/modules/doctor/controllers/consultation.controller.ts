/**
 * Consultation Controller
 * 
 * REST API endpoints for doctor consultation management.
 * 
 * @presentation-layer
 */

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
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RlsGuard } from '../../../common/guards/rls.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../auth/services/identityContext.service';
import { CreateConsultationUseCase } from '../application/use-cases/create-consultation.use-case';
import { UpdateConsultationUseCase } from '../application/use-cases/update-consultation.use-case';
import { CompleteConsultationUseCase } from '../application/use-cases/complete-consultation.use-case';
import { GetConsultationQuery } from '../application/queries/get-consultation.query';
import { ListConsultationsQuery } from '../application/queries/list-consultations.query';
import { CreateConsultationDto } from '../application/dtos/create-consultation.dto';
import { UpdateConsultationDto } from '../application/dtos/update-consultation.dto';
import { CompleteConsultationDto } from '../application/dtos/complete-consultation.dto';

/**
 * Consultation Controller
 * 
 * Handles consultation CRUD operations for doctors.
 * All endpoints require DOCTOR or SURGEON role.
 */
@Controller('doctor/consultations')
@UseGuards(RolesGuard, RlsGuard, PermissionsGuard)
@UseInterceptors(DataAccessLogInterceptor)
@Roles('DOCTOR', 'SURGEON')
@Permissions('medical_records:*:read', 'medical_records:*:write')
export class ConsultationController {
  constructor(
    private readonly createConsultationUseCase: CreateConsultationUseCase,
    private readonly updateConsultationUseCase: UpdateConsultationUseCase,
    private readonly completeConsultationUseCase: CompleteConsultationUseCase,
    private readonly getConsultationQuery: GetConsultationQuery,
    private readonly listConsultationsQuery: ListConsultationsQuery,
  ) {}

  /**
   * POST /api/v1/doctor/consultations
   * Create a new consultation from a confirmed appointment
   */
  @Post()
  @Permissions('medical_records:*:write')
  async create(
    @Body() createDto: CreateConsultationDto,
    @CurrentUser() user: UserIdentity,
  ) {
    // Get doctor ID from user (assuming user.id is the doctor's user ID)
    const doctorId = user.id;
    return this.createConsultationUseCase.execute(createDto, doctorId, user.id);
  }

  /**
   * GET /api/v1/doctor/consultations
   * List consultations with pagination and filters
   */
  @Get()
  @Permissions('medical_records:*:read')
  async findAll(
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
    @Query('patientId') patientId?: string,
    @Query('status') status?: string,
    @CurrentUser() user?: UserIdentity,
  ) {
    return this.listConsultationsQuery.execute({
      skip,
      take,
      doctorId: user?.id,
      patientId,
      status,
    });
  }

  /**
   * GET /api/v1/doctor/consultations/:id
   * Get consultation by ID
   */
  @Get(':id')
  @Permissions('medical_records:*:read')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.getConsultationQuery.execute(id, user.id);
  }

  /**
   * PATCH /api/v1/doctor/consultations/:id
   * Update consultation clinical findings
   */
  @Patch(':id')
  @Permissions('medical_records:*:write')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateConsultationDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.updateConsultationUseCase.execute(id, updateDto, user.id);
  }

  /**
   * POST /api/v1/doctor/consultations/:id/complete
   * Complete consultation with final diagnosis
   */
  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @Permissions('medical_records:*:write')
  async complete(
    @Param('id') id: string,
    @Body() completeDto: CompleteConsultationDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.completeConsultationUseCase.execute(id, completeDto, user.id);
  }
}
