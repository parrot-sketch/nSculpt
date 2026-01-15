import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaClient, NoteType, Prisma } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { CreateNoteDto } from '../dto/create-note.dto';

@Injectable()
export class EMRNoteRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Create a new EMR note (append-only)
   * Notes are never edited, only addendums are added
   */
  async create(
    data: CreateNoteDto & {
      patientId: string;
      authorId: string;
      createdBy: string;
    },
  ): Promise<any> {
    const noteData: Prisma.EMRNoteCreateInput = {
      patient: {
        connect: { id: data.patientId },
      },
      consultation: {
        connect: { id: data.consultationId },
      },
      author: {
        connect: { id: data.authorId },
      },
      noteType: data.noteType,
      content: data.content,
      locked: false, // Notes start unlocked, lock after 10 minutes
      version: 1,
      createdBy: data.createdBy,
    };

    return await this.prisma.eMRNote.create({
      data: noteData,
      include: {
        patient: true,
        consultation: true,
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Create an addendum (append-only edit)
   * Links to parent note via parentNoteId
   */
  async createAddendum(
    parentNoteId: string,
    data: {
      content: string;
      patientId: string;
      consultationId: string;
      authorId: string;
      createdBy: string;
    },
  ): Promise<any> {
    // Verify parent note exists and is not archived
    const parentNote = await this.findById(parentNoteId);
    if (!parentNote) {
      throw new NotFoundException(`Parent note with ID ${parentNoteId} not found`);
    }
    if (parentNote.archived) {
      throw new ConflictException('Cannot add addendum to archived note');
    }

    const addendumData: Prisma.EMRNoteCreateInput = {
      patient: {
        connect: { id: data.patientId },
      },
      consultation: {
        connect: { id: data.consultationId },
      },
      author: {
        connect: { id: data.authorId },
      },
      noteType: NoteType.ADDENDUM,
      content: data.content,
      parentNote: {
        connect: { id: parentNoteId },
      },
      locked: false,
      version: 1,
      createdBy: data.createdBy,
    };

    return await this.prisma.eMRNote.create({
      data: addendumData,
      include: {
        patient: true,
        consultation: true,
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        parentNote: {
          select: {
            id: true,
            noteType: true,
            content: true,
            createdAt: true,
          },
        },
      },
    });
  }

  /**
   * Find note by ID
   */
  async findById(id: string): Promise<any> {
    return await this.prisma.eMRNote.findUnique({
      where: { id },
      include: {
        patient: true,
        consultation: true,
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        parentNote: {
          select: {
            id: true,
            noteType: true,
            content: true,
            createdAt: true,
          },
        },
        addendums: {
          where: { archived: false },
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  /**
   * List notes by consultation
   * Returns notes with addendums grouped
   */
  async findByConsultation(
    consultationId: string,
    filters?: {
      noteType?: NoteType;
      includeArchived?: boolean;
    },
  ): Promise<any[]> {
    const where: Prisma.EMRNoteWhereInput = {
      consultationId,
      ...(filters?.noteType && { noteType: filters.noteType }),
      ...(filters?.includeArchived === false && { archived: false }),
      // Only return parent notes (not addendums in main list)
      parentNoteId: null,
    };

    return await this.prisma.eMRNote.findMany({
      where,
      include: {
        patient: true,
        consultation: true,
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        addendums: {
          where: { archived: false },
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /**
   * Archive note (soft delete)
   * Never deletes, only sets archived = true
   */
  async archive(
    id: string,
    archivedBy: string,
    reason?: string,
  ): Promise<any> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Note with ID ${id} not found`);
    }

    if (existing.archived) {
      throw new ConflictException('Note is already archived');
    }

    return await this.prisma.eMRNote.update({
      where: { id },
      data: {
        archived: true,
        archivedAt: new Date(),
        archivedBy,
        version: {
          increment: 1,
        },
      },
      include: {
        patient: true,
        consultation: true,
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Unlock note (ADMIN only)
   * Allows editing after lock window
   */
  async unlock(id: string, unlockedBy: string): Promise<any> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Note with ID ${id} not found`);
    }

    return await this.prisma.eMRNote.update({
      where: { id },
      data: {
        locked: false,
        updatedBy: unlockedBy,
        version: {
          increment: 1,
        },
      },
      include: {
        patient: true,
        consultation: true,
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Check if note is editable (within 10-minute window)
   */
  isEditable(createdAt: Date): boolean {
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    return createdAt >= tenMinutesAgo;
  }

  /**
   * Lock notes that are past the 10-minute window
   * Called periodically or on read
   */
  async lockExpiredNotes(): Promise<number> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const result = await this.prisma.eMRNote.updateMany({
      where: {
        locked: false,
        createdAt: {
          lt: tenMinutesAgo,
        },
        archived: false,
      },
      data: {
        locked: true,
      },
    });

    return result.count;
  }
}









