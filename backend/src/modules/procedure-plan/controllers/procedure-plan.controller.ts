import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProcedurePlanService } from '../services/procedure-plan.service';
import { CreateProcedurePlanDto } from '../dto/create-procedure-plan.dto';
import { UpdateProcedurePlanDto } from '../dto/update-procedure-plan.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../auth/services/identityContext.service';

@Controller('procedure-plans')
@UseGuards(RolesGuard, PermissionsGuard)
export class ProcedurePlanController {
  constructor(private readonly procedurePlanService: ProcedurePlanService) { }

  @Post()
  @Roles('ADMIN', 'DOCTOR', 'NURSE')
  @Permissions('procedure_plans:*:write')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateProcedurePlanDto, @CurrentUser() user: UserIdentity) {
    return await this.procedurePlanService.createPlan(createDto, user.id);
  }

  @Get(':id')
  @Roles('ADMIN', 'DOCTOR', 'NURSE', 'PATIENT')
  @Permissions('procedure_plans:*:read', 'procedure_plans:self:read')
  async findOne(@Param('id') id: string, @CurrentUser() user: UserIdentity) {
    return await this.procedurePlanService.findOne(id, user.id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'DOCTOR')
  @Permissions('procedure_plans:*:write')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateProcedurePlanDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return await this.procedurePlanService.updatePlan(id, updateDto, user.id);
  }

  @Post(':id/approve')
  @Roles('ADMIN', 'DOCTOR')
  @Permissions('procedure_plans:*:write')
  @HttpCode(HttpStatus.OK)
  async approve(@Param('id') id: string, @CurrentUser() user: UserIdentity) {
    return await this.procedurePlanService.approvePlan(id, user.id);
  }

  @Post(':id/schedule')
  @Roles('ADMIN', 'DOCTOR')
  @Permissions('procedure_plans:*:write')
  @HttpCode(HttpStatus.OK)
  async schedule(
    @Param('id') id: string,
    @Body() body: { appointmentId: string },
    @CurrentUser() user: UserIdentity,
  ) {
    return await this.procedurePlanService.schedulePlan(id, body.appointmentId, user.id);
  }

  @Post(':id/complete-session')
  @Roles('ADMIN', 'DOCTOR', 'NURSE')
  @Permissions('procedure_plans:*:write')
  @HttpCode(HttpStatus.OK)
  async completeSession(
    @Param('id') id: string,
    @Body() body: { sessionNumber: number },
    @CurrentUser() user: UserIdentity,
  ) {
    return await this.procedurePlanService.completeSession(id, body.sessionNumber, user.id);
  }

  @Post(':id/complete')
  @Roles('ADMIN', 'DOCTOR', 'NURSE')
  @Permissions('procedure_plans:*:write')
  @HttpCode(HttpStatus.OK)
  async complete(@Param('id') id: string, @CurrentUser() user: UserIdentity) {
    return await this.procedurePlanService.completePlan(id, user.id);
  }

  @Get('consultation/:consultationId')
  @Roles('ADMIN', 'DOCTOR', 'NURSE', 'PATIENT')
  @Permissions('procedure_plans:*:read', 'procedure_plans:self:read')
  async findByConsultation(
    @Param('consultationId') consultationId: string,
    @CurrentUser() user: UserIdentity,
  ) {
    return await this.procedurePlanService.findByConsultation(consultationId, user.id);
  }

  @Get('patient/:patientId')
  @Roles('ADMIN', 'DOCTOR', 'NURSE', 'PATIENT')
  @Permissions('procedure_plans:*:read', 'procedure_plans:self:read')
  async findByPatient(
    @Param('patientId') patientId: string,
    @CurrentUser() user: UserIdentity,
  ) {
    return await this.procedurePlanService.findByPatient(patientId, user.id);
  }
}
