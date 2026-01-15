import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ClinicalServiceService } from '../services/clinical-service.service';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@Controller('clinical-services')
@UseGuards(RolesGuard, PermissionsGuard)
export class ClinicalServiceController {
    constructor(private readonly service: ClinicalServiceService) { }

    @Get()
    @Roles('ADMIN', 'DOCTOR', 'SURGEON', 'NURSE', 'FRONT_DESK', 'PATIENT')
    getAll() {
        return this.service.getAllServices();
    }

    @Get('category/:category')
    @Roles('ADMIN', 'DOCTOR', 'SURGEON', 'NURSE', 'FRONT_DESK', 'PATIENT')
    getByCategory(@Param('category') category: string) {
        return this.service.getServicesByCategory(category);
    }

    @Get(':code')
    @Roles('ADMIN', 'DOCTOR', 'SURGEON', 'NURSE', 'FRONT_DESK', 'PATIENT')
    getByCode(@Param('code') code: string) {
        return this.service.getServiceByCode(code);
    }
}
