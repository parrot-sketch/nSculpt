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
import { TheaterService } from '../services/theater.service';
import { CreateCaseDto } from '../dto/create-case.dto';
import { UpdateCaseDto } from '../dto/update-case.dto';
import { RecordSurgeryUsageDto } from '../dto/record-surgery-usage.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RlsGuard } from '../../../common/guards/rls.guard';
import { PermissionsGuard } from '../../../modules/auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../../modules/auth/decorators/permissions.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../../modules/auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../../modules/auth/services/identityContext.service';

@Controller('theater')
@UseGuards(RolesGuard, RlsGuard, PermissionsGuard)
@UseInterceptors(DataAccessLogInterceptor)
export class TheaterController {
  constructor(private readonly theaterService: TheaterService) {}

  @Post('cases')
  @Roles('ADMIN', 'SURGEON', 'NURSE')
  @Permissions('theater:*:write')
  createCase(
    @Body() createCaseDto: CreateCaseDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.theaterService.createCase(createCaseDto, user.id);
  }

  @Get('cases')
  @Roles('ADMIN', 'SURGEON', 'NURSE', 'DOCTOR')
  @Permissions('theater:*:read')
  findAll(
    @Query('skip', ParseIntPipe) skip?: number,
    @Query('take', ParseIntPipe) take?: number,
    @CurrentUser() user?: UserIdentity,
  ) {
    // Filter by primarySurgeonId, ResourceAllocation, or department
    return this.theaterService.findAll(skip, take, user?.id);
  }

  @Get('cases/:id')
  @Roles('ADMIN', 'SURGEON', 'NURSE', 'DOCTOR')
  @Permissions('theater:*:read')
  // RlsGuard validates: primarySurgeonId, ResourceAllocation, or department match
  findOne(@Param('id') id: string) {
    return this.theaterService.findOne(id);
  }

  @Patch('cases/:id')
  @Roles('ADMIN', 'SURGEON', 'NURSE')
  @Permissions('theater:*:write')
  // RlsGuard validates modification rights (primarySurgeonId or allocated staff)
  update(
    @Param('id') id: string,
    @Body() updateCaseDto: UpdateCaseDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.theaterService.updateCase(id, updateCaseDto, user.id);
  }

  @Patch('cases/:id/status')
  @Roles('ADMIN', 'SURGEON', 'NURSE')
  @Permissions('theater:*:write')
  // RlsGuard validates modification rights
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; reason?: string },
    @CurrentUser() user: UserIdentity,
  ) {
    // Get actual current status from case
    const existingCase = await this.theaterService.findOne(id);
    return this.theaterService.updateCaseStatus(
      id,
      existingCase.status,
      body.status,
      body.reason,
      user.id,
    );
  }

  /**
   * Phase 2: Record inventory usage during surgery
   * Consumes inventory and creates usage record linked to surgical case
   */
  @Post('cases/:id/inventory-usage')
  @Roles('ADMIN', 'SURGEON', 'NURSE')
  @Permissions('theater:*:write')
  recordSurgeryUsage(
    @Param('id') caseId: string,
    @Body() recordSurgeryUsageDto: RecordSurgeryUsageDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.theaterService.recordSurgeryUsage(
      caseId,
      recordSurgeryUsageDto,
      user.id,
    );
  }
}

