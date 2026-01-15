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
import { FollowUpPlanService } from '../services/follow-up-plan.service';
import { CreateFollowUpPlanDto } from '../dto/create-follow-up-plan.dto';
import { UpdateFollowUpPlanDto } from '../dto/update-follow-up-plan.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../auth/services/identityContext.service';

@Controller('follow-up-plans')
@UseGuards(RolesGuard, PermissionsGuard)
export class FollowUpPlanController {
  constructor(private readonly followUpPlanService: FollowUpPlanService) { }

  @Post()
  @Roles('ADMIN', 'DOCTOR', 'NURSE')
  @Permissions('follow_up_plans:*:write')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateFollowUpPlanDto, @CurrentUser() user: UserIdentity) {
    return await this.followUpPlanService.createFollowUp(createDto, user.id);
  }

  @Get(':id')
  @Roles('ADMIN', 'DOCTOR', 'NURSE', 'PATIENT')
  @Permissions('follow_up_plans:*:read', 'follow_up_plans:self:read')
  async findOne(@Param('id') id: string, @CurrentUser() user: UserIdentity) {
    return await this.followUpPlanService.findOne(id, user.id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'DOCTOR')
  @Permissions('follow_up_plans:*:write')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateFollowUpPlanDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return await this.followUpPlanService.scheduleFollowUp(id, updateDto.appointmentId!, user.id);
  }

  @Post(':id/schedule')
  @Roles('ADMIN', 'DOCTOR')
  @Permissions('follow_up_plans:*:write')
  @HttpCode(HttpStatus.OK)
  async schedule(
    @Param('id') id: string,
    @Body() body: { appointmentId: string },
    @CurrentUser() user: UserIdentity,
  ) {
    return await this.followUpPlanService.scheduleFollowUp(id, body.appointmentId, user.id);
  }

  @Post(':id/complete')
  @Roles('ADMIN', 'DOCTOR', 'NURSE')
  @Permissions('follow_up_plans:*:write')
  @HttpCode(HttpStatus.OK)
  async complete(@Param('id') id: string, @CurrentUser() user: UserIdentity) {
    return await this.followUpPlanService.completeFollowUp(id, user.id);
  }

  @Get('consultation/:consultationId')
  @Roles('ADMIN', 'DOCTOR', 'NURSE', 'PATIENT')
  @Permissions('follow_up_plans:*:read', 'follow_up_plans:self:read')
  async findByConsultation(
    @Param('consultationId') consultationId: string,
    @CurrentUser() user: UserIdentity,
  ) {
    return await this.followUpPlanService.findByConsultation(consultationId, user.id);
  }

  @Get('patient/:patientId')
  @Roles('ADMIN', 'DOCTOR', 'NURSE', 'PATIENT')
  @Permissions('follow_up_plans:*:read', 'follow_up_plans:self:read')
  async findByPatient(
    @Param('patientId') patientId: string,
    @CurrentUser() user: UserIdentity,
  ) {
    return await this.followUpPlanService.findByPatient(patientId, user.id);
  }
}
