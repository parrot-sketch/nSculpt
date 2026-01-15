import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { EMRNoteService } from '../services/emr-note.service';
import { CreateNoteDto } from '../dto/create-note.dto';
import { AddAddendumDto } from '../dto/add-addendum.dto';
import { ListNotesDto } from '../dto/list-notes.dto';
import { ArchiveNoteDto } from '../dto/archive-note.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RlsGuard } from '../../../common/guards/rls.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { DataAccessLogInterceptor } from '../../../common/interceptors/dataAccessLog.interceptor';
import { CurrentUser } from '../../auth/decorators/currentUser.decorator';
import { UserIdentity } from '../../auth/services/identityContext.service';

@Controller('emr/notes')
@UseGuards(RolesGuard, RlsGuard, PermissionsGuard)
@UseInterceptors(DataAccessLogInterceptor)
export class EMRNoteController {
  constructor(private readonly emrNoteService: EMRNoteService) { }

  /**
   * Create a new EMR note
   * 
   * Role restrictions:
   * - NURSE → can create NURSE_TRIAGE
   * - DOCTOR/SURGEON → can create DOCTOR_SOAP
   * - FRONT_DESK → cannot create (403)
   * - ADMIN → can create any type
   */
  @Post()
  @Roles('ADMIN', 'NURSE', 'DOCTOR', 'SURGEON')
  @Permissions('emr:*:write')
  create(
    @Body() createNoteDto: CreateNoteDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.emrNoteService.createNote(createNoteDto, user.id);
  }

  /**
   * Get a single note by ID
   * 
   * Role restrictions:
   * - FRONT_DESK → cannot access (403)
   * - Others → can read if they have patient access
   */
  @Get(':id')
  @Roles('ADMIN', 'NURSE', 'DOCTOR', 'SURGEON')
  @Permissions('emr:*:read')
  findOne(@Param('id') id: string, @CurrentUser() user?: UserIdentity) {
    return this.emrNoteService.findOne(id, user?.id);
  }

  /**
   * List notes by consultation
   * Returns structured grouping with addendums
   * 
   * Role restrictions:
   * - FRONT_DESK → cannot access (403)
   * - Others → can read if they have patient access
   */
  @Get('by-consultation/:consultationId')
  @Roles('ADMIN', 'NURSE', 'DOCTOR', 'SURGEON')
  @Permissions('emr:*:read')
  listByConsultation(
    @Param('consultationId') consultationId: string,
    @Query() listNotesDto: ListNotesDto,
    @CurrentUser() user?: UserIdentity,
  ) {
    return this.emrNoteService.listNotesByConsultation(
      consultationId,
      listNotesDto,
      user?.id,
    );
  }

  /**
   * Add addendum to existing note
   * 
   * Rules:
   * - Only note author or ADMIN can add addendum
   * - Addendums are always allowed (even if parent is locked)
   */
  @Post(':id/addendum')
  @Roles('ADMIN', 'DOCTOR', 'SURGEON', 'NURSE')
  @Permissions('emr:*:write')
  addAddendum(
    @Param('id') id: string,
    @Body() addAddendumDto: AddAddendumDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.emrNoteService.addAddendum(id, addAddendumDto, user.id);
  }

  /**
   * Archive note (soft delete)
   * Only ADMIN can archive
   */
  @Post(':id/archive')
  @Roles('ADMIN')
  @Permissions('emr:*:delete')
  archive(
    @Param('id') id: string,
    @Body() archiveNoteDto: ArchiveNoteDto,
    @CurrentUser() user: UserIdentity,
  ) {
    return this.emrNoteService.archiveNote(id, archiveNoteDto, user.id);
  }

  /**
   * Unlock note (ADMIN only)
   * Allows editing after 10-minute lock window
   */
  @Post(':id/unlock')
  @Roles('ADMIN')
  @Permissions('emr:*:write')
  unlock(@Param('id') id: string, @CurrentUser() user: UserIdentity) {
    return this.emrNoteService.unlockNote(id, user.id);
  }
}









