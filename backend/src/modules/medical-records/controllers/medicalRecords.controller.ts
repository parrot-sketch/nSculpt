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
} from '@nestjs/common';
import { MedicalRecordsService } from '../services/medicalRecords.service';
import { CreateMedicalRecordDto } from '../dto/create-medicalRecord.dto';
import { UpdateMedicalRecordDto } from '../dto/update-medicalRecord.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RlsGuard } from '../../../common/guards/rls.guard';
import { PermissionsGuard } from '../../../modules/auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../../modules/auth/decorators/permissions.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../../modules/auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../../modules/auth/services/identityContext.service';

@Controller('medical-records')
@UseGuards(RolesGuard, RlsGuard, PermissionsGuard)
@UseInterceptors(DataAccessLogInterceptor)
export class MedicalRecordsController {
  constructor(
    private readonly medicalRecordsService: MedicalRecordsService,
  ) {}

  @Post()
  @Roles('ADMIN', 'DOCTOR', 'NURSE')
  @Permissions('medical_records:*:write')
  create(
    @Body() createMedicalRecordDto: CreateMedicalRecordDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.medicalRecordsService.create(createMedicalRecordDto, user.id);
  }

  @Get()
  @Roles('ADMIN', 'DOCTOR', 'NURSE')
  @Permissions('medical_records:*:read')
  findAll(
    @Query('skip', ParseIntPipe) skip?: number,
    @Query('take', ParseIntPipe) take?: number,
    @CurrentUser() user?: UserIdentity,
  ) {
    // Filter by patient relationships (cases, department)
    return this.medicalRecordsService.findAll(skip, take, user?.id);
  }

  @Get(':id')
  @Roles('ADMIN', 'DOCTOR', 'NURSE')
  @Permissions('medical_records:*:read')
  // RlsGuard validates patient relationship
  findOne(@Param('id') id: string) {
    return this.medicalRecordsService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'DOCTOR')
  @Permissions('medical_records:*:write')
  // RlsGuard validates: ADMIN or DOCTOR with patient access
  update(
    @Param('id') id: string,
    @Body() updateMedicalRecordDto: UpdateMedicalRecordDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.medicalRecordsService.update(
      id,
      updateMedicalRecordDto,
      user.id,
    );
  }

  @Post(':id/merge')
  @Roles('ADMIN', 'DOCTOR')
  @Permissions('medical_records:*:manage')
  // RlsGuard validates access to both records
  merge(
    @Param('id') targetId: string,
    @Body() body: { sourceRecordId: string; reason?: string },
    @CurrentUser() user: UserIdentity,
  ) {
    return this.medicalRecordsService.mergeRecords(
      body.sourceRecordId,
      targetId,
      body.reason,
      user.id,
    );
  }
}

