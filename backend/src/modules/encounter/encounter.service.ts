import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Encounter, EncounterStatus, EncounterClass } from '@prisma/client';

@Injectable()
export class EncounterService {
    constructor(private prisma: PrismaService) { }

    async createEncounter(data: {
        patientId: string;
        class: EncounterClass;
        type: string;
        serviceProviderId: string;
        appointmentId?: string;
        surgicalCaseId?: string;
        locationId?: string;
        createdById: string; // Mandatory audit
    }): Promise<Encounter> {
        // Validate links - ensure appointment/surgicalCase exists if provided
        if (data.appointmentId) {
            const appointment = await this.prisma.appointment.findUnique({ where: { id: data.appointmentId } });
            if (!appointment) throw new NotFoundException('Appointment not found');
        }

        return this.prisma.encounter.create({
            data: {
                ...data,
                status: EncounterStatus.ARRIVED, // Default start status
            },
        });
    }

    async getEncounter(id: string): Promise<Encounter> {
        const encounter = await this.prisma.encounter.findUnique({
            where: { id },
            include: {
                patient: true,
                appointment: true,
                surgicalCase: true,
                diagnoses: { where: { isLatest: true } }, // Only show latest versions
                observations: { where: { isLatest: true } },
            },
        });
        if (!encounter) throw new NotFoundException('Encounter not found');
        return encounter;
    }

    async updateStatus(id: string, status: EncounterStatus, userId: string): Promise<Encounter> {
        const encounter = await this.prisma.encounter.findUniqueOrThrow({ where: { id } });

        // Safety: Cannot modify locked encounter
        if (encounter.locked) {
            throw new ForbiddenException("Cannot modify a LOCKED encounter. It must be unlocked by an Admin first.");
        }

        const data: any = {
            status,
            updatedById: userId
        };

        if (status === EncounterStatus.FINISHED) {
            data.periodEnd = new Date();
        }

        return this.prisma.encounter.update({
            where: { id },
            data,
        });
    }

    async lockEncounter(id: string, userId: string): Promise<Encounter> {
        const encounter = await this.prisma.encounter.findUniqueOrThrow({ where: { id } });

        if (encounter.status !== EncounterStatus.FINISHED) {
            throw new BadRequestException("Encounter must be FINISHED before locking");
        }

        return this.prisma.encounter.update({
            where: { id },
            data: {
                locked: true,
                lockedAt: new Date(),
                lockedById: userId
            }
        });
    }

    async findByPatient(patientId: string): Promise<Encounter[]> {
        return this.prisma.encounter.findMany({
            where: { patientId },
            orderBy: { periodStart: 'desc' },
            include: {
                diagnoses: { where: { isLatest: true } },
            },
        });
    }

    async findAll(): Promise<Encounter[]> {
        return this.prisma.encounter.findMany({
            orderBy: { periodStart: 'desc' },
            include: {
                patient: true,
                diagnoses: { where: { isLatest: true } },
            },
        });
    }
}
