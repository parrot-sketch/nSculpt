import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { PrescriptionService } from '../services/prescription.service';
import { CreatePrescriptionDto } from '../dto/create-prescription.dto';
import { DispensePrescriptionDto } from '../dto/dispense-prescription.dto';
import { RecordAdministrationDto } from '../dto/record-administration.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RlsGuard } from '../../../common/guards/rls.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../auth/services/identityContext.service';

@Controller('prescriptions')
@UseGuards(RolesGuard, RlsGuard, PermissionsGuard)
@UseInterceptors(DataAccessLogInterceptor)
export class PrescriptionController {
  constructor(private readonly prescriptionService: PrescriptionService) { }

  /**
   * Create prescription
   * Only DOCTOR/SURGEON/ADMIN can prescribe
   */
  @Post()
  @Roles('ADMIN', 'DOCTOR', 'SURGEON')
  @Permissions('prescriptions:*:write')
  create(
    @Body() createPrescriptionDto: CreatePrescriptionDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.prescriptionService.createPrescription(
      createPrescriptionDto,
      user.id,
    );
  }

  /**
   * Get single prescription by ID
   */
  @Get(':id')
  @Roles('ADMIN', 'DOCTOR', 'SURGEON', 'NURSE', 'PHARMACIST')
  @Permissions('prescriptions:*:read')
  findOne(@Param('id') id: string, @CurrentUser() user?: UserIdentity) {
    return this.prescriptionService.findOne(id, user?.id);
  }

  /**
   * List prescriptions by consultation
   */
  @Get('by-consultation/:consultationId')
  @Roles('ADMIN', 'DOCTOR', 'SURGEON', 'NURSE', 'PHARMACIST')
  @Permissions('prescriptions:*:read')
  findByConsultation(
    @Param('consultationId') consultationId: string,
    @CurrentUser() user?: UserIdentity,
  ) {
    return this.prescriptionService.findByConsultation(
      consultationId,
      user?.id,
    );
  }

  /**
   * Dispense prescription
   * Deducts inventory if medication is tracked
   */
  @Post(':id/dispense')
  @Roles('ADMIN', 'PHARMACIST')
  @Permissions('prescriptions:*:write')
  dispense(
    @Param('id') id: string,
    @Body() dispensePrescriptionDto: DispensePrescriptionDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.prescriptionService.dispensePrescription(
      id,
      dispensePrescriptionDto,
      user.id,
    );
  }

  /**
   * Record medication administration
   * Nursing logs when medication was given
   */
  @Post(':id/administration')
  @Roles('ADMIN', 'NURSE')
  @Permissions('prescriptions:*:write')
  recordAdministration(
    @Param('id') id: string,
    @Body() recordAdministrationDto: RecordAdministrationDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.prescriptionService.recordAdministration(
      id,
      recordAdministrationDto,
      user.id,
    );
  }
}









