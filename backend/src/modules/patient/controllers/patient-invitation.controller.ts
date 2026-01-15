import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { PatientInvitationService } from '../services/patient-invitation.service';
import { AcceptInvitationDto } from '../dto/accept-invitation.dto';
import { ValidateInvitationDto } from '../dto/validate-invitation.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RlsGuard } from '../../../common/guards/rls.guard';
import { PermissionsGuard } from '../../../modules/auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../../modules/auth/decorators/permissions.decorator';
import { Public } from '../../../modules/auth/decorators/public.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../../modules/auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../../modules/auth/services/identityContext.service';

/**
 * Patient Invitation Controller
 * 
 * Handles the patient invitation workflow for admin-created patients.
 * 
 * Endpoints:
 * - POST /patients/:id/invite - Admin sends invitation
 * - POST /patients/:id/invite/resend - Admin resends invitation
 * - DELETE /patients/:id/invite - Admin cancels invitation
 * - POST /patients/invitations/validate - Validate token (public)
 * - POST /patients/invitations/accept - Accept invitation (public)
 */
@Controller('patients')
@UseInterceptors(DataAccessLogInterceptor)
export class PatientInvitationController {
  constructor(
    private readonly patientInvitationService: PatientInvitationService,
  ) {}

  // ============================================================
  // ADMIN ENDPOINTS (Protected)
  // ============================================================

  /**
   * Send invitation to a patient
   * POST /patients/:id/invite
   * 
   * Only ADMIN and FRONT_DESK can send invitations.
   */
  @Post(':id/invite')
  @UseGuards(RolesGuard, RlsGuard, PermissionsGuard)
  @Roles('ADMIN', 'FRONT_DESK')
  @Permissions('patients:*:write')
  async sendInvitation(
    @Param('id') patientId: string,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.patientInvitationService.invitePatient(patientId, user.id);
  }

  /**
   * Resend invitation to a patient
   * POST /patients/:id/invite/resend
   */
  @Post(':id/invite/resend')
  @UseGuards(RolesGuard, RlsGuard, PermissionsGuard)
  @Roles('ADMIN', 'FRONT_DESK')
  @Permissions('patients:*:write')
  async resendInvitation(
    @Param('id') patientId: string,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.patientInvitationService.resendInvitation(patientId, user.id);
  }

  /**
   * Cancel invitation for a patient
   * DELETE /patients/:id/invite
   */
  @Post(':id/invite/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard, RlsGuard, PermissionsGuard)
  @Roles('ADMIN', 'FRONT_DESK')
  @Permissions('patients:*:write')
  async cancelInvitation(
    @Param('id') patientId: string,
    @CurrentUser() user: UserIdentity,
  ) {
    await this.patientInvitationService.cancelInvitation(patientId, user.id);
  }

  // ============================================================
  // PUBLIC ENDPOINTS (For invitation acceptance)
  // ============================================================

  /**
   * Validate invitation token
   * POST /patients/invitations/validate
   * 
   * Public endpoint - used by frontend to check if token is valid
   * before showing password form.
   */
  @Post('invitations/validate')
  @Public()
  @HttpCode(HttpStatus.OK)
  async validateToken(@Body() dto: ValidateInvitationDto) {
    return this.patientInvitationService.validateToken(dto.token);
  }

  /**
   * Accept invitation and create account
   * POST /patients/invitations/accept
   * 
   * Public endpoint - called when patient sets password.
   */
  @Post('invitations/accept')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  async acceptInvitation(
    @Body() dto: AcceptInvitationDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.patientInvitationService.acceptInvitation(
      dto.token,
      dto.password,
      ipAddress,
      userAgent,
    );
  }
}
