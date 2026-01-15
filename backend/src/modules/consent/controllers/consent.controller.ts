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
  Req,
} from '@nestjs/common';
import { ConsentService } from '../services/consent.service';
import { CreateConsentDto } from '../dto/create-consent.dto';
import { UpdateConsentDto } from '../dto/update-consent.dto';
import { CreateFillInValueDto } from '../dto/fill-in-value.dto';
import { CreateStructuredDataDto } from '../dto/structured-data.dto';
import { CreatePageAcknowledgementDto } from '../dto/page-acknowledgement.dto';
import { SignConsentDto } from '../dto/sign-consent.dto';
import { AcknowledgeSectionDto } from '../dto/acknowledge-section.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RlsGuard } from '../../../common/guards/rls.guard';
import { PermissionsGuard } from '../../../modules/auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../../modules/auth/decorators/permissions.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../../modules/auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../../modules/auth/services/identityContext.service';

@Controller('consent')
@UseGuards(RolesGuard, RlsGuard, PermissionsGuard)
@UseInterceptors(DataAccessLogInterceptor)
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @Post('instances')
  @Roles('ADMIN', 'NURSE', 'DOCTOR')
  @Permissions('consent:*:write')
  create(
    @Body() createConsentDto: CreateConsentDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.consentService.create(createConsentDto, user.id);
  }

  @Get('instances')
  @Roles('ADMIN', 'NURSE', 'DOCTOR')
  @Permissions('consent:*:read')
  findAll(
    @Query('skip', ParseIntPipe) skip?: number,
    @Query('take', ParseIntPipe) take?: number,
    @CurrentUser() user?: UserIdentity,
  ) {
    // Filter by patient relationships
    return this.consentService.findAll(skip, take, user?.id);
  }

  @Get('instances/:id')
  @Roles('ADMIN', 'NURSE', 'DOCTOR')
  @Permissions('consent:*:read')
  // RlsGuard validates patient relationship
  findOne(@Param('id') id: string) {
    return this.consentService.findOne(id);
  }

  @Patch('instances/:id')
  @Roles('ADMIN', 'NURSE', 'DOCTOR')
  @Permissions('consent:*:write')
  // RlsGuard validates patient relationship
  update(
    @Param('id') id: string,
    @Body() updateConsentDto: UpdateConsentDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.consentService.update(id, updateConsentDto, user.id);
  }

  @Patch('instances/:id/revoke')
  @Roles('ADMIN', 'NURSE', 'DOCTOR')
  @Permissions('consent:*:write')
  // RlsGuard validates patient relationship
  revoke(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: UserIdentity,
  ) {
    return this.consentService.revokeConsent(
      id,
      { status: 'REVOKED', ...body },
      user.id,
    );
  }

  @Get('instances/:id/full')
  @Roles('ADMIN', 'NURSE', 'DOCTOR')
  @Permissions('consent:*:read')
  getInstanceWithFullData(
    @Param('id') id: string,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.consentService.getInstanceWithFullData(id, user.id);
  }

  @Get('templates/by-cpt/:cptCode')
  @Roles('ADMIN', 'NURSE', 'DOCTOR')
  @Permissions('consent:*:read')
  findTemplateByCPTCode(@Param('cptCode') cptCode: string) {
    return this.consentService.findTemplateByCPTCode(cptCode);
  }

  // ============================================================================
  // Fill-in Values Endpoints
  // ============================================================================

  @Get('instances/:id/fill-in-values')
  @Roles('ADMIN', 'NURSE', 'DOCTOR')
  @Permissions('consent:*:read')
  getFillInValues(
    @Param('id') id: string,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.consentService.getFillInValues(id, user.id);
  }

  @Post('instances/:id/fill-in-values/:fieldId')
  @Roles('ADMIN', 'NURSE', 'DOCTOR')
  @Permissions('consent:*:write')
  setFillInValue(
    @Param('id') instanceId: string,
    @Param('fieldId') fieldId: string,
    @Body() body: { value: string },
    @CurrentUser() user: UserIdentity,
  ) {
    return this.consentService.setFillInValue(
      instanceId,
      fieldId,
      body.value,
      user.id,
    );
  }

  // ============================================================================
  // Structured Data Endpoints
  // ============================================================================

  @Post('instances/:id/structured-data')
  @Roles('ADMIN', 'NURSE', 'DOCTOR')
  @Permissions('consent:*:write')
  setStructuredData(
    @Param('id') instanceId: string,
    @Body() dto: CreateStructuredDataDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.consentService.setStructuredData(
      { ...dto, instanceId },
      user.id,
    );
  }

  @Get('instances/:id/structured-data')
  @Roles('ADMIN', 'NURSE', 'DOCTOR')
  @Permissions('consent:*:read')
  getStructuredData(
    @Param('id') instanceId: string,
    @Query('dataType') dataType?: string,
    @CurrentUser() user?: UserIdentity,
  ) {
    return this.consentService.getStructuredData(instanceId, dataType, user?.id);
  }

  // ============================================================================
  // Page Endpoints
  // ============================================================================

  @Get('instances/:id/pages/:pageId')
  @Roles('ADMIN', 'NURSE', 'DOCTOR', 'PATIENT')
  @Permissions('consent:*:read')
  getPageContent(
    @Param('id') instanceId: string,
    @Param('pageId') pageId: string,
    @CurrentUser() user?: UserIdentity,
  ) {
    return this.consentService.getPageContent(instanceId, pageId, user?.id);
  }

  @Post('instances/:id/pages/:pageId/acknowledge')
  @Roles('ADMIN', 'NURSE', 'DOCTOR', 'PATIENT')
  @Permissions('consent:*:write')
  acknowledgePage(
    @Param('id') instanceId: string,
    @Param('pageId') pageId: string,
    @Body() body: Omit<CreatePageAcknowledgementDto, 'instanceId' | 'pageId'>,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.consentService.acknowledgePage(
      {
        ...body,
        instanceId,
        pageId,
      },
      user.id,
    );
  }

  // ============================================================================
  // Section/Clause Acknowledgment Endpoints
  // ============================================================================

  @Post('instances/:id/acknowledge')
  @Roles('ADMIN', 'NURSE', 'DOCTOR', 'PATIENT')
  @Permissions('consent:*:write')
  acknowledgeSection(
    @Param('id') instanceId: string,
    @Body() body: Omit<AcknowledgeSectionDto, 'instanceId'>,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.consentService.acknowledgeSection(
      {
        ...body,
        instanceId,
      },
      user.id,
    );
  }

  // ============================================================================
  // Signature Endpoints
  // ============================================================================

  @Post('instances/:id/sign')
  @Roles('ADMIN', 'NURSE', 'DOCTOR', 'PATIENT')
  @Permissions('consent:*:write')
  signConsent(
    @Param('id') instanceId: string,
    @Body() body: Omit<SignConsentDto, 'instanceId'>,
    @CurrentUser() user: UserIdentity,
    @Req() req: any,
  ) {
    return this.consentService.signConsent(
      {
        ...body,
        instanceId,
      },
      user.id,
      req,
    );
  }

  @Get('instances/:id/signatures')
  @Roles('ADMIN', 'NURSE', 'DOCTOR')
  @Permissions('consent:*:read')
  getSignatures(
    @Param('id') instanceId: string,
    @CurrentUser() user?: UserIdentity,
  ) {
    return this.consentService.getInstanceWithFullData(instanceId, user?.id).then(
      (instance) => instance?.signatures || [],
    );
  }
}

