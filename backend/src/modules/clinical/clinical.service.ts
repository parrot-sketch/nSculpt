import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Observation, Condition, ObservationStatus, ConditionClinicalStatus, ConditionVerificationStatus } from '@prisma/client';

@Injectable()
export class ClinicalService {
    constructor(private prisma: PrismaService) { }

    // --- Observations (Vitals, Labs) ---

    async addObservation(data: {
        patientId: string;
        encounterId?: string;
        category: string;
        code: string;
        display: string;
        valueQuantity?: number;
        valueUnit?: string;
        valueString?: string;
        performerId?: string;
        createdById: string; // Audit
    }): Promise<Observation> {
        if (data.encounterId) {
            const encounter = await this.prisma.encounter.findUnique({ where: { id: data.encounterId } });
            if (encounter?.locked) throw new ForbiddenException("Encounter locked");
        }

        return this.prisma.observation.create({
            data: {
                ...data,
                status: ObservationStatus.FINAL, // Default
                isLatest: true,
                version: 1
            },
        });
    }

    async amendObservation(
        userId: string,
        originalId: string,
        newData: Partial<Observation>
    ): Promise<Observation> {
        return this.prisma.$transaction(async (tx) => {
            // 1. Fetch & Lock Original
            const original = await tx.observation.findUniqueOrThrow({ where: { id: originalId } });

            if (original.encounterId) {
                const encounter = await tx.encounter.findUnique({ where: { id: original.encounterId } });
                if (encounter?.locked) throw new ForbiddenException("Encounter locked");
            }

            if (!original.isLatest) throw new BadRequestException("Can only amend the latest version");

            // 2. Mark Original as Not Latest
            await tx.observation.update({
                where: { id: originalId },
                data: { isLatest: false }
            });

            // 3. Create New Version
            return tx.observation.create({
                data: {
                    patientId: original.patientId,
                    encounterId: original.encounterId,
                    category: original.category,
                    code: original.code,
                    display: original.display,
                    valueQuantity: newData.valueQuantity ?? original.valueQuantity,
                    valueUnit: newData.valueUnit ?? original.valueUnit,
                    valueString: newData.valueString ?? original.valueString,
                    performerId: original.performerId,

                    status: ObservationStatus.AMENDED,
                    isLatest: true,
                    version: original.version + 1,
                    previousVersionId: original.id,
                    rootVersionId: original.rootVersionId || original.id, // Grouping

                    createdById: userId,
                }
            });
        });
    }

    async getObservations(patientId: string, category?: string): Promise<Observation[]> {
        return this.prisma.observation.findMany({
            where: {
                patientId,
                isLatest: true, // Only current
                ...(category ? { category } : {}),
            },
            orderBy: { effectiveDateTime: 'desc' },
        });
    }

    // --- Conditions (Diagnoses, Problems) ---

    async addCondition(data: {
        patientId: string;
        encounterId?: string;
        code: string;
        display: string;
        category: string;
        clinicalStatus: ConditionClinicalStatus;
        verificationStatus: ConditionVerificationStatus;
        severity?: string;
        note?: string;
        createdById: string; // Audit
    }): Promise<Condition> {
        if (data.encounterId) {
            const encounter = await this.prisma.encounter.findUnique({ where: { id: data.encounterId } });
            if (encounter?.locked) throw new ForbiddenException("Encounter locked");
        }

        return this.prisma.condition.create({
            data: {
                ...data,
                isLatest: true,
                version: 1
            },
        });
    }

    async getActiveProblems(patientId: string): Promise<Condition[]> {
        return this.prisma.condition.findMany({
            where: {
                patientId,
                clinicalStatus: ConditionClinicalStatus.ACTIVE,
                isLatest: true,
            },
        });
    }
}
