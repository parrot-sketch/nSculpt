import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TheatersService } from '../services/theaters.service';
import { CreateTheaterDto } from '../dto/theaters/create-theater.dto';
import { UpdateTheaterDto } from '../dto/theaters/update-theater.dto';
import { TheaterQueryDto } from '../dto/theaters/theater-query.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../auth/services/identityContext.service';

/**
 * Theaters Controller
 * 
 * Admin-only endpoints for operating theater management.
 * SC-002: Manage Operating Theaters
 * 
 * Security:
 * - Requires ADMIN role
 * - Requires admin:* permissions
 * - All actions logged for audit
 */
@Controller('admin/theaters')
@UseGuards(RolesGuard, PermissionsGuard)
@UseInterceptors(DataAccessLogInterceptor)
@Roles('ADMIN')
@Permissions('admin:*:read', 'admin:*:write')
export class TheatersController {
  constructor(private readonly theatersService: TheatersService) {}

  /**
   * Create a new operating theater
   * POST /api/v1/admin/theaters
   * SC-002: Create New Operating Theater
   */
  @Post()
  @Permissions('admin:system:write')
  async create(@Body() createTheaterDto: CreateTheaterDto, @CurrentUser() admin: UserIdentity) {
    return this.theatersService.createTheater(createTheaterDto, admin.id);
  }

  /**
   * List theaters with filters and pagination
   * GET /api/v1/admin/theaters
   */
  @Get()
  @Permissions('admin:system:read')
  async findAll(@Query() query: TheaterQueryDto, @CurrentUser() admin: UserIdentity) {
    return this.theatersService.listTheaters(query, admin.id);
  }

  /**
   * Get theater by ID
   * GET /api/v1/admin/theaters/:id
   */
  @Get(':id')
  @Permissions('admin:system:read')
  async findOne(@Param('id') id: string, @CurrentUser() admin: UserIdentity) {
    return this.theatersService.getTheaterById(id, admin.id);
  }

  /**
   * Update theater
   * PATCH /api/v1/admin/theaters/:id
   * SC-002: Update Operating Theater Information
   */
  @Patch(':id')
  @Permissions('admin:system:write')
  async update(
    @Param('id') id: string,
    @Body() updateTheaterDto: UpdateTheaterDto,
    @CurrentUser() admin: UserIdentity,
  ) {
    return this.theatersService.updateTheater(id, updateTheaterDto, admin.id);
  }

  /**
   * Deactivate theater
   * DELETE /api/v1/admin/theaters/:id
   * SC-002: Deactivate Operating Theater
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('admin:system:write')
  async remove(@Param('id') id: string, @CurrentUser() admin: UserIdentity) {
    await this.theatersService.deactivateTheater(id, admin.id);
  }
}









