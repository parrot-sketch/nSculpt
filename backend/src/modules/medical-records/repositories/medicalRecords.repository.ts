import { Injectable } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { getPrismaClient } from '../../../prisma/client';
import { CreateMedicalRecordDto } from '../dto/create-medicalRecord.dto';
import { UpdateMedicalRecordDto } from '../dto/update-medicalRecord.dto';
import * as crypto from 'crypto';

@Injectable()
export class MedicalRecordsRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  async createRecord(data: CreateMedicalRecordDto) {
    return await this.prisma.medicalRecord.create({
      data: {
        recordNumber: data.recordNumber,
        patientId: data.patientId,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        gender: data.gender,
        bloodType: data.bloodType,
        status: 'ACTIVE',
      },
    });
  }

  async findRecordById(id: string) {
    return await this.prisma.medicalRecord.findUnique({
      where: { id },
      include: {
        notes: {
          orderBy: { authoredAt: 'desc' },
        },
        attachments: true,
        mergeHistory: true,
      },
    });
  }

  async updateRecord(id: string, data: UpdateMedicalRecordDto) {
    // Convert dateOfBirth string to Date if provided
    const updateData: Prisma.MedicalRecordUpdateInput = { ...data };
    if (data.dateOfBirth) {
      updateData.dateOfBirth = new Date(data.dateOfBirth);
    }
    return await this.prisma.medicalRecord.update({
      where: { id },
      data: updateData,
    });
  }

  async createNote(data: {
    recordId: string;
    noteType: string;
    category?: string;
    content: string;
    encounterDate?: Date;
    authoredBy: string;
    isAmendment?: boolean;
    amendsNoteId?: string;
    amendmentReason?: string;
  }) {
    // Compute content hash
    const contentHash = crypto.createHash('sha256').update(data.content).digest('hex');

    return await this.prisma.clinicalNote.create({
      data: {
        recordId: data.recordId,
        noteType: data.noteType,
        category: data.category,
        content: data.content,
        contentHash,
        encounterDate: data.encounterDate,
        authoredBy: data.authoredBy,
        isAmendment: data.isAmendment || false,
        amendsNoteId: data.amendsNoteId,
        amendmentReason: data.amendmentReason,
      },
    });
  }

  async createMergeHistory(data: {
    sourceRecordId: string;
    targetRecordId: string;
    triggeringEventId: string;
    reason?: string;
    mergedBy?: string;
  }) {
    return await this.prisma.recordMergeHistory.create({
      data,
    });
  }

  async findAllRecords(skip?: number, take?: number) {
    return await this.prisma.medicalRecord.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      where: { status: 'ACTIVE' },
    });
  }

  async findAllFiltered(skip?: number, take?: number, userId?: string) {
    if (!userId) {
      return [];
    }

    // Find patients user has access to via surgical cases
    const cases = await this.prisma.surgicalCase.findMany({
      where: {
        OR: [
          { primarySurgeonId: userId },
          {
            resourceAllocations: {
              some: {
                resourceType: 'STAFF',
                resourceId: userId,
                status: 'ALLOCATED',
              },
            },
          },
        ],
      },
      select: {
        patientId: true,
      },
      distinct: ['patientId'],
    });

    const patientIds = cases.map((c) => c.patientId);

    if (patientIds.length === 0) {
      return [];
    }

    return await this.prisma.medicalRecord.findMany({
      where: {
        status: 'ACTIVE',
        patientId: { in: patientIds },
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }
}

