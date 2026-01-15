import { Controller, Get, Post, Body, Param, Patch, UseGuards, Req } from '@nestjs/common';
import { EncounterService } from './encounter.service';
import { EncounterStatus, EncounterClass } from '@prisma/client';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/currentUser.decorator';
import { UserIdentity } from '../auth/services/identityContext.service';

@Controller('encounters')
@UseGuards(RolesGuard, PermissionsGuard)
export class EncounterController {
    constructor(private readonly encounterService: EncounterService) { }

    @Post()
    @Roles('ADMIN', 'DOCTOR', 'NURSE', 'FRONT_DESK')
    @Permissions('medical_records:write')
    create(@Body() createEncounterDto: {
        patientId: string;
        class: EncounterClass;
        type: string;
        serviceProviderId: string;
        appointmentId?: string;
        surgicalCaseId?: string;
        locationId?: string;
    }, @CurrentUser() user: UserIdentity) {
        return this.encounterService.createEncounter({
            ...createEncounterDto,
            createdById: user.id
        });
    }

    @Get(':id')
    @Roles('ADMIN', 'DOCTOR', 'NURSE', 'FRONT_DESK', 'PATIENT')
    @Permissions('medical_records:read')
    findOne(@Param('id') id: string) {
        return this.encounterService.getEncounter(id);
    }

    @Patch(':id/status')
    @Roles('ADMIN', 'DOCTOR', 'NURSE', 'FRONT_DESK')
    @Permissions('medical_records:write')
    updateStatus(
        @Param('id') id: string,
        @Body('status') status: EncounterStatus,
        @CurrentUser() user: UserIdentity
    ) {
        return this.encounterService.updateStatus(id, status, user.id);
    }

    @Get()
    @Roles('ADMIN', 'DOCTOR', 'NURSE', 'FRONT_DESK')
    @Permissions('medical_records:read')
    findAll() {
        // In a real app, this might have pagination and admin-only filters
        return this.encounterService.findAll();
    }

    @Get('patient/:patientId')
    @Roles('ADMIN', 'DOCTOR', 'NURSE', 'FRONT_DESK', 'PATIENT')
    @Permissions('medical_records:read')
    findByPatient(@Param('patientId') patientId: string) {
        return this.encounterService.findByPatient(patientId);
    }
}
