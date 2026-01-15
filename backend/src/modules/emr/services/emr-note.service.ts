import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { EMRNoteRepository } from '../repositories/emr-note.repository';
import { ConsultationRepository } from '../../consultation/repositories/consultation.repository';
import { DomainEventService } from '../../../services/domainEvent.service';
import { CorrelationService } from '../../../services/correlation.service';
import { IdentityContextService } from '../../auth/services/identityContext.service';
import { RlsValidationService } from '../../audit/services/rlsValidation.service';
import { CreateNoteDto } from '../dto/create-note.dto';
import { AddAddendumDto } from '../dto/add-addendum.dto';
import { ListNotesDto } from '../dto/list-notes.dto';
import { ArchiveNoteDto } from '../dto/archive-note.dto';
import { EMRNoteEventType } from '../events/emr-note.events';
import { Domain, NoteType } from '@prisma/client';

/**
 * EMR Note Service
 * 
 * Implements append-only note system with role-based access control.
 * 
 * Business Rules:
 * - Nurse: Can create NURSE_TRIAGE notes
 * - Doctor/Surgeon: Can create DOCTOR_SOAP notes
 * - Notes are editable for 10 minutes, then locked
 * - Locked notes can only be changed via addendum
 * - Front Desk: Cannot access EMR notes
 * - Admin: Can archive and unlock notes
 */
@Injectable()
export class EMRNoteService {
  constructor(
    private readonly emrNoteRepository: EMRNoteRepository,
    private readonly consultationRepository: ConsultationRepository,
    private readonly domainEventService: DomainEventService,
    private readonly correlationService: CorrelationService,
    private readonly identityContext: IdentityContextService,
    private readonly rlsValidation: RlsValidationService,
  ) {}

  /**
   * Create a new EMR note
   * 
   * Role-based validation:
   * - NURSE → can only create NURSE_TRIAGE
   * - DOCTOR/SURGEON → can only create DOCTOR_SOAP
   * - FRONT_DESK → cannot create notes (403)
   * - ADMIN → can create any note type
   */
  async createNote(createNoteDto: CreateNoteDto, userId: string) {
    // Validate consultation exists
    const consultation = await this.consultationRepository.findById(
      createNoteDto.consultationId,
    );
    if (!consultation) {
      throw new NotFoundException(
        `Consultation with ID ${createNoteDto.consultationId} not found`,
      );
    }

    // Validate patient access (RLS)
    const hasAccess = await this.rlsValidation.canAccessPatient(
      consultation.patientId,
      userId,
    );
    if (!hasAccess) {
      throw new ForbiddenException(
        `Access denied to patient ${consultation.patientId}`,
      );
    }

    // Role-based note type validation
    this.validateNoteTypePermission(createNoteDto.noteType, userId);

    // Create note
    const note = await this.emrNoteRepository.create({
      ...createNoteDto,
      patientId: consultation.patientId,
      authorId: userId,
      createdBy: userId,
    });

    // Lock note if past 10-minute window (defensive check)
    if (!this.emrNoteRepository.isEditable(note.createdAt)) {
      // Note: In production, this would be handled by a background job
      // For now, we'll just mark it as locked on creation if needed
    }

    // Get correlation context
    const context = this.correlationService.getContext();

    // Emit domain event
    await this.domainEventService.createEvent({
      eventType: EMRNoteEventType.NOTE_CREATED,
      domain: Domain.EMR,
      aggregateId: note.id,
      aggregateType: 'EMRNote',
      payload: {
        noteId: note.id,
        consultationId: consultation.id,
        patientId: consultation.patientId,
        authorId: userId,
        noteType: createNoteDto.noteType,
        timestamp: new Date().toISOString(),
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return note;
  }

  /**
   * Add addendum to existing note
   * 
   * Rules:
   * - Parent note must exist and not be archived
   * - Only author or ADMIN can add addendum
   * - Addendums are always allowed (even if parent is locked)
   */
  async addAddendum(
    noteId: string,
    addAddendumDto: AddAddendumDto,
    userId: string,
  ) {
    const parentNote = await this.emrNoteRepository.findById(noteId);
    if (!parentNote) {
      throw new NotFoundException(`Note with ID ${noteId} not found`);
    }

    // Validate patient access
    const hasAccess = await this.rlsValidation.canAccessPatient(
      parentNote.patientId,
      userId,
    );
    if (!hasAccess) {
      throw new ForbiddenException(
        `Access denied to patient ${parentNote.patientId}`,
      );
    }

    // Only author or ADMIN can add addendum
    const isAdmin = this.identityContext.hasRole('ADMIN');
    if (!isAdmin && parentNote.authorId !== userId) {
      throw new ForbiddenException(
        'Only the note author or ADMIN can add addendums',
      );
    }

    // Create addendum
    const addendum = await this.emrNoteRepository.createAddendum(noteId, {
      content: addAddendumDto.content,
      patientId: parentNote.patientId,
      consultationId: parentNote.consultationId,
      authorId: userId,
      createdBy: userId,
    });

    // Get correlation context
    const context = this.correlationService.getContext();

    // Emit domain event
    await this.domainEventService.createEvent({
      eventType: EMRNoteEventType.NOTE_ADDENDUM_CREATED,
      domain: Domain.EMR,
      aggregateId: addendum.id,
      aggregateType: 'EMRNote',
      payload: {
        noteId: addendum.id,
        parentNoteId: noteId,
        consultationId: parentNote.consultationId,
        patientId: parentNote.patientId,
        authorId: userId,
        timestamp: new Date().toISOString(),
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return addendum;
  }

  /**
   * List notes by consultation
   * Returns structured grouping with addendums
   */
  async listNotesByConsultation(
    consultationId: string,
    listNotesDto: ListNotesDto,
    userId?: string,
  ) {
    // Validate consultation exists
    const consultation = await this.consultationRepository.findById(
      consultationId,
    );
    if (!consultation) {
      throw new NotFoundException(
        `Consultation with ID ${consultationId} not found`,
      );
    }

    // Validate patient access if userId provided
    if (userId) {
      const hasAccess = await this.rlsValidation.canAccessPatient(
        consultation.patientId,
        userId,
      );
      if (!hasAccess) {
        throw new ForbiddenException(
          `Access denied to consultation ${consultationId}`,
        );
      }
    }

    // Role check: Front Desk cannot access EMR notes
    if (userId) {
      const userRoles = this.identityContext.getRoles();
      if (
        userRoles.includes('FRONT_DESK') &&
        !userRoles.includes('ADMIN')
      ) {
        throw new ForbiddenException(
          'FRONT_DESK role cannot access EMR notes',
        );
      }
    }

    // Get notes
    const notes = await this.emrNoteRepository.findByConsultation(
      consultationId,
      {
        noteType: listNotesDto.noteType,
        includeArchived: listNotesDto.includeArchived,
      },
    );

    // Return structured response
    return {
      consultationId,
      patientId: consultation.patientId,
      notes: notes.map((note) => ({
        id: note.id,
        noteType: note.noteType,
        content: note.content,
        createdAt: note.createdAt,
        author: note.author,
        locked: note.locked,
        archived: note.archived,
        addendums: note.addendums.map((addendum) => ({
          id: addendum.id,
          content: addendum.content,
          createdAt: addendum.createdAt,
          author: addendum.author,
        })),
      })),
    };
  }

  /**
   * Get single note by ID
   */
  async findOne(noteId: string, userId?: string) {
    const note = await this.emrNoteRepository.findById(noteId);
    if (!note) {
      throw new NotFoundException(`Note with ID ${noteId} not found`);
    }

    // Validate patient access if userId provided
    if (userId) {
      const hasAccess = await this.rlsValidation.canAccessPatient(
        note.patientId,
        userId,
      );
      if (!hasAccess) {
        throw new ForbiddenException(`Access denied to note ${noteId}`);
      }

      // Role check: Front Desk cannot access EMR notes
      const userRoles = this.identityContext.getRoles();
      if (
        userRoles.includes('FRONT_DESK') &&
        !userRoles.includes('ADMIN')
      ) {
        throw new ForbiddenException(
          'FRONT_DESK role cannot access EMR notes',
        );
      }
    }

    return note;
  }

  /**
   * Archive note (soft delete)
   * Only ADMIN can archive
   */
  async archiveNote(
    noteId: string,
    archiveNoteDto: ArchiveNoteDto,
    userId: string,
  ) {
    // Role check: Only ADMIN can archive
    if (!this.identityContext.hasRole('ADMIN')) {
      throw new ForbiddenException('Only ADMIN can archive notes');
    }

    // Validate note exists
    const note = await this.findOne(noteId, userId);

    // Archive note
    const archived = await this.emrNoteRepository.archive(
      noteId,
      userId,
      archiveNoteDto.reason,
    );

    // Get correlation context
    const context = this.correlationService.getContext();

    // Emit domain event
    await this.domainEventService.createEvent({
      eventType: EMRNoteEventType.NOTE_ARCHIVED,
      domain: Domain.EMR,
      aggregateId: noteId,
      aggregateType: 'EMRNote',
      payload: {
        noteId,
        consultationId: note.consultationId,
        patientId: note.patientId,
        archivedBy: userId,
        timestamp: new Date().toISOString(),
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return archived;
  }

  /**
   * Unlock note (ADMIN only)
   * Allows editing after lock window
   */
  async unlockNote(noteId: string, userId: string) {
    // Role check: Only ADMIN can unlock
    if (!this.identityContext.hasRole('ADMIN')) {
      throw new ForbiddenException('Only ADMIN can unlock notes');
    }

    // Validate note exists
    const note = await this.findOne(noteId, userId);

    // Unlock note
    const unlocked = await this.emrNoteRepository.unlock(noteId, userId);

    // Get correlation context
    const context = this.correlationService.getContext();

    // Emit domain event
    await this.domainEventService.createEvent({
      eventType: EMRNoteEventType.NOTE_UNLOCKED,
      domain: Domain.EMR,
      aggregateId: noteId,
      aggregateType: 'EMRNote',
      payload: {
        noteId,
        consultationId: note.consultationId,
        patientId: note.patientId,
        unlockedBy: userId,
        timestamp: new Date().toISOString(),
      },
      correlationId: context.correlationId || undefined,
      causationId: context.causationId || undefined,
      createdBy: userId,
      sessionId: context.sessionId || undefined,
      requestId: context.requestId || undefined,
    });

    return unlocked;
  }

  /**
   * Validate role has permission to create note type
   * Throws ForbiddenException if invalid
   */
  private validateNoteTypePermission(noteType: NoteType, userId: string): void {
    const userRoles = this.identityContext.getRoles();

    // ADMIN can create any note type
    if (userRoles.includes('ADMIN')) {
      return;
    }

    // FRONT_DESK cannot create notes
    if (userRoles.includes('FRONT_DESK')) {
      throw new ForbiddenException(
        'FRONT_DESK role cannot create EMR notes',
      );
    }

    // NURSE can only create NURSE_TRIAGE
    if (noteType === NoteType.NURSE_TRIAGE) {
      if (!userRoles.includes('NURSE') && !userRoles.includes('ADMIN')) {
        throw new ForbiddenException(
          'Only NURSE and ADMIN can create triage notes',
        );
      }
      return;
    }

    // DOCTOR_SOAP can only be created by DOCTOR or SURGEON
    if (noteType === NoteType.DOCTOR_SOAP) {
      if (
        !userRoles.includes('DOCTOR') &&
        !userRoles.includes('SURGEON') &&
        !userRoles.includes('ADMIN')
      ) {
        throw new ForbiddenException(
          'Only DOCTOR, SURGEON, and ADMIN can create SOAP notes',
        );
      }
      return;
    }

    // ADDENDUM can only be created via addAddendum endpoint
    if (noteType === NoteType.ADDENDUM) {
      throw new BadRequestException(
        'Addendums must be created via the addendum endpoint',
      );
    }

    throw new BadRequestException(`Invalid note type: ${noteType}`);
  }
}









