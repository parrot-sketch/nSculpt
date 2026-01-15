import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PDFConsentTemplateService } from '../services/pdf-consent-template.service';
import { CreatePDFTemplateDto } from '../dto/create-pdf-template.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../auth/services/identityContext.service';

@Controller('consents/templates')
@UseGuards(RolesGuard, PermissionsGuard)
// Note: RlsGuard is intentionally excluded - templates are public resources that don't require patient association
@UseInterceptors(DataAccessLogInterceptor)
export class PDFConsentTemplateController {
  constructor(private readonly templateService: PDFConsentTemplateService) {}

  /**
   * POST /api/v1/consents/templates
   * Create a new PDF consent template (Admin only)
   * Note: Global prefix 'api/v1' is applied automatically
   */
  @Post()
  @Roles('ADMIN')
  @Permissions('consent:*:write')
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() createDto: CreatePDFTemplateDto,
    @CurrentUser() user: UserIdentity,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: 'application/pdf' }),
        ],
        fileIsRequired: true, // File is required for template creation
      }),
    )
    file: any, // Express.Multer.File - using any to avoid type import issues
  ) {
    if (!file) {
      throw new BadRequestException('PDF file is required');
    }
    const pdfBuffer = file.buffer;
    return await this.templateService.createTemplate(createDto, user.id, pdfBuffer);
  }

  /**
   * GET /api/v1/consents/templates
   * Get all consent templates
   * Note: Global prefix 'api/v1' is applied automatically
   */
  @Get()
  @Roles('ADMIN', 'DOCTOR', 'NURSE')
  @Permissions('consent:*:read')
  async findAll() {
    return await this.templateService.findAll(true); // Active only by default
  }

  /**
   * GET /api/v1/consents/templates/:id
   * Get template by ID
   * Note: Global prefix 'api/v1' is applied automatically
   */
  @Get(':id')
  @Roles('ADMIN', 'DOCTOR', 'NURSE')
  @Permissions('consent:*:read')
  async findOne(@Param('id') id: string) {
    return await this.templateService.findOne(id);
  }

  /**
   * PATCH /api/v1/consents/templates/:id
   * Update template (Admin only)
   * Note: Global prefix 'api/v1' is applied automatically
   */
  @Patch(':id')
  @Roles('ADMIN')
  @Permissions('consent:*:write')
  async update(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreatePDFTemplateDto>,
    @CurrentUser() user: UserIdentity,
  ) {
    return await this.templateService.update(id, updateDto, user.id);
  }

  /**
   * PATCH /api/v1/consents/templates/:id/deactivate
   * Deactivate template (Admin only)
   * Note: Global prefix 'api/v1' is applied automatically
   */
  @Patch(':id/deactivate')
  @Roles('ADMIN')
  @Permissions('consent:*:write')
  async deactivate(@Param('id') id: string, @CurrentUser() user: UserIdentity) {
    return await this.templateService.deactivate(id, user.id);
  }
}

