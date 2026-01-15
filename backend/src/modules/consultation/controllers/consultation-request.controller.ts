import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    UseInterceptors,
    ParseUUIDPipe,
} from '@nestjs/common';
import { ConsultationRequestService } from '../services/consultation-request.service';
import { CreateConsultationRequestDto } from '../dto/create-consultation-request.dto';
import { ApproveConsultationRequestDto, RejectConsultationRequestDto } from '../dto/consultation-request-action.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RlsGuard } from '../../../common/guards/rls.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../auth/services/identityContext.service';
import { ConsultationRequestStatus } from '@prisma/client';

/**
 * Consultation Request Controller
 * 
 * Handles consultation request management for Front Desk.
 * Allows patients to request consultations and staff to approve/reject them.
 */
@Controller('consultation-requests')
@UseGuards(RolesGuard, RlsGuard, PermissionsGuard)
@UseInterceptors(DataAccessLogInterceptor)
export class ConsultationRequestController {
    constructor(
        private readonly consultationRequestService: ConsultationRequestService,
    ) { }

    /**
     * Create a new consultation request
     * 
     * POST /api/v1/consultation-requests
     * 
     * Front desk staff can create consultation requests on behalf of patients.
     * Patients can also create their own requests.
     */
    @Post()
    @Roles('ADMIN', 'FRONT_DESK', 'PATIENT')
    @Permissions('consultations:*:write')
    async create(
        @Body() createDto: CreateConsultationRequestDto,
        @CurrentUser() user: UserIdentity,
    ) {
        return await this.consultationRequestService.create(createDto, user.id);
    }

    /**
     * Get all consultation requests with filters
     * 
     * GET /api/v1/consultation-requests
     */
    @Get()
    @Roles('ADMIN', 'FRONT_DESK', 'DOCTOR', 'SURGEON')
    @Permissions('consultations:*:read')
    async findAll(
        @Query('skip') skip?: string,
        @Query('take') take?: string,
        @Query('patientId') patientId?: string,
        @Query('specialistId') specialistId?: string,
        @Query('status') status?: string,
    ) {
        const skipNum = skip ? parseInt(skip, 10) : 0;
        const takeNum = take ? parseInt(take, 10) : 20;

        let statusEnum: ConsultationRequestStatus | undefined;
        if (status && Object.values(ConsultationRequestStatus).includes(status as ConsultationRequestStatus)) {
            statusEnum = status as ConsultationRequestStatus;
        }

        return await this.consultationRequestService.findAll(skipNum, takeNum, {
            patientId,
            specialistId,
            status: statusEnum,
        });
    }

    /**
     * Get consultation request by ID
     * 
     * GET /api/v1/consultation-requests/:id
     */
    @Get(':id')
    @Roles('ADMIN', 'FRONT_DESK', 'DOCTOR', 'SURGEON', 'PATIENT')
    @Permissions('consultations:*:read')
    async findOne(@Param('id', ParseUUIDPipe) id: string) {
        return await this.consultationRequestService.findOne(id);
    }

    /**
     * Approve consultation request
     * 
     * POST /api/v1/consultation-requests/:id/approve
     * 
     * Only doctors, surgeons, and admins can approve consultation requests.
     */
    @Post(':id/approve')
    @Roles('ADMIN', 'DOCTOR', 'SURGEON')
    @Permissions('consultations:*:write')
    async approve(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() approveDto: ApproveConsultationRequestDto,
        @CurrentUser() user: UserIdentity,
    ) {
        return await this.consultationRequestService.approve(id, approveDto, user.id);
    }

    /**
     * Reject consultation request
     * 
     * POST /api/v1/consultation-requests/:id/reject
     * 
     * Only doctors, surgeons, and admins can reject consultation requests.
     */
    @Post(':id/reject')
    @Roles('ADMIN', 'DOCTOR', 'SURGEON')
    @Permissions('consultations:*:write')
    async reject(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() rejectDto: RejectConsultationRequestDto,
        @CurrentUser() user: UserIdentity,
    ) {
        return await this.consultationRequestService.reject(id, rejectDto, user.id);
    }
}
